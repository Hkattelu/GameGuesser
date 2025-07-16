import { randomUUID } from 'crypto';
import { generateStructured, ChatMessage } from './ai.js';
import {
  PLAYER_QA_CLASSIFICATION_PROMPT,
  AI_GUESS_INITIAL_PROMPT,
  AI_GUESS_NEXT_PROMPT,
} from './prompts.js';
import { z } from 'zod';
import { getDailyGame } from './dailyGameStore.js';
import { fetchGameMetadata, GameMetadata } from './rawgDetails.js';

// In-memory store for game sessions – keyed by UUID
export interface PlayerGuessSession {
  secretGame: string;
  chatHistory: ChatMessage[];
  questionCount: number;
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

interface AnswerToQuestion {
  type: 'answer';
  questionCount: number;
  content: string;
}

interface AnswerToGuess {
  type: 'guessResult';
  questionCount: number;
  content: { correct: boolean, response: string }
}

type PlayerQAResponse = AnswerToQuestion|AnswerToGuess;

type AIJsonResponse = { type: 'question' | 'guess'; content: string };

// -------------------------- Zod Schemas --------------------------

const AnswerToQuestionSchema = z.object({
  type: z.literal('answer'),
  questionCount: z.number(),
  content: z.string(),
});

const AnswerToGuessSchema = z.object({
  type: z.literal('guessResult'),
  questionCount: z.number(),
  content: z.object({
    correct: z.boolean(),
    response: z.string(),
  }),
});

const PlayerQAResponseSchema = z.union([AnswerToQuestionSchema, AnswerToGuessSchema]);

const AIJsonResponseSchema = z.object({
  type: z.union([z.literal('question'), z.literal('guess')]),
  content: z.string(),
});

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
        content: [{ text: `The secret game is ${secretGame}. The user will now ask questions.` }],
      },
    ],
    questionCount: 0,
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

  // ---------------------------------------------------------------
  // Nuanced clarification for yes/no questions about series/franchise.
  // ---------------------------------------------------------------
  const seriesRegex = /\b(series|franchise|sequel|prequel)\b/i;
  if (seriesRegex.test(userInput)) {
    let metadata = metadataCache.get(session.secretGame);
    if (!metadata) {
      metadata = await fetchGameMetadata(session.secretGame);
      metadataCache.set(session.secretGame, metadata);
    }

    const hasSeq = Boolean(metadata.hasDirectSequel);
    const hasPre = Boolean(metadata.hasDirectPrequel);
    const branded = Boolean(metadata.isBrandedInSeries);

    let yesNo: 'Yes' | 'No' = 'No';
    let clarification: string;

    if (hasSeq || hasPre) {
      yesNo = 'Yes';
      const parts: string[] = [];
      if (hasPre) parts.push('a direct prequel');
      if (hasSeq) parts.push('a direct sequel');
      clarification = `It has ${parts.join(' and ')}.`;
    } else if (branded) {
      clarification = "It doesn't have a direct sequel or prequel, but it is branded as part of a series.";
    } else {
      clarification = 'It is a standalone game.';
    }

    // Persist answer to chat history for continuity.
    session.chatHistory.push({
      role: 'model',
      content: JSON.stringify({ type: 'answer', content: `${yesNo} - ${clarification}` }),
    });

    return {
      type: 'answer',
      questionCount: session.questionCount,
      content: `${yesNo} - ${clarification}`,
    } satisfies AnswerToQuestion;
  }

  const prompt = PLAYER_QA_CLASSIFICATION_PROMPT(userInput, session.secretGame);

  const jsonResponse = await generateStructured<PlayerQAResponse>(
    PlayerQAResponseSchema,
    prompt,
    session.chatHistory,
  );
  session.chatHistory.push({
    role: 'model',
    content: JSON.stringify(jsonResponse),
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
    role: 'model',
    content: JSON.stringify(jsonResponse),
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

  session.chatHistory.push({
    role: 'user',
    content: [{ text: `User answered "${userAnswer}".` }],
  });

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
    role: 'model',
    content: JSON.stringify(jsonResponse),
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
