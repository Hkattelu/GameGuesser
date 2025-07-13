import { jest } from '@jest/globals';

// ---------------------- Mocks ----------------------
const authenticateMock = (req: any, _res: any, next: any) => {
  req.user = { id: 'player-1' };
  next();
};

const startAIGuessesGameMock = jest.fn();
const handleAIAnswerMock = jest.fn();
const saveConversationMessageMock = jest.fn();

jest.unstable_mockModule('../auth.js', () => ({
  __esModule: true,
  authenticateToken: authenticateMock,
  register: jest.fn(),
  login: jest.fn(),
}));

jest.unstable_mockModule('../game.js', () => ({
  __esModule: true,
  startPlayerGuessesGame: jest.fn(),
  handlePlayerQuestion: jest.fn(),
  startAIGuessesGame: startAIGuessesGameMock,
  handleAIAnswer: handleAIAnswerMock,
  getPlayerGuessHint: jest.fn(),
}));

jest.unstable_mockModule('../db.js', () => ({
  __esModule: true,
  saveConversationMessage: saveConversationMessageMock,
  getConversationHistory: jest.fn(),
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

describe('POST /ai-guesses/start', () => {
  const endpoint = '/ai-guesses/start';

  it('starts a new AI guesses game and returns initial state', async () => {
    const sessionObj = {
      sessionId: 'sess-ai',
      aiResponse: { type: 'question', content: 'Is it an RPG?' },
      questionCount: 1,
    };
    startAIGuessesGameMock.mockResolvedValueOnce(sessionObj);

    await supertest(app)
      .post(endpoint)
      .expect(200)
      .expect(sessionObj);

    expect(startAIGuessesGameMock).toHaveBeenCalledTimes(1);
    expect(saveConversationMessageMock).toHaveBeenCalledTimes(2); // system + model message
  });

  it('returns 500 if startAIGuessesGame throws', async () => {
    startAIGuessesGameMock.mockRejectedValueOnce(new Error('fail'));

    await supertest(app)
      .post(endpoint)
      .expect(500);
  });
});

describe('POST /ai-guesses/answer', () => {
  const endpoint = '/ai-guesses/answer';

  it('processes an AI answer and returns next question', async () => {
    const response = {
      questionCount: 2,
      aiResponse: { type: 'question', content: 'Does it have multiplayer?' },
    };
    handleAIAnswerMock.mockResolvedValueOnce(response);

    await supertest(app)
      .post(endpoint)
      .send({ sessionId: 'sess-ai', userAnswer: 'Yes' })
      .expect(200)
      .expect(response);

    expect(handleAIAnswerMock).toHaveBeenCalledWith('sess-ai', 'Yes');
  });

  it.each([
    ['Session not found.', 404],
    ['Session ID and user answer are required.', 400],
  ])('returns appropriate status for "%s"', async (msg, status) => {
    handleAIAnswerMock.mockRejectedValueOnce(new Error(msg as string));

    await supertest(app)
      .post(endpoint)
      .send({ sessionId: 'sess-ai', userAnswer: 'Yes' })
      .expect(status as number);
  });
});
