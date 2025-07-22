import { randomUUID } from 'crypto';
import { generateStructured, ChatMessage } from './ai.js';
import {
  PLAYER_QA_WITH_CLASSIFICATION_PROMPT,
  AI_GUESS_INITIAL_PROMPT,
  AI_GUESS_NEXT_PROMPT,
} from './prompts.js';
import {
  PlayerQAResponse,
  PlayerQAResponseSchema,
  AIJsonResponse,
  AIJsonResponseSchema,
  AnswerToGuess,
} from './types.js';
import { getDailyGame } from './dailyGameStore.js';
import { fetchGameMetadata } from './rawgDetails.js';
import type { GameMetadata } from './rawgDetails.js';

// In-memory store for game sessions – keyed by UUID
export interface PlayerGuessSession {
  secretGame: string;
  chatHistory: ChatMessage[];
  questionCount: number;
  /**
   * Indicates whether the player has requested at least one hint in this
   * session. Once true it stays true for the remainder of the session so that
   * we can propagate it to every subsequent `guessResult`.
   */
  usedHint: boolean;
}

interface AIGuessSession {
  chatHistory: ChatMessage[];
  questionCount: number;
  maxQuestions: number;
}

/** The types of hints that a client can request. */
export type HintType = 'developer'|'publisher'|'releaseYear';

interface HintResponse {
  hintText: string;
  hintType: HintType
}

const gameSessions = new Map<string, PlayerGuessSession | AIGuessSession>();

// Maximum number of questions for the AI guessing mode.
const MAX_QUESTIONS = 20;

// --------------------------- Scoring helpers ---------------------------

/**
* Calculates the [Levenshtein distance](https://en.wikipedia.org/wiki/Levenshtein_distance)
* between two strings using a simple dynamic-programming algorithm.
* This implementation is intentionally lightweight to avoid an additional
* dependency for such a small computation.
*/
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const v0: number[] = new Array(b.length + 1).fill(0);
  const v1: number[] = new Array(b.length + 1).fill(0);

  for (let i = 0; i < v0.length; i++) v0[i] = i;

  for (let i = 0; i < a.length; i++) {
    v1[0] = i + 1;
    for (let j = 0; j < b.length; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      v1[j + 1] = Math.min(
        v1[j] + 1,      // Deletion
        v0[j + 1] + 1,  // Insertion
        v0[j] + cost,   // Substitution
      );
    }
    for (let j = 0; j < v0.length; j++) v0[j] = v1[j];
  }

  return v1[b.length];
}

/**
* Computes the fractional score for a player's guess.
*
* - 1.0 when the guess matches the secret game exactly (case-insensitive).
* - 0.5 when the normalized Levenshtein distance is small enough (≤ 2 edits
*   OR ≤ 10% of the average length).
* - 0   otherwise.
*/
function computeGuessScore(guess: string, secret: string): number {
  const clean = (s: string) => s.trim().toLowerCase();
  const g = clean(guess);
  const s = clean(secret);

  if (g === s) return 1;

  const distance = levenshtein(g, s);
  const avgLen = (g.length + s.length) / 2 || 1;

  const CLOSE_THRESHOLD_ABS = 2; // absolute edit distance
  const CLOSE_THRESHOLD_REL = 0.1; // 10% of average length

  const isClose = distance <= CLOSE_THRESHOLD_ABS || distance / avgLen <= CLOSE_THRESHOLD_REL;
  return isClose ? 0.5 : 0;
}

/**
* Starts a new *Player-Guesses* game session.
*
* @returns Promise resolving to an object containing the `sessionId` that the
*          client must supply on subsequent turns.
*/
async function startPlayerGuessesGame() {
  // Fetch (or lazily create) the secret game for *today* (UTC).
  const secretGame = await getDailyGame();

  const sessionId = randomUUID();
  gameSessions.set(sessionId, {
    secretGame,
    chatHistory: [
      {
        role: 'user',
        content: `The secret game is ${secretGame}. The user will now ask questions.`,
      },
    ],
    questionCount: 0,
    usedHint: false,
  });

  return { sessionId };
}

/** Handles a player's question in a game of 20 Questions. */
async function handlePlayerQuestion(sessionId: string, userInput: string): Promise<PlayerQAResponse> {
  if (!sessionId || !userInput) {
    throw new Error('Session ID and user input are required.');
  }

  const session = gameSessions.get(sessionId);
  if (!session) {
    throw new Error('Session not found.');
  }

  session.questionCount++;

  if (!('secretGame' in session)) {
    throw new Error('Invalid session type for player question handler.');
  }

  if (session.questionCount > 20) {
    return {
      type:  'guessResult',
      questionCount: session.questionCount,
      content: {
        correct: false,
        response: `You are out of tries. The game was ${session.secretGame}`,
      }
    } as AnswerToGuess;
  }

  const prompt = PLAYER_QA_WITH_CLASSIFICATION_PROMPT(
    userInput,
    session.secretGame,
  );

  const jsonResponse = await generateStructured<PlayerQAResponse>(
    PlayerQAResponseSchema,
    prompt,
    session.chatHistory,
  );

  // Just in case the model misses the question count, we provide it.
  jsonResponse.questionCount = jsonResponse.questionCount || session.questionCount;

  // ---------------------------------------------------------------
  // Compute fractional score and embed hint metadata *before* we push the
  // response into the chat history so that persisted messages already carry
  // the enriched fields.
  // ---------------------------------------------------------------

  if (jsonResponse.type === 'guessResult') {
    const score = computeGuessScore(userInput, session.secretGame);
    (jsonResponse.content as any).score = score;
    (jsonResponse.content as any).usedHint = session.usedHint || false;
    (jsonResponse.content as any).correct = score === 1;
  }

  session.chatHistory.push({
    role: 'model',
    content: jsonResponse,
  });

  return jsonResponse;
}

/**
 * Starts a new game of 20 Questions where the player thinks of an object and
 * the AI tries to guess what it is.
 * @return {Promise<{sessionId: string, aiResponse: string, questionCount: number}>} - A promise
 *   resolving to an object containing the session ID and the AI's first
 *   question.
 */
async function startAIGuessesGame() {
  const maxQuestions = MAX_QUESTIONS;
  const initialPrompt = AI_GUESS_INITIAL_PROMPT(maxQuestions);

  const chatHistory: ChatMessage[] = [];
  const jsonResponse = await generateStructured<AIJsonResponse>(
    AIJsonResponseSchema,
    initialPrompt,
    chatHistory,
  );
  chatHistory.push({
    role: 'user',
    content: 'Start the game.',
  }, {
    role: 'model',
    content: jsonResponse,
  });

  const sessionId = randomUUID();
  gameSessions.set(sessionId, {
    chatHistory,
    questionCount: 1,
    maxQuestions,
  });

  return { sessionId, aiResponse: jsonResponse, questionCount: 1 };
}

/**
 * Handles a player's answer in a game of 20 Questions.
 * 
 * This method also pushed the conversation update to chat history.
 * @param {string} sessionId - The ID of the game session.
 * @param {string} userAnswer - The user's answer.
 * @return {Promise<{questionCount: number, aiResponse: string}>} - A promise
 *   resolving to an object containing the updated question count, the AI's
 *   response.
 */
async function handleAIAnswer(sessionId: string, userAnswer: string) {
  if (!sessionId || !userAnswer) {
    throw new Error('Session ID and user answer are required.');
  }

  const session = gameSessions.get(sessionId);
  if (!session) {
    throw new Error('Session not found.');
  }

  if (!('maxQuestions' in session)) {
    throw new Error('Invalid session type for AI answer handler.');
  }

  const questionsLeft = session.maxQuestions - session.questionCount;
  const nextTurnPrompt = AI_GUESS_NEXT_PROMPT(userAnswer, questionsLeft);

  const jsonResponse = await generateStructured<AIJsonResponse>(
    AIJsonResponseSchema,
    nextTurnPrompt,
    session.chatHistory,
  );
  session.chatHistory.push({
    role: 'user',
    content: `User answered "${userAnswer}".`,
  }, {
    role: 'model',
    content: jsonResponse,
  });

  if (jsonResponse.type === 'question') {
    session.questionCount++;
  }

  return { aiResponse: jsonResponse, questionCount: session.questionCount };
}

function getSession(sessionId: string) {
  return gameSessions.get(sessionId);
}

function clearSessions() {
  gameSessions.clear();
}

const metadataCache = new Map<string, GameMetadata>();

/**
* Returns a single hint for the secret game belonging to the provided session.
*
* The hint is randomly selected from the available metadata fields (developer,
* publisher, release year). If no metadata is available, the function throws –
* callers should translate this into a 404/500 as appropriate.
*/
async function getPlayerGuessHint(sessionId: string, hintType?: HintType): Promise<HintResponse> {
  const session = gameSessions.get(sessionId);
  if (!session || !('secretGame' in session)) {
    throw new Error('Session not found.');
  }

  let metadata = metadataCache.get(session.secretGame);
  if (!metadata) {
    metadata = await fetchGameMetadata(session.secretGame);
    metadataCache.set(session.secretGame, metadata);
  }

  // Mark that the player has used at least one hint in this session. This will
  // be baked into the next `guessResult` object so that the UI can reflect
  // hint usage.
  (session as PlayerGuessSession).usedHint = true;

  let candidates: Array<HintResponse> = [];
  if (metadata.developer) candidates.push({hintType: 'developer', hintText: `The developer is ${metadata.developer}.`});
  if (metadata.publisher) candidates.push({hintType: 'publisher', hintText: `The publisher is ${metadata.publisher}.`});
  if (metadata.releaseYear) candidates.push({hintType: 'releaseYear', hintText: `It was released in ${metadata.releaseYear}.`});

  if (!!hintType) {
    candidates = candidates.filter(candidate => candidate.hintType === hintType);
  }

  if (!candidates.length) {
    throw new Error('No hint data available');
  }

  // Pick a random hint
  const hint = candidates[Math.floor(Math.random() * candidates.length)];
  return hint;
}

export {
  startPlayerGuessesGame,
  handlePlayerQuestion,
  startAIGuessesGame,
  handleAIAnswer,
  getSession,
  clearSessions,
  getPlayerGuessHint,
};
