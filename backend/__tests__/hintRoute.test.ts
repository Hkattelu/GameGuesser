
import { jest, beforeAll, afterAll, afterEach, describe, it, expect } from '@jest/globals';
import supertest from 'supertest';
import { getGameHistory } from '../db.js';

const authenticateTokenMock = jest.fn((req: any, _res: any, next: () => void) => {
  req.user = { id: 'user-123', username: 'tester' };
  next();
});
jest.unstable_mockModule('../auth.js', () => ({
  __esModule: true,
  authenticateToken: authenticateTokenMock,
  register: jest.fn(),
  login: jest.fn(),
}));

const saveConversationMessageMock = jest.fn();
jest.unstable_mockModule('../db.js', () => ({
  __esModule: true,
  saveConversationMessage: saveConversationMessageMock,
  getGameHistory: jest.fn(),
  getConversationHistory: jest.fn(),
  getConversationsBySession: jest.fn(),
}));

const getPlayerGuessHintMock = jest.fn();

jest.unstable_mockModule('../game.js', () => ({
  __esModule: true,
  startPlayerGuessesGame: jest.fn(),
  handlePlayerQuestion: jest.fn(),
  startAIGuessesGame: jest.fn(),
  handleAIAnswer: jest.fn(),
  getPlayerGuessHint: getPlayerGuessHintMock,
}));

let request: supertest.SuperTest<supertest.Test>;

// Preserve the original NODE_ENV so we can restore it after the suite runs.
let originalNodeEnv: string | undefined;

beforeAll(async () => {
  // Capture existing value before overwriting so it doesn't leak to other suites.
  originalNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  const mod = await import('../server.js');
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  request = supertest(mod.default);
});

afterAll(() => {
  // Restore the original NODE_ENV (it could be undefined).
  if (originalNodeEnv === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = originalNodeEnv;
  }
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('GET /player-guesses/:sessionId/hint', () => {
  const sessionId = 'pg1';

  it('returns a hint on success', async () => {
    getPlayerGuessHintMock.mockResolvedValue('This is a hint.');

    await request
      .get(`/player-guesses/${sessionId}/hint`)
      .expect(200)
      .expect({ hint: 'This is a hint.' });

    expect(getPlayerGuessHintMock).toHaveBeenCalledWith(sessionId, undefined);
    expect(saveConversationMessageMock).toHaveBeenCalledTimes(1);
    expect(saveConversationMessageMock).toHaveBeenCalledWith(
      'tester',
      sessionId,
      'player-guesses',
      'system',
      'Hint provided: This is a hint.',
    );
  });

  it('returns 404 when session is not found', async () => {
    getPlayerGuessHintMock.mockRejectedValue(new Error('Session not found.'));

    await request
      .get(`/player-guesses/${sessionId}/hint`)
      .expect(404)
      .expect({ error: 'Session not found.' });

    expect(getPlayerGuessHintMock).toHaveBeenCalledWith(sessionId, undefined);
    expect(saveConversationMessageMock).not.toHaveBeenCalled();
  });

  it('returns 500 for other errors', async () => {
    getPlayerGuessHintMock.mockRejectedValue(new Error('Something went wrong.'));

    await request
      .get(`/player-guesses/${sessionId}/hint`)
      .expect(500)
      .expect({ error: 'Internal Server Error', details: 'Something went wrong.' });

    expect(getPlayerGuessHintMock).toHaveBeenCalledWith(sessionId, undefined);
    expect(saveConversationMessageMock).not.toHaveBeenCalled();
  });

  it('returns 404 when no hint data is available', async () => {
    getPlayerGuessHintMock.mockRejectedValue(new Error('No hint data available'));

    await request
      .get(`/player-guesses/${sessionId}/hint`)
      .expect(404)
      .expect({ error: 'No hint data available' });

    expect(getPlayerGuessHintMock).toHaveBeenCalledWith(sessionId, undefined);
    expect(saveConversationMessageMock).not.toHaveBeenCalled();
  });
});
