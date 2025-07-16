/**
* Integration tests that verify conversation history is persisted to Firestore.
*
* The test suite wires up an *in-memory* mock implementation of the
* `@google-cloud/firestore` driver so that we can exercise the real `db.ts`
* helpers without touching a live Firestore instance or starting the Java
* emulator. Only the subset of the API surface that the backend uses is
* implemented – enough for reads/writes performed by `db.ts` plus simple
* query chaining (where ▸ orderBy ▸ limit ▸ get).
*
* The flow under test:
*   1. Create a user via the real `/auth/register` route to obtain a JWT.
*   2. Start a *player-guesses* session (`/player-guesses/start`). The server
*      writes a *system* message to Firestore.
*   3. Send a user question (`/player-guesses/question`). The server writes a
*      *user* message followed by a *model* response.
*   4. Fetch conversation rows using `getConversationsBySession()` and assert
*      that the expected three records are present and well-formed.
*
* The suite also includes **simulation tests** for upcoming features –
* clarification requests, final guesses, and RAWG tool usage – that write
* documents directly through `saveConversationMessage()` and then assert the
* records exist. These pass today while guarding against regressions once the
* features land.
*/

import { jest, beforeAll, beforeEach, describe, it, expect } from '@jest/globals';
import supertest from 'supertest';

// ---------------------------------------------------------------------------
// Mock Firestore – *must* be registered before importing any code that
// references `@google-cloud/firestore` (e.g. `db.ts`).
// ---------------------------------------------------------------------------

// Mini Timestamp shim -------------------------------------------------------
class MockTimestamp {
  private readonly _date: Date;
  private constructor(date: Date) {
    this._date = date;
  }

  /** Mirrors Firestore's `Timestamp.now()` static helper. */
  static now(): MockTimestamp {
    return new MockTimestamp(new Date());
  }

  /** Used by `db.ts` to turn a `Timestamp` back into an ISO string. */
  toDate(): Date {
    return this._date;
  }
}

// Helpers -------------------------------------------------------------------
const randomId = () => Math.random().toString(36).slice(2, 10);

// Thin DocumentSnapshot clone ------------------------------------------------
class MockDocSnapshot {
  constructor(public readonly id: string, private readonly _data: any) {}
  get exists() {
    return this._data !== undefined;
  }
  data() {
    return this._data;
  }
}

// Collection, Query & Doc classes -------------------------------------------
class MockCollection {
  readonly store = new Map<string, any>();

  doc(id: string) {
    return new MockDocRef(this, id);
  }

  /** Simplified add() – returns a DocumentReference like the real driver. */
  async add(data: any) {
    const id = randomId();
    this.store.set(id, data);
    return new MockDocRef(this, id);
  }

  where(field: string, op: string, value: any) {
    return new MockQuery(this).where(field, op, value);
  }

  orderBy(field: string, dir: 'asc' | 'desc' = 'asc') {
    return new MockQuery(this).orderBy(field, dir);
  }

  limit(n: number) {
    return new MockQuery(this).limit(n);
  }
}

class MockDocRef {
  constructor(private readonly collection: MockCollection, public readonly id: string) {}

  async set(data: any) {
    this.collection.store.set(this.id, data);
  }

  async get() {
    return new MockDocSnapshot(this.id, this.collection.store.get(this.id));
  }
}

class MockQuerySnapshot {
  constructor(public readonly docs: MockDocSnapshot[]) {}
}

class MockQuery {
  private readonly _filters: Array<{ field: string; op: string; value: any }> = [];
  private _order: { field: string; dir: 'asc' | 'desc' } | undefined;
  private _limit: number | undefined;

  constructor(private readonly collection: MockCollection) {}

  where(field: string, op: string, value: any): MockQuery {
    this._filters.push({ field, op, value });
    return this;
  }

  orderBy(field: string, dir: 'asc' | 'desc' = 'asc'): MockQuery {
    this._order = { field, dir };
    return this;
  }

  limit(n: number): MockQuery {
    this._limit = n;
    return this;
  }

  async get(): Promise<MockQuerySnapshot> {
    let docs = [...this.collection.store.entries()];

    // Apply equality filters only – that's all `db.ts` uses currently.
    for (const f of this._filters) {
      if (f.op !== '==') continue; // Unsupported op = no-op.
      docs = docs.filter(([, data]) => data?.[f.field] === f.value);
    }

    // Apply ordering – only ASC/DESC on a single field needed.
    if (this._order) {
      const { field, dir } = this._order;
      docs.sort(([, a], [, b]) => {
        const av = field === '__name__' ? '' : a[field];
        const bv = field === '__name__' ? '' : b[field];
        if (av === bv) return 0;
        return av < bv ? (dir === 'asc' ? -1 : 1) : dir === 'asc' ? 1 : -1;
      });
    }

    if (this._limit !== undefined) docs = docs.slice(0, this._limit);

    return new MockQuerySnapshot(docs.map(([id, data]) => new MockDocSnapshot(id, data)));
  }
}

// Top-level Firestore shim ----------------------------------------------------
class MockFirestore {
  private readonly _collections = new Map<string, MockCollection>();

  collection(name: string): MockCollection {
    let col = this._collections.get(name);
    if (!col) {
      col = new MockCollection();
      this._collections.set(name, col);
    }
    return col;
  }

  /** Purge *all* data – used in `beforeEach` to isolate tests. */
  clear() {
    for (const col of this._collections.values()) col.store.clear();
  }
}

// Register the stub with Jest *before* the app/db imports.
jest.unstable_mockModule('@google-cloud/firestore', () => ({
  __esModule: true,
  Firestore: MockFirestore,
  Timestamp: MockTimestamp,
}));

// ---------------------------------------------------------------------------
// Stub `game.ts` to avoid heavy AI/genkit calls – we only care that it returns
// the shape the router expects so that `server.ts` can proceed normally.
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
// Now we can import the real modules (they will receive our mocks).
// ---------------------------------------------------------------------------

import type * as DbModule from '../db.js';

let request: supertest.SuperTest<supertest.Test>;
let db: typeof DbModule;
let firestore: MockFirestore;

beforeAll(async () => {
  // Ensure NODE_ENV === 'test' so that server.ts doesn't call app.listen().
  process.env.NODE_ENV = 'test';

  // Dynamic imports so that the above `unstable_mockModule()` hooks take effect.
  db = await import('../db.js');
  const serverMod = await import('../server.js');
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  request = supertest(serverMod.default);

  // Access the singleton mock Firestore instance created inside `db.ts`.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  firestore = db.firestore as unknown as MockFirestore;
});

beforeEach(() => {
  firestore.clear();
});

// ---------------------------------------------------------------------------
// Happy-path flow – player asks a question, server persists *system → user →
// model* messages.
// ---------------------------------------------------------------------------

describe('conversation history persistence', () => {
  it('persists system, user and model messages for /player-guesses flow', async () => {
    // 1. Register a user → grab JWT.
    const { body: regBody } = await request
      .post('/auth/register')
      .send({ username: 'alice', password: 'secret' })
      .expect(200);

    const token = regBody.token as string;

    // 2. Start a game – returns { sessionId }.
    const { body: startBody } = await request
      .post('/player-guesses/start')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const sessionId = startBody.sessionId as string;

    // 3. Ask a question.
    await request
      .post('/player-guesses/question')
      .set('Authorization', `Bearer ${token}`)
      .send({ sessionId, userInput: 'Is it an RPG?' })
      .expect(200);

    // 4. Query Firestore via the real helper.
    const rows = await db.getConversationsBySession(sessionId);

    expect(rows).toHaveLength(3);

    // Verify ordering and essential fields.
    expect(rows[0]).toMatchObject({ role: 'system', content: 'Player-guesses game started' });
    expect(rows[1]).toMatchObject({ role: 'user', content: 'Is it an RPG?' });
    expect(rows[2].role).toBe('model'); // Content is JSON stringified – exact value stub-dependent.
  });
});

// ---------------------------------------------------------------------------
// Simulation tests – write directly through `saveConversationMessage()`.
// ---------------------------------------------------------------------------

describe('future feature simulations', () => {
  const userId = 'sim-user';

  it('flags clarification requests', async () => {
    const sessionId = 'clar-' + randomId();
    await db.saveConversationMessage(
      userId,
      sessionId,
      'user',
      JSON.stringify({ clarification: true, question: 'Could you clarify?' }),
    );

    const rows = await db.getConversationsBySession(sessionId);
    expect(rows).toHaveLength(1);
    expect(rows[0].content).toContain('clarification');
  });

  it('stores final guesses', async () => {
    const sessionId = 'guess-' + randomId();
    await db.saveConversationMessage(
      userId,
      sessionId,
      'user',
      JSON.stringify({ type: 'finalGuess', guess: 'Halo' }),
    );

    const rows = await db.getConversationsBySession(sessionId);
    expect(rows).toHaveLength(1);
    expect(rows[0].content).toContain('finalGuess');
  });

  it('captures RAWG API tool invocations', async () => {
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
