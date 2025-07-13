import { randomUUID } from 'crypto';
import { callGeminiAPI } from './gemini.js';
import type { ChatMessage } from './gemini.js';
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
        parts: [
          {
            text: `The secret game is ${secretGame}. The user will now ask questions.`,
          },
        ],
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

  const prompt = `The user asked: "${userInput}". The secret game is "${session.secretGame}".
        Is it a guess or a question? If it's a guess, is it correct?
        Your response MUST be a JSON object with a 'type' field ('answer' or 'guessResult') and a 'content' field.
        If it's a question, content should be "Yes", "No", or "I don't know".
        If it's a guess, content should be an object with 'correct' (true/false) and a 'response' string.
        If the user guessed correctly, response string should contain only the name of the secret game.
        If the user guessed incorrectly, response string should contain contain a message telling them they are incorrect. `;

  const jsonResponse = await callGeminiAPI<PlayerQAResponse>(
    prompt,
    session.chatHistory,
  );
  session.chatHistory.push({
    role: 'model',
    parts: [{ text: JSON.stringify(jsonResponse) }],
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
  const initialPrompt = `You are Bot Boy, a friendly robot playing a "20 Questions" game to guess a video game the user is thinking of.
        You will ask yes/no questions. If you are very confident, you can make a guess.
        You have ${maxQuestions} questions in total. This is question 1.
        Your response MUST be a JSON object with a 'type' field ("question" or "guess") and a 'content' field (the question text or the game guess).
        Example: {"type": "question", "content": "Is your game an RPG?"}
        Example: {"type": "guess", "content": "Is your game The Legend of Zelda: Breath of the Wild?"}
        Start by asking your first question.`;

  const chatHistory: ChatMessage[] = [];
  const jsonResponse = await callGeminiAPI<AIJsonResponse>(
    initialPrompt,
    chatHistory,
  );
  chatHistory.push({
    role: 'model',
    parts: [{ text: JSON.stringify(jsonResponse) }],
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
    parts: [{ text: `User answered "${userAnswer}".` }],
  });

  if (!('maxQuestions' in session)) {
    throw new Error('Invalid session type for AI answer handler.');
  }

  const nextTurnPrompt = `The user just answered "${userAnswer}". You have ${
    session.maxQuestions - session.questionCount
  } questions left.
        Based on this, ask your next yes/no question or make a guess if you are confident.
        Remember, your response MUST be a JSON object with 'type' and 'content'.`;

  const jsonResponse = await callGeminiAPI<AIJsonResponse>(
    nextTurnPrompt,
    session.chatHistory,
  );
  session.chatHistory.push({
    role: 'model',
    parts: [{ text: JSON.stringify(jsonResponse) }],
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
