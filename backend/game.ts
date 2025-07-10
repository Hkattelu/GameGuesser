import { randomUUID } from 'crypto';
import { callGeminiAPI, ChatMessage } from './gemini.js';
import { getDailyGame } from './dailyGameStore.ts';

// In-memory store for game sessions – keyed by UUID
interface PlayerGuessSession {
  secretGame: string;
  chatHistory: ChatMessage[];
  questionCount: number;
}

interface AIGuessSession {
  chatHistory: ChatMessage[];
  questionCount: number;
  maxQuestions: number;
}

type PlayerQAResponse =
  | { type: 'answer'; content: string }
  | { type: 'guessResult'; content: { correct: boolean; response: string } };

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

/**
 * Handles a player's question in a game of 20 Questions.
 * @param {string} sessionId - The ID of the game session.
 * @param {string} userInput - The user's question.
 * @return {Promise<{questionCount: number, aiResponse: string, questionCount: number}>} - A promise
 *   resolving to an object containing the updated question count, the AI's
 *   response, and a boolean indicating whether the AI won.
 */
async function handlePlayerQuestion(sessionId: string, userInput: string) {
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

  const prompt = `The user asked: "${userInput}". The secret game is "${session.secretGame}".
        Is it a guess or a question? If it's a guess, is it correct?
        Your response MUST be a JSON object with a 'type' field ('answer' or 'guessResult') and a 'content' field.
        If it's a question, content should be "Yes", "No", or "I don't know".
        If it's a guess, content should be an object with 'correct' (true/false) and a 'response' string.`;

  const jsonResponse = await callGeminiAPI<PlayerQAResponse>(
    prompt,
    session.chatHistory,
  );
  session.chatHistory.push({
    role: 'model',
    parts: [{ text: JSON.stringify(jsonResponse) }],
  });

  return {
    type: jsonResponse.type,
    content: jsonResponse.content,
    questionCount: session.questionCount,
  };
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

export {
  startPlayerGuessesGame,
  handlePlayerQuestion,
  startAIGuessesGame,
  handleAIAnswer,
  getSession,
  clearSessions,
};
