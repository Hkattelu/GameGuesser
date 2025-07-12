import { jest } from '@jest/globals';

// Supertest will drive the Express app in-memory
import request from 'supertest';

// ---------------------------------------------------------------------------------------------
// Mock external dependencies BEFORE importing the server so the mocks are picked up.
// ---------------------------------------------------------------------------------------------

// Mock Gemini helper to avoid real network calls
const callGeminiMock = jest.fn().mockResolvedValue({
  developer: 'Blizzard Entertainment',
  publisher: 'Blizzard',
  releaseYear: 1998,
});

jest.unstable_mockModule('../gemini.ts', () => ({
  __esModule: true,
  callGeminiAPI: callGeminiMock,
}));

// Mock dailyGameStore to avoid touching Firestore during tests
const getDailyGameMock = jest.fn().mockResolvedValue('Mocked Daily Game');

jest.unstable_mockModule('../dailyGameStore.ts', () => ({
  __esModule: true,
  getDailyGame: getDailyGameMock,
}));

// Bypass JWT authentication for tests – we always inject a dummy user.
jest.unstable_mockModule('../auth.ts', () => ({
  __esModule: true,
  authenticateToken: (_req: any, _res: any, next: any) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    _req.user = { id: 'test-user', username: 'test-user' };
    next();
  },
  register: jest.fn(),
  login: jest.fn(),
}));

describe('GET /games/:sessionId/hint', () => {
  let app: typeof import('express').default;
  let startPlayerGuessesGame: typeof import('../game.ts').startPlayerGuessesGame;

  beforeAll(async () => {
    // Import modules **after** mocks are set up so they pick up the mocked versions.
    const gameMod = await import('../game.ts');
    startPlayerGuessesGame = gameMod.startPlayerGuessesGame;

    const serverModule = await import('../server.ts');
    app = serverModule.default;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    globalThis.__expressServer = serverModule.server;
  });

  afterAll(() => {
    // Close the Express server to free the port and open handles
    (globalThis.__expressServer as any)?.close?.();
  });

  it('returns a hint for a valid session', async () => {
    const { sessionId } = await startPlayerGuessesGame();

    const res = await request(app)
      .get(`/games/${sessionId}/hint`)
      .set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      developer: 'Blizzard Entertainment',
      publisher: 'Blizzard',
      releaseYear: 1998,
    });

    expect(callGeminiMock).toHaveBeenCalledTimes(1);
  });

  it('returns 404 when the session does not exist', async () => {
    const res = await request(app)
      .get('/games/non-existent-session/hint')
      .set('Authorization', 'Bearer fake-token');

    expect(res.status).toBe(404);
  });
});
