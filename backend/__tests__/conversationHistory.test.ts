import { jest, beforeAll, afterAll, afterEach, describe, it, expect } from '@jest/globals';
import supertest from 'supertest';

// ---------------------------------------------------------------------------
// Firestore in-memory stub
// ---------------------------------------------------------------------------

class FakeTimestamp {
  private readonly _date: Date;

  private constructor(date: Date = new Date()) {
    this._date = date;
  }

  static now(): FakeTimestamp {
    return new FakeTimestamp(new Date());
  }

  toDate(): Date {
    return this._date;
  }
}

/** A minimal, in-memory Firestore replacement that supports the subset of the
* API used by `backend/db.ts` – namely: `collection().add()`, `collection().doc(id).set()`,
* `collection().doc(id).get()`, and simple `where('field', '==', value).orderBy('created_at', 'asc').get()`
*/
class FakeFirestore {
  private readonly _collections: Record<string, Map<string, any>> = {};

  /** Clears **all** collections – used between tests to guarantee isolation. */
  reset(): void {
    for (const col of Object.values(this._collections)) col.clear();
  }

  /** Helper to create or retrieve the Map backing a collection. */
  private _getCol(name: string): Map<string, any> {
    if (!this._collections[name]) this._collections[name] = new Map<string, any>();
    return this._collections[name];
  }

  collection(name: string) {
    const col = this._getCol(name);

    const randomId = () => Math.random().toString(36).slice(2, 15);

    const makeDoc = (id: string) => ({
      id,
      set: async (data: any) => {
        col.set(id, data);
      },
      get: async () => ({
        id,
        exists: col.has(id),
        data: () => col.get(id),
      }),
    });

    const queryWrapper = (entries: [string, any][]) => ({
      orderBy: (field: string, dir: 'asc' | 'desc' = 'asc') => ({
        get: async () => {
          const toMillis = (v: any) =>
            v instanceof FakeTimestamp ? v.toDate().getTime() : new Date(v).getTime();

          const sorted = [...entries].sort((a, b) => {
            const delta = toMillis(a[1][field]) - toMillis(b[1][field]);
            return dir === 'asc' ? delta : -delta;
          });

          return {
            docs: sorted.map(([id, data]) => ({
              id,
              data: () => data,
            })),
          };
        },
      }),
    });

    return {
      // doc() – explicit ID or random when omitted ----------------------------------
      doc: (id?: string) => makeDoc(id ?? randomId()),

      // add() – Firestore auto-ID ----------------------------------------------------
      add: async (data: any) => {
        const id = randomId();
        col.set(id, data);
        return { id };
      },

      // where() – **only** supports equality filter used by our code -----------------
      where: (field: string, op: string, value: any) => {
        if (op !== '==') throw new Error('FakeFirestore only implements == where ops');
        const matches: [string, any][] = [...col.entries()].filter(([, doc]) => doc[field] === value);
        return queryWrapper(matches);
      },

      // Convenience for manual cleanup in tests
      _clear: () => col.clear(),
    } as any;
  }
}

// Create a single global instance so every `new Firestore()` returns the same
// underlying store – mirroring how the real SDK behaves when pointed at the
// emulator.
const _fakeFsInstance = new FakeFirestore();

// Register the module stub **before** the system-under-test is imported.
jest.unstable_mockModule('@google-cloud/firestore', () => ({
  __esModule: true,
  Firestore: jest.fn(() => _fakeFsInstance),
  Timestamp: FakeTimestamp,
}));

// ---------------------------------------------------------------------------
// Secondary stubs – auth and game. These isolate us from unrelated complexity
// (JWTs, Gemini API, RAWG fetches, etc.)
// ---------------------------------------------------------------------------

const authenticateTokenMock = jest.fn((req: any, _res: any, next: () => void) => {
  req.user = { id: 'user-1', username: 'tester' };
  next();
});

jest.unstable_mockModule('../auth.js', () => ({
  __esModule: true,
  authenticateToken: authenticateTokenMock,
  register: jest.fn(),
  login: jest.fn(),
}));

// Minimal deterministic game logic so routes can execute without talking to
// Gemini.
const startAIGuessesGameMock = jest.fn(async () => ({
  sessionId: 'sess-123',
  aiResponse: { type: 'question', content: 'Is it an RPG?' },
  questionCount: 1,
}));

const handleAIAnswerMock = jest.fn(async () => ({
  aiResponse: { type: 'question', content: 'Next question' },
  questionCount: 2,
}));

jest.unstable_mockModule('../game.js', () => ({
  __esModule: true,
  // Player-mode helpers are not needed for these tests
  startPlayerGuessesGame: jest.fn(),
  handlePlayerQuestion: jest.fn(),

  // AI-mode helpers used by our flow
  startAIGuessesGame: startAIGuessesGameMock,
  handleAIAnswer: handleAIAnswerMock,

  // Hints not exercised here
  getPlayerGuessHint: jest.fn(),
}));

// RAWG metadata fetch – return static data so tests are deterministic. Even
// though the conversation routes don’t persist RAWG directly, we verify that
// metadata can be stored when callers choose to.
jest.unstable_mockModule('../rawgDetails.js', () => ({
  __esModule: true,
  fetchGameMetadata: jest.fn(async () => ({
    developer: 'BioWare',
    publisher: 'EA',
    releaseYear: 2003,
  })),
}));

// ---------------------------------------------------------------------------
// System-under-test imports (done **after** stubs are registered)
// ---------------------------------------------------------------------------

let request: supertest.SuperTest<supertest.Test>;
let db: typeof import('../db.js');

let originalNodeEnv: string | undefined;

beforeAll(async () => {
  // Force NODE_ENV to 'test' so `server.ts` doesn’t bind a real HTTP port.
  originalNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';

  // Dynamic import after mocks are in place
  db = await import('../db.js');
  const mod = await import('../server.js');
  request = supertest(mod.default);
});

afterAll(() => {
  // Restore original NODE_ENV to avoid side-effects on other suites.
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
});

afterEach(() => {
  jest.clearAllMocks();
  _fakeFsInstance.reset();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Conversation history persistence (Firestore)', () => {
  it('persists a multi-turn AI-guesses conversation', async () => {
    // 1) Start the game – triggers system + first AI question messages
    const startRes = await request.post('/ai-guesses/start').expect(200);
    expect(startRes.body.sessionId).toBe('sess-123');

    // 2) Player answers – triggers user + AI follow-up messages
    await request
      .post('/ai-guesses/answer')
      .send({ sessionId: 'sess-123', userAnswer: 'Yes' })
      .expect(200);

    // 3) Inspect stored data
    const history = await db.getConversationsBySession('sess-123');

    // We expect four messages in the correct chronological order
    const roles = history.map((h) => h.role);
    expect(roles).toEqual(['system', 'model', 'user', 'model']);

    // Spot-check payload integrity
    expect(history[0].content).toBe('AI-guesses game started');
    expect(history[1].content).toContain('Is it an RPG?');
    expect(history[2].content).toBe('Yes');
    expect(history[3].content).toContain('Next question');

    // All messages must have a timestamp (ISO string).
    history.forEach((msg) => expect(msg.created_at).toBeDefined());
  });

  it('gracefully handles unknown sessions without persisting model replies', async () => {
    // Force the game handler to signal "session not found" which the route maps to 404.
    handleAIAnswerMock.mockRejectedValueOnce(new Error('Session not found.'));

    await request
      .post('/ai-guesses/answer')
      .send({ sessionId: 'missing-session', userAnswer: 'Yes' })
      .expect(404);

    // The server always stores the *user* answer before delegating to the game logic, so we expect
    // exactly one document (role=user) and **no** model/system messages.
    const docs = await db.getConversationsBySession('missing-session');
    expect(docs).toHaveLength(1);
    expect(docs[0].role).toBe('user');
    expect(docs[0].content).toBe('Yes');
  });
});

describe('RAWG metadata persistence', () => {
  it('allows callers to persist RAWG-derived hints in conversation history', async () => {
    const sessionId = 'rawg-1';

    // Manually persist a hint message that would originate from RAWG data.
    await db.saveConversationMessage(
      'user-1',
      sessionId,
      'model',
      JSON.stringify({ hintType: 'developer', hintText: 'The developer is BioWare.' }),
    );

    const bySession = await db.getConversationsBySession(sessionId);
    expect(bySession).toHaveLength(1);
    expect(bySession[0].content).toContain('BioWare');
  });
});
