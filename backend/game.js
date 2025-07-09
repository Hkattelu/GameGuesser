// backend/game.js
// Game logic for both game modes. Now supports per-user sessions and persistent
// storage via the store module.

import { v4 as uuidv4 } from 'uuid';
import { callGeminiAPI } from './gemini.js';
import {
  getConversations,
  saveConversation,
  deleteConversationsForUser,
} from './store.js';

// In-memory cache of active sessions for quick lookup.
// Map<userId, Map<sessionId, Session>>
const userGameSessions = new Map();

function getSessionMap(userId = 'anonymous') {
  let map = userGameSessions.get(userId);
  if (!map) {
    // Lazy-load any persisted sessions for the user from disk.
    const persisted = getConversations(userId); // returns POJO
    map = new Map(Object.entries(persisted));
    userGameSessions.set(userId, map);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Player Guesses Game (user asks yes/no questions)
// ---------------------------------------------------------------------------

export async function startPlayerGuessesGame(userId = 'anonymous') {
  const initialPrompt = `You are Game Boy, a friendly robot thinking of a secret video game. The user will ask yes/no questions to guess it.
        Your response MUST be a JSON object with a 'secretGame' field.
        Example: {"secretGame": "The Witcher 3: Wild Hunt"}`;

  const jsonResponse = await callGeminiAPI(initialPrompt);
  const secretGame = jsonResponse.secretGame;

  if (!secretGame) {
    throw new Error('Gemini did not return a secret game.');
  }

  const sessionId = uuidv4();
  const session = {
    mode: 'player-guesses',
    secretGame,
    chatHistory: [
      {
        role: 'user',
        parts: [{ text: `The secret game is ${secretGame}. The user will now ask questions.` }],
      },
    ],
    questionCount: 0,
    createdAt: Date.now(),
  };

  const map = getSessionMap(userId);
  map.set(sessionId, session);
  saveConversation(userId, sessionId, session);

  return { sessionId };
}

export async function handlePlayerQuestion(
  sessionId,
  userInput,
  userId = 'anonymous',
) {
  if (!sessionId || !userInput) {
    throw new Error('Session ID and user input are required.');
  }

  const map = getSessionMap(userId);
  const session = map.get(sessionId);
  if (!session) {
    throw new Error('Session not found.');
  }

  session.questionCount += 1;

  const prompt = `The user asked: "${userInput}". The secret game is "${session.secretGame}".
        Is it a guess or a question? If it's a guess, is it correct?
        Your response MUST be a JSON object with a 'type' field ('answer' or 'guessResult') and a 'content' field.
        If it's a question, content should be "Yes", "No", or "I don't know".
        If it's a guess, content should be an object with 'correct' (true/false) and a 'response' string.
        Example (question): {"type": "answer", "content": "Yes"}
        Example (guess): {"type": "guessResult", "content": {"correct": false, "response": "That's not it. Keep trying!"}}`;

  const jsonResponse = await callGeminiAPI(prompt, session.chatHistory);
  session.chatHistory.push({ role: 'model', parts: [{ text: JSON.stringify(jsonResponse) }] });

  // Persist update
  map.set(sessionId, session);
  saveConversation(userId, sessionId, session);

  return {
    type: jsonResponse.type,
    content: jsonResponse.content,
    questionCount: session.questionCount,
  };
}

// ---------------------------------------------------------------------------
// AI Guesses Game (bot asks questions)
// ---------------------------------------------------------------------------

export async function startAIGuessesGame(userId = 'anonymous') {
  const maxQuestions = 20;
  const initialPrompt = `You are Bot Boy, a friendly robot playing a \"20 Questions\" game to guess a video game the user is thinking of.
        You will ask yes/no questions. If you are very confident, you can make a guess.
        You have ${maxQuestions} questions in total. This is question 1.
        Your response MUST be a JSON object with a 'type' field (\"question\" or \"guess\") and a 'content' field (the question text or the game guess).
        Example: {\"type\": \"question\", \"content\": \"Is your game an RPG?\"}
        Example: {\"type\": \"guess\", \"content\": \"Is your game The Legend of Zelda: Breath of the Wild?\"}
        Start by asking your first question.`;

  const chatHistory = [];
  const jsonResponse = await callGeminiAPI(initialPrompt, chatHistory);
  chatHistory.push({ role: 'model', parts: [{ text: JSON.stringify(jsonResponse) }] });

  const sessionId = uuidv4();
  const session = {
    mode: 'ai-guesses',
    chatHistory,
    questionCount: 1,
    maxQuestions,
    createdAt: Date.now(),
  };

  const map = getSessionMap(userId);
  map.set(sessionId, session);
  saveConversation(userId, sessionId, session);

  return { sessionId, aiResponse: jsonResponse, questionCount: 1 };
}

export async function handleAIAnswer(
  sessionId,
  userAnswer,
  userId = 'anonymous',
) {
  if (!sessionId || !userAnswer) {
    throw new Error('Session ID and user answer are required.');
  }

  const map = getSessionMap(userId);
  const session = map.get(sessionId);
  if (!session) {
    throw new Error('Session not found.');
  }

  session.chatHistory.push({ role: 'user', parts: [{ text: `User answered \"${userAnswer}\".` }] });

  const nextTurnPrompt = `The user just answered \"${userAnswer}\". You have ${
    session.maxQuestions - session.questionCount
  } questions left.
        Based on this, ask your next yes/no question or make a guess if you are confident.
        Remember, your response MUST be a JSON object with 'type' and 'content'.`;

  const jsonResponse = await callGeminiAPI(nextTurnPrompt, session.chatHistory);
  session.chatHistory.push({ role: 'model', parts: [{ text: JSON.stringify(jsonResponse) }] });

  if (jsonResponse.type === 'question') {
    session.questionCount += 1;
  }

  // Persist update
  map.set(sessionId, session);
  saveConversation(userId, sessionId, session);

  return { aiResponse: jsonResponse, questionCount: session.questionCount };
}

// ---------------------------------------------------------------------------
// Utilities used by tests or other modules
// ---------------------------------------------------------------------------

export function getSession(sessionId, userId = 'anonymous') {
  const map = getSessionMap(userId);
  return map.get(sessionId);
}

export function clearSessions(userId = 'anonymous') {
  const map = getSessionMap(userId);
  map.clear();
  deleteConversationsForUser(userId);
}
