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
} from './types.js';
import { getDailyGame } from './dailyGameStore.js';
import { fetchGameMetadata } from './rawgDetails.js';
import type { GameMetadata } from './rawgDetails.js';
import { SPECIAL_HINT_PROMPT } from './prompts.js';
import { specialHintSchema } from './types.js';

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
export type HintType = 'developer'|'publisher'|'releaseYear'|'special';

interface HintResponse {
  hintText: string;
  hintType: HintType
}

interface SpecialHint {
  special?: string;
}

type PlayerGuessHint = GameMetadata&SpecialHint;

const gameSessions = new Map<string, PlayerGuessSession | AIGuessSession>();

// Maximum number of questions for the AI guessing mode.
const MAX_QUESTIONS = 20;

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
    } as PlayerQAResponse;
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

  jsonResponse.questionCount = session.questionCount;
  if (jsonResponse.type === 'guessResult') {
    const isCorrect = jsonResponse.content.correct;
    jsonResponse.content.usedHint = session.usedHint || false;
    jsonResponse.content.score = isCorrect ? (session.usedHint ? .5 : 1) : 0;
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

const metadataCache = new Map<string, PlayerGuessHint>();

/**
* Returns a single hint for the secret game belonging to the provided session.
*
* Developer, publisher, and release year are fetched from the RAWG API.
* For the special hint, the AI model will generate a short string.
*/
async function getPlayerGuessHint(sessionId: string, hintType: HintType): Promise<HintResponse> {
  const session = gameSessions.get(sessionId);
  if (!session || !('secretGame' in session)) {
    throw new Error('Session not found.');
  }

  let metadata = metadataCache.get(session.secretGame);
  if (!metadata) {
    metadata = await fetchGameMetadata(session.secretGame);

    // Fetch a hint from the model
    if (hintType === 'special' && !metadata.special) {
      try {
        const response: { special: string } = await generateStructured(
          specialHintSchema,
          SPECIAL_HINT_PROMPT(session.secretGame)
        );
        metadata.special = response.special;
      } catch (e) {
        // If the model call fails, fallback to no special hint
        metadata.special = undefined;
      }
    }
    metadataCache.set(session.secretGame, metadata);
  }

  // Mark that the player has used at least one hint in this session. This will
  // be baked into the next `guessResult` object so that the UI can reflect
  // hint usage.
  (session as PlayerGuessSession).usedHint = true;

  let candidates: Array<HintResponse> = [];
  if (metadata.developer) candidates.push({hintType: 'developer', hintText: metadata.developer});
  if (metadata.publisher) candidates.push({hintType: 'publisher', hintText: metadata.publisher});
  if (metadata.releaseYear) candidates.push({hintType: 'releaseYear', hintText: String(metadata.releaseYear)});
  if (metadata.special) candidates.push({hintType: 'special', hintText: metadata.special});

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
