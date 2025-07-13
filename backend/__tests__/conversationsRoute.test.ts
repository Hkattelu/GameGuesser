import { jest } from '@jest/globals';

// ---------------------- Mocks ----------------------
const authenticateMock = (req: any, _res: any, next: any) => {
  req.user = { id: 'user-42' };
  next();
};

const getConversationHistoryMock = jest.fn();

jest.unstable_mockModule('../auth.js', () => ({
  __esModule: true,
  authenticateToken: authenticateMock,
  register: jest.fn(),
  login: jest.fn(),
}));

jest.unstable_mockModule('../db.js', () => ({
  __esModule: true,
  saveConversationMessage: jest.fn(),
  getConversationHistory: getConversationHistoryMock,
}));

jest.unstable_mockModule('../game.js', () => ({
  __esModule: true,
  startPlayerGuessesGame: jest.fn(),
  handlePlayerQuestion: jest.fn(),
  startAIGuessesGame: jest.fn(),
  handleAIAnswer: jest.fn(),
  getPlayerGuessHint: jest.fn(),
}));

import supertest from 'supertest';

let app: typeof import('express').default;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  const mod = await import('../server.js');
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  app = mod.default;
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('GET /conversations/history', () => {
  const endpoint = '/conversations/history';

  it('returns conversation history for the authenticated user', async () => {
    const history = [
      { role: 'user', content: 'Hi' },
      { role: 'model', content: 'Hello!' },
    ];
    getConversationHistoryMock.mockResolvedValueOnce(history);

    await supertest(app)
      .get(endpoint)
      .expect(200)
      .expect(history);

    expect(getConversationHistoryMock).toHaveBeenCalledWith('user-42');
  });

  it('returns 500 when the history lookup fails', async () => {
    getConversationHistoryMock.mockRejectedValueOnce(new Error('database down'));

    await supertest(app)
      .get(endpoint)
      .expect(500);
  });
});
