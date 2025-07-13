import { jest } from '@jest/globals';

// ---------------------- Mocks ----------------------
const registerMock = jest.fn();
const loginMock = jest.fn();
const authenticateMock = (_req: any, _res: any, next: any) => next();

jest.unstable_mockModule('../auth.js', () => ({
  __esModule: true,
  authenticateToken: authenticateMock,
  register: registerMock,
  login: loginMock,
}));

const saveConversationMessageMock = jest.fn();
const getConversationHistoryMock = jest.fn();

jest.unstable_mockModule('../db.js', () => ({
  __esModule: true,
  saveConversationMessage: saveConversationMessageMock,
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

describe('POST /auth/register', () => {
  const endpoint = '/auth/register';

  it('returns a JWT when registration succeeds', async () => {
    registerMock.mockResolvedValueOnce('test-jwt');

    await supertest(app)
      .post(endpoint)
      .send({ username: 'newuser', password: 'pass123' })
      .expect(200)
      .expect('Content-Type', /json/)
      .expect({ token: 'test-jwt' });

    expect(registerMock).toHaveBeenCalledWith('newuser', 'pass123');
  });

  it('returns 400 when username or password is missing', async () => {
    await supertest(app)
      .post(endpoint)
      .send({ username: 'missing-password' })
      .expect(400);

    expect(registerMock).not.toHaveBeenCalled();
  });

  it('returns 400 when register throws a validation error', async () => {
    registerMock.mockRejectedValueOnce(new Error('Username already exists'));

    await supertest(app)
      .post(endpoint)
      .send({ username: 'alice', password: 'secret' })
      .expect(400)
      .expect({ error: 'Username already exists' });
  });
});

describe('POST /auth/login', () => {
  const endpoint = '/auth/login';

  it('returns a JWT when credentials are valid', async () => {
    loginMock.mockResolvedValueOnce('jwt-login');

    await supertest(app)
      .post(endpoint)
      .send({ username: 'alice', password: 'secret' })
      .expect(200)
      .expect({ token: 'jwt-login' });

    expect(loginMock).toHaveBeenCalledWith('alice', 'secret');
  });

  it('returns 400 when username or password is missing', async () => {
    await supertest(app)
      .post(endpoint)
      .send({})
      .expect(400);

    expect(loginMock).not.toHaveBeenCalled();
  });

  it('returns 401 when login throws an authentication error', async () => {
    loginMock.mockRejectedValueOnce(new Error('Invalid credentials'));

    await supertest(app)
      .post(endpoint)
      .send({ username: 'alice', password: 'wrong' })
      .expect(401)
      .expect({ error: 'Invalid credentials' });
  });
});
