import { jest, beforeAll, afterAll, afterEach, describe, it, expect } from '@jest/globals';
import supertest from 'supertest';

// ---------------------------------------------------------------------------
// Stub collaborators used by `server.ts`
// ---------------------------------------------------------------------------

// Auth helpers ---------------------------------------------------------------
const registerMock = jest.fn();
const loginMock = jest.fn();

// `authenticateToken` just injects a fake user and calls next().
const authenticateTokenMock = jest.fn((req: any, _res: any, next: () => void) => {
  req.user = { id: 'user-123', username: 'tester' };
  next();
});

jest.unstable_mockModule('../auth.js', () => ({
  __esModule: true,
  authenticateToken: authenticateTokenMock,
  register: registerMock,
  login: loginMock,
}));

// Database helpers -----------------------------------------------------------
const saveConversationMessageMock = jest.fn();
const getConversationHistoryMock = jest.fn();

jest.unstable_mockModule('../db.js', () => ({
  __esModule: true,
  saveConversationMessage: saveConversationMessageMock,
  getConversationHistory: getConversationHistoryMock,
}));

// Game service helpers -------------------------------------------------------
const startPlayerGuessesGameMock = jest.fn();
const handlePlayerQuestionMock = jest.fn();
const startAIGuessesGameMock = jest.fn();
const handleAIAnswerMock = jest.fn();

jest.unstable_mockModule('../game.js', () => ({
  __esModule: true,
  startPlayerGuessesGame: startPlayerGuessesGameMock,
  handlePlayerQuestion: handlePlayerQuestionMock,
  startAIGuessesGame: startAIGuessesGameMock,
  handleAIAnswer: handleAIAnswerMock,
  getPlayerGuessHint: jest.fn(), // covered in hintRoute.test.ts
}));

// ---------------------------------------------------------------------------
// Import the server AFTER all stubs are registered.
// ---------------------------------------------------------------------------

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

describe('POST /auth/register', () => {
  it('returns token on success', async () => {
    registerMock.mockResolvedValue('fake-token');

    await request
      .post('/auth/register')
      .send({ username: 'alice', password: 'password' })
      .expect(200)
      .expect('Content-Type', /json/)
      .expect({ token: 'fake-token' });

    expect(registerMock).toHaveBeenCalledWith('alice', 'password');
  });

  it('returns 400 when register() throws', async () => {
    registerMock.mockRejectedValue(new Error('Username already taken'));

    await request
      .post('/auth/register')
      .send({ username: 'bob', password: 'password' })
      .expect(400)
      .expect({ error: 'Username already taken' });
  });

  it('returns 400 when username/password missing', async () => {
    await request.post('/auth/register').send({ username: 'charlie' }).expect(400);
  });
});

describe('POST /auth/login', () => {
  it('returns token on success', async () => {
    loginMock.mockResolvedValue('login-token');

    await request
      .post('/auth/login')
      .send({ username: 'alice', password: 'secret' })
      .expect(200)
      .expect({ token: 'login-token' });
  });

  it('returns 401 on invalid credentials', async () => {
    loginMock.mockRejectedValue(new Error('Invalid credentials'));

    await request
      .post('/auth/login')
      .send({ username: 'alice', password: 'wrong' })
      .expect(401)
      .expect({ error: 'Invalid credentials' });
  });

  it('returns 400 when payload missing', async () => {
    await request.post('/auth/login').send({}).expect(400);
  });
});

describe('GET /conversations/history', () => {
  it('returns conversation history for authenticated user', async () => {
    const history = [
      { session_id: 's1', role: 'user', content: 'Hi', created_at: '2025-01-01' },
    ];
    getConversationHistoryMock.mockResolvedValue(history);

    await request.get('/conversations/history').expect(200).expect(history);

    expect(getConversationHistoryMock).toHaveBeenCalledWith('user-123', undefined);
    expect(authenticateTokenMock).toHaveBeenCalled();
  });

  it('returns conversation history for a specific day', async () => {
    const history = [
      { session_id: 's2', role: 'user', content: 'Hello', created_at: '2025-07-16' },
    ];
    getConversationHistoryMock.mockResolvedValue(history);

    await request.get('/conversations/history?date=2025-07-16').expect(200).expect(history);

    expect(getConversationHistoryMock).toHaveBeenCalledWith('user-123', '2025-07-16');
    expect(authenticateTokenMock).toHaveBeenCalled();
  });

  it('returns 500 when db throws', async () => {
    getConversationHistoryMock.mockRejectedValue(new Error('db error'));

    await request.get('/conversations/history').expect(500);
  });
});

describe('POST /player-guesses/start', () => {
  it('creates a new player session', async () => {
    startPlayerGuessesGameMock.mockResolvedValue({ sessionId: 'pg1' });

    await request.post('/player-guesses/start').expect(200).expect({ sessionId: 'pg1' });

    expect(startPlayerGuessesGameMock).toHaveBeenCalled();
    expect(saveConversationMessageMock).toHaveBeenCalledTimes(1);
  });

  it('returns 500 on failure', async () => {
    startPlayerGuessesGameMock.mockRejectedValue(new Error('oops'));

    await request.post('/player-guesses/start').expect(500);
  });
});

describe('POST /player-guesses/question', () => {
  const payload = { sessionId: 'pg1', userInput: 'Is it an RPG?' };

  it('returns AI response', async () => {
    handlePlayerQuestionMock.mockResolvedValue({
      type: 'answer',
      content: { answer: 'Yes' },
      questionCount: 1,
    });

    await request.post('/player-guesses/question').send(payload).expect(200).expect({
      type: 'answer',
      content: { answer: 'Yes' },
      questionCount: 1,
    });

    expect(handlePlayerQuestionMock).toHaveBeenCalledWith(payload.sessionId, payload.userInput);
    // Two calls – user message + model response
    expect(saveConversationMessageMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    { err: new Error('Session not found.'), status: 404 },
    { err: new Error('Session ID and user input are required.'), status: 400 },
  ])('maps %p to HTTP $status', async ({ err, status }) => {
    handlePlayerQuestionMock.mockRejectedValue(err);

    await request.post('/player-guesses/question').send(payload).expect(status);
  });
});

describe('POST /ai-guesses/start', () => {
  const aiStartResponse = {
    sessionId: 'ai1',
    aiResponse: { type: 'question', content: 'Is it an RPG?' },
    questionCount: 1,
  };

  it('starts an AI guesses game and returns first question', async () => {
    startAIGuessesGameMock.mockResolvedValue(aiStartResponse);

    await request.post('/ai-guesses/start').expect(200).expect(aiStartResponse);

    expect(saveConversationMessageMock).toHaveBeenCalledTimes(2); // system + model messages
  });

  it('returns 500 when game start fails', async () => {
    startAIGuessesGameMock.mockRejectedValue(new Error('service down'));

    await request.post('/ai-guesses/start').expect(500);
  });
});

describe('POST /ai-guesses/answer', () => {
  const payload = { sessionId: 'ai1', userAnswer: 'Yes' };

  it('handles user answer and returns next AI response', async () => {
    handleAIAnswerMock.mockResolvedValue({
      aiResponse: { type: 'question', content: 'Next?' },
      questionCount: 2,
    });

    await request.post('/ai-guesses/answer').send(payload).expect(200).expect({
      aiResponse: { type: 'question', content: 'Next?' },
      questionCount: 2,
    });

    expect(handleAIAnswerMock).toHaveBeenCalledWith(payload.sessionId, payload.userAnswer);
    expect(saveConversationMessageMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    { err: new Error('Session not found.'), status: 404 },
    { err: new Error('Session ID and user answer are required.'), status: 400 },
  ])('maps %p to HTTP $status', async ({ err, status }) => {
    handleAIAnswerMock.mockRejectedValue(err);

    await request.post('/ai-guesses/answer').send(payload).expect(status);
  });
});
