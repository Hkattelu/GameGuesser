import { jest } from '@jest/globals';

const authenticateMock = (_req: any, _res: any, next: any) => next();

// Mock auth middleware so we don't have to build/verify a JWT in tests
jest.unstable_mockModule('../auth.ts', () => ({
  __esModule: true,
  authenticateToken: authenticateMock,
  register: jest.fn(),
  login: jest.fn(),
}));

// Stub the getPlayerGuessHint function so the route logic can be tested in isolation.
const getPlayerGuessHintMock = jest.fn();

jest.unstable_mockModule('../game.ts', () => {
  return {
    __esModule: true,
    // Only the APIs required by server.ts need to be stubbed.
    startPlayerGuessesGame: jest.fn(),
    handlePlayerQuestion: jest.fn(),
    startAIGuessesGame: jest.fn(),
    handleAIAnswer: jest.fn(),
    getPlayerGuessHint: getPlayerGuessHintMock,
  };
});

// Import the server *after* mocks are in place
import supertest from 'supertest';

let app: typeof import('express').default;

beforeAll(async () => {
  const mod = await import('../server.ts');
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  app = mod.default;
  process.env.NODE_ENV = 'test';
});

describe('GET /player-guesses/:sessionId/hint', () => {
  const sessionId = 'session-123';

  afterEach(() => {
    getPlayerGuessHintMock.mockReset();
  });

  it.each([
    { type: 'developer', value: 'Nintendo' },
    { type: 'publisher', value: 'Sony Interactive Entertainment' },
    { type: 'releaseYear', value: 2017 },
  ])('returns %p hint', async (hint) => {
    getPlayerGuessHintMock.mockResolvedValueOnce(hint);

    await supertest(app)
      .get(`/player-guesses/${sessionId}/hint`)
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(hint);

    expect(getPlayerGuessHintMock).toHaveBeenCalledWith(sessionId);
  });

  it('returns 404 when getPlayerGuessHint throws "Session not found."', async () => {
    getPlayerGuessHintMock.mockRejectedValueOnce(new Error('Session not found.'));

    await supertest(app)
      .get(`/player-guesses/${sessionId}/hint`)
      .expect(404);
  });
});
