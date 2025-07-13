import { jest } from '@jest/globals';

// ---------------------- Mocks ----------------------
const authenticateMock = (req: any, _res: any, next: any) => {
  req.user = { id: 'player-1' };
  next();
};

const startPlayerGuessesGameMock = jest.fn();
const handlePlayerQuestionMock = jest.fn();
const saveConversationMessageMock = jest.fn();

jest.unstable_mockModule('../auth.js', () => ({
  __esModule: true,
  authenticateToken: authenticateMock,
  register: jest.fn(),
  login: jest.fn(),
}));

jest.unstable_mockModule('../game.js', () => ({
  __esModule: true,
  startPlayerGuessesGame: startPlayerGuessesGameMock,
  handlePlayerQuestion: handlePlayerQuestionMock,
  startAIGuessesGame: jest.fn(),
  handleAIAnswer: jest.fn(),
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

describe('POST /player-guesses/start', () => {
  const endpoint = '/player-guesses/start';

  it('starts a new player guesses game and returns the session id', async () => {
    startPlayerGuessesGameMock.mockResolvedValueOnce({ sessionId: 'sess-1' });

    await supertest(app)
      .post(endpoint)
      .expect(200)
      .expect({ sessionId: 'sess-1' });

    expect(startPlayerGuessesGameMock).toHaveBeenCalledTimes(1);
    expect(saveConversationMessageMock).toHaveBeenCalledWith(
      'player-1',
      'sess-1',
      'system',
      'Player-guesses game started',
    );
  });

  it('returns 500 if startPlayerGuessesGame throws', async () => {
    startPlayerGuessesGameMock.mockRejectedValueOnce(new Error('oops'));

    await supertest(app)
      .post(endpoint)
      .expect(500);
  });
});

describe('POST /player-guesses/question', () => {
  const endpoint = '/player-guesses/question';

  it('handles player question successfully', async () => {
    const result = { type: 'answer', content: 'Yes', questionCount: 1 };
    handlePlayerQuestionMock.mockResolvedValueOnce(result);

    await supertest(app)
      .post(endpoint)
      .send({ sessionId: 'sess-1', userInput: 'Is it fun?' })
      .expect(200)
      .expect(result);

    expect(handlePlayerQuestionMock).toHaveBeenCalledWith('sess-1', 'Is it fun?');
  });

  it.each([
    ['Session not found.', 404],
    ['Session ID and user input are required.', 400],
  ])('returns %i when error message is "%s"', async (message, status) => {
    handlePlayerQuestionMock.mockRejectedValueOnce(new Error(message as string));

    await supertest(app)
      .post(endpoint)
      .send({ sessionId: 'sess-1', userInput: 'question' })
      .expect(status as number);
  });
});
