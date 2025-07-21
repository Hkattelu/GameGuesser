/**
* Integration tests that validate Firestore conversation persistence for both
* *player-guesses* and *AI-guesses* game flows. The suite runs the real
* Express server wired up to an *in-memory* Firestore stub so we exercise the
* production code paths end-to-end without external services.
*/

import { jest, beforeAll, beforeEach, describe, it, expect } from '@jest/globals';
import supertest from 'supertest';

// ---------------------------------------------------------------------------
// Firestore mock – registering early ensures `db.ts` picks up the stub.
// ---------------------------------------------------------------------------

import {
  MockFirestore,
  randomId,
} from './mocks/firestoreMock.js'; // side-effect: jest.unstable_mockModule()

// ---------------------------------------------------------------------------
// Stub heavy game-layer functions – we only care about persistence here.
// ---------------------------------------------------------------------------

const startPlayerGuessesGameStub = jest.fn(async () => ({
  sessionId: 'sess-' + randomId(),
}));

const handlePlayerQuestionStub = jest.fn(async () => ({
  type: 'answer',
  questionCount: 1,
  content: 'stub-answer',
}));

const startAIGuessesGameStub = jest.fn(async () => ({
  sessionId: 'ai-' + randomId(),
  aiResponse: { type: 'question', content: 'stub-q1' },
  questionCount: 1,
}));

const handleAIAnswerStub = jest.fn(async () => ({
  questionCount: 2,
  aiResponse: { type: 'question', content: 'stub-q2' },
}));

jest.unstable_mockModule('../game.js', () => ({
  __esModule: true,
  startPlayerGuessesGame: startPlayerGuessesGameStub,
  handlePlayerQuestion: handlePlayerQuestionStub,
  startAIGuessesGame: startAIGuessesGameStub,
  handleAIAnswer: handleAIAnswerStub,
  getPlayerGuessHint: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Import application modules *after* mocking.
// ---------------------------------------------------------------------------

import type * as DbModule from '../db.js';

let request: supertest.SuperTest<supertest.Test>;
let db: typeof DbModule;
let firestore: MockFirestore;

beforeAll(async () => {
  process.env.NODE_ENV = 'test'; // prevents server.ts from calling app.listen()

  // Dynamic imports ensure the above `unstable_mockModule()` hooks take effect.
  db = await import('../db.js');
  const serverMod = await import('../server.js');
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  request = supertest(serverMod.default);

  // Obtain a typed reference to the singleton mock instance.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  // The instance was created during the first import of `db.ts`; we can obtain
  // it via the typed accessor and cast it once to the mock type for helpers
  // like `.clear()`.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  firestore = db.getFirestoreInstance() as unknown as MockFirestore;
});

beforeEach(() => {
  firestore.clear();
  jest.clearAllMocks();
});

describe('conversation history persistence – /player-guesses flow', () => {
  it('persists *system → user → model* messages', async () => {
    // Register user
    const { body: reg } = await request
      .post('/auth/register')
      .send({ username: 'alice', password: 'secret' })
      .expect(200);

    const token = reg.token as string;

    // Start game (writes system msg)
    const { body: start } = await request
      .post('/player-guesses/start')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const sessionId = start.sessionId as string;

    // Ask a question (writes user + model msgs)
    await request
      .post('/player-guesses/question')
      .set('Authorization', `Bearer ${token}`)
      .send({ sessionId, userInput: 'Is it an RPG?' })
      .expect(200);

    const rows = await db.getConversationsBySession(sessionId);

    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ role: 'system', content: 'Player-guesses game started' });
    expect(rows[1]).toMatchObject({ role: 'user', content: 'Is it an RPG?' });
    expect(rows[2].role).toBe('model');
  });
});

describe('conversation history persistence – /ai-guesses flow', () => {
  it('persists *system → model → user → model* messages', async () => {
    // Register user
    const { body: reg } = await request
      .post('/auth/register')
      .send({ username: 'bob', password: 'hunter2' })
      .expect(200);

    const token = reg.token as string;

    // Start AI-guesses game (writes system + initial model question)
    const { body: start } = await request
      .post('/ai-guesses/start')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const sessionId = start.sessionId as string;

    // Answer AI question (writes user answer + follow-up model question)
    await request
      .post('/ai-guesses/answer')
      .set('Authorization', `Bearer ${token}`)
      .send({ sessionId, userAnswer: 'Yes' })
      .expect(200);

    const rows = await db.getConversationsBySession(sessionId);

    expect(rows).toHaveLength(4);

    // Expected order: system, model(question1), user(answer), model(question2)
    expect(rows[0]).toMatchObject({ role: 'system', content: 'AI-guesses game started' });
    expect(rows[1].role).toBe('model');
    expect(rows[2]).toMatchObject({ role: 'user', content: 'Yes' });
    expect(rows[3].role).toBe('model');
  });
});

describe('uses RAWG tool', () => {

  it('captures RAWG API tool invocations', async () => {
    const userId = 'sim-user';
    const sessionId = 'rawg-' + randomId();
    await db.saveConversationMessage(
      userId,
      sessionId,
      'system',
      JSON.stringify({ tool: 'RAWG', endpoint: 'games', id: 12345 }),
    );

    const rows = await db.getConversationsBySession(sessionId);
    expect(rows).toHaveLength(1);
    expect(rows[0].content).toContain('RAWG');
  });
});
