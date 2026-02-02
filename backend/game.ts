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
import { fetchGameMetadata, saveMetadata } from './rawgDetails.js';
import type { GameMetadata } from './rawgDetails.js';
import { SPECIAL_HINT_PROMPT } from './prompts.js';
import { specialHintSchema } from './types.js';

// ---------------------------------------------------------------------------
// Persistent session storage helpers
// ---------------------------------------------------------------------------

import * as dbModule from './db.js';
import { Firestore, Timestamp } from '@google-cloud/firestore';

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


type PlayerGuessHint = GameMetadata & SpecialHint;

// ---------------------------------------------------------------------------
// In-memory cache + eviction policy
// ---------------------------------------------------------------------------

/** In-memory cache of active sessions keyed by `sessionId`. */
const gameSessions = new Map<string, PlayerGuessSession | AIGuessSession>();

/** Maximum number of sessions to keep in memory. */
const MAX_SESSION_CACHE_SIZE = 1000;

/**
* Ensures the `gameSessions` map does not exceed the configured maximum.
*
* Eviction strategy: remove the *oldest* entry (Map preserves insertion
* order) until the size constraint is satisfied. This is a simple FIFO
* policy that keeps implementation complexity low while providing adequate
* control over memory usage for the current scale of the application.
*/
function enforceCacheSizeLimit(): void {
  while (gameSessions.size > MAX_SESSION_CACHE_SIZE) {
    const oldestKey = gameSessions.keys().next().value as string | undefined;
    if (!oldestKey) break; // Shouldn't happen, but guards against edge-cases.
    gameSessions.delete(oldestKey);
  }
}

// ---------------------------------------------------------------------------
// Firestore-backed persistent store
// ---------------------------------------------------------------------------

const IS_TEST = process.env.NODE_ENV === 'test';

// Lazily resolved Firestore instance – initialized only when needed so that
// unit tests can register mocks *before* the driver boots up.
let _firestore: Firestore | null = null;

function getFirestore(): Firestore {
  if (!_firestore) {
    _firestore =
      // Prefer the singleton helper when available (production code path).
      'getFirestoreInstance' in dbModule && typeof (dbModule as any).getFirestoreInstance === 'function'
        ? (dbModule as any).getFirestoreInstance()
        // Fallback: create a brand-new Firestore instance (test mocks typically
        // stub the Firestore class itself, so this is safe and keeps unit tests
        // isolated without requiring every test to export the helper).
        : new Firestore();
  }
  return _firestore!;
}

type SessionKind = 'player' | 'ai';

/**
* Compacts a session object for Firestore storage to reduce costs.
* - Shortens keys
* - Omits the redundant initial system message in PlayerGuessSessions
*/
function toDbFormat(session: PlayerGuessSession | AIGuessSession): any {
  if ('secretGame' in session) {
    const [first, ...rest] = session.chatHistory;
    const expectedPrefix = `The secret game is ${session.secretGame}.`;
    const shouldOmitFirst =
      first?.role === 'user' &&
      typeof first.content === 'string' &&
      first.content.startsWith(expectedPrefix);

    // PlayerGuessSession
    return {
      s: session.secretGame,
      // Omit the first message which is the "The secret game is..." prompt
      h: shouldOmitFirst ? rest : session.chatHistory,
      q: session.questionCount,
      uh: session.usedHint,
    };
  } else {
    // AIGuessSession
    return {
      h: session.chatHistory,
      q: session.questionCount,
      mq: session.maxQuestions,
    };
  }
}

/**
* Rehydrates a session object from its compacted Firestore format.
*/
function fromDbFormat(docData: any, kind: SessionKind): PlayerGuessSession | AIGuessSession {
  if (kind === 'player') {
    const secretGame = docData.s;
    const expectedPrefix = `The secret game is ${secretGame}.`;
    const storedHistory: ChatMessage[] = Array.isArray(docData.h) ? docData.h : [];
    const first = storedHistory[0];
    const hasInitialMessage =
      first?.role === 'user' &&
      typeof first.content === 'string' &&
      first.content.startsWith(expectedPrefix);

    return {
      secretGame,
      chatHistory: hasInitialMessage
        ? storedHistory
        : [
            {
              role: 'user',
              content: `The secret game is ${secretGame}. The user will now ask questions.`,
            },
            ...storedHistory,
          ],
      questionCount: docData.q || 0,
      usedHint: !!docData.uh,
    } as PlayerGuessSession;
  } else {
    return {
      chatHistory: docData.h || [],
      questionCount: docData.q || 0,
      maxQuestions: docData.mq || 20,
    } as AIGuessSession;
  }
}

interface SessionDocument {
  /** Narrow string literal for easier filtering/debugging. */
  kind: SessionKind;
  /** The actual session payload used by the runtime. */
  data: any; // Compacted data
  /** Timestamp for housekeeping/debugging. */
  updated_at: Timestamp;
  /** TTL field for Firestore to automatically delete old sessions. */
  expiresAt: Timestamp;
}

/**
* Convenience accessor for the `gameSessions` collection. We resolve the
* Firestore instance lazily to guarantee that unit-test mocks for
* `@google-cloud/firestore` are in place *before* we touch the driver.
*/
function getSessionsCollection() {
  return getFirestore().collection('gameSessions');
}

/**
* Persists the given session object to Firestore. `merge: true` semantics are
* achieved by overwriting the full document because the payload is already a
* complete snapshot of the session state – partial updates would add undue
* complexity for negligible benefit.
*/
async function persistSession(
  sessionId: string,
  session: PlayerGuessSession | AIGuessSession,
): Promise<void> {
  const kind: SessionKind = 'secretGame' in session ? 'player' : 'ai';
  
  // Set TTL to 24 hours from now
  const now = Date.now();
  const expiresAtMs = now + (24 * 60 * 60 * 1000);
  const expiresAt = Timestamp.fromMillis(expiresAtMs);

  const doc: SessionDocument = {
    kind,
    data: toDbFormat(session),
    updated_at: Timestamp.now(),
    expiresAt,
  };
  await getSessionsCollection().doc(sessionId).set(doc);
}

/**
* Attempts to load a session from Firestore when the in-memory cache misses.
* If found, the session is rehydrated into the local cache (subject to the
* cache size limit) and returned.
*/
async function loadSessionFromDB(
  sessionId: string,
): Promise<PlayerGuessSession | AIGuessSession | undefined> {
  const snap = await getSessionsCollection().doc(sessionId).get();
  if (!snap.exists) return undefined;
  const doc = snap.data() as SessionDocument;
  const session = fromDbFormat(doc?.data, doc?.kind);
  if (session) {
    gameSessions.set(sessionId, session);
    enforceCacheSizeLimit();
  }
  return session;
}

/**
* Unified accessor that first checks the in-memory cache and then falls back
* to the persistent store when necessary.
*/
async function getOrLoadSession(
  sessionId: string,
): Promise<PlayerGuessSession | AIGuessSession | undefined> {
  const cached = gameSessions.get(sessionId);
  if (cached) return cached;
  return loadSessionFromDB(sessionId);
}

// Maximum number of questions for the AI guessing mode.
const MAX_QUESTIONS = 20;

/**
* Starts a new *Player-Guesses* game session.
*
* @returns Promise resolving to an object containing the `sessionId` that the
*          client must supply on subsequent turns.
*/
async function startPlayerGuessesGame() {
  // Fetch (or lazily create) the secret game for *today* (UTC). In the test
  // environment we bypass the DB + external APIs entirely to keep unit tests
  // hermetic.
  const secretGame = IS_TEST ? `Test Game ${Math.random()}` : await getDailyGame();

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

  enforceCacheSizeLimit();

  // Persist the freshly created session so that it survives cold starts.
  await persistSession(sessionId, gameSessions.get(sessionId)!);

  return { sessionId };
}

/** Handles a player's question in a game of 20 Questions. */
async function handlePlayerQuestion(sessionId: string, userInput: string): Promise<PlayerQAResponse> {
  if (!sessionId || !userInput) {
    throw new Error('Session ID and user input are required.');
  }

  const session = await getOrLoadSession(sessionId);
  if (!session) {
    throw new Error('Session not found.');
  }

  // Ensure we're working with the correct session variant first.
  if (!('secretGame' in session)) {
    throw new Error('Invalid session type for player question handler.');
  }

  // If the player has already reached the question limit, short-circuit before
  // attempting any further work. Importantly, we do **not** increment the
  // stored `questionCount` here so that the counter remains accurate when an
  // error occurs during answer generation.
  if (session.questionCount >= 20) {
    return {
      type: 'guessResult',
      questionCount: session.questionCount,
      content: {
        correct: false,
        response: `You are out of tries. The game was ${session.secretGame}`,
      },
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

  // Now that the model has successfully produced a response we can safely
  // count the player's question.
  session.questionCount++;

  // Reflect the updated value back to the caller.
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

  // Persist session mutations so that downstream requests can be rehydrated.
  await persistSession(sessionId, session);

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

  enforceCacheSizeLimit();

  await persistSession(sessionId, gameSessions.get(sessionId)!);

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

  const session = await getOrLoadSession(sessionId);
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

  // Persist updated state for fault-tolerance.
  await persistSession(sessionId, session);

  return { aiResponse: jsonResponse, questionCount: session.questionCount };
}

function getSession(sessionId: string) {
  return gameSessions.get(sessionId);
}

function clearSessions() {
  gameSessions.clear();
}

/**
* Returns a single hint for the secret game belonging to the provided session.
*
* Developer, publisher, and release year are fetched from the RAWG API (and cached).
* For the special hint, the AI model will generate a short string (and it is also cached).
*/
async function getPlayerGuessHint(sessionId: string, hintType: HintType): Promise<HintResponse> {
  const session = await getOrLoadSession(sessionId);
  if (!session || !('secretGame' in session)) {
    throw new Error('Session not found.');
  }

  const metadata = await fetchGameMetadata(session.secretGame);

  // Fetch a hint from the model if requested and not already cached
  if (hintType === 'special' && !metadata.special) {
    try {
      const response: { special: string } = await generateStructured(
        specialHintSchema,
        SPECIAL_HINT_PROMPT(session.secretGame)
      );
      metadata.special = response.special;
      // Persist the AI-generated hint to the metadata cache
      await saveMetadata(session.secretGame, metadata);
    } catch (e) {
      // If the model call fails, fallback to no special hint
      metadata.special = undefined;
    }
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

  // Persist the updated `usedHint` flag.
  await persistSession(sessionId, session);

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
  getOrLoadSession,
};
