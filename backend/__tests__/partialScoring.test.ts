import { jest, describe, it, beforeEach, expect } from '@jest/globals';

// ----------------------------- Module mocks -----------------------------

// 1. Mock the daily game store so we can control the secret game.
const getDailyGameMock = jest.fn(async () => 'Super Mario');
jest.unstable_mockModule('../dailyGameStore.js', () => ({
  __esModule: true,
  getDailyGame: getDailyGameMock,
}));

// 2. Mock the structured generation helper so we can bypass the LLM call. We
//    only care that the object looks like a guessResult – the backend will
//    enrich it with score + hint metadata afterwards.
const generateStructuredMock = jest.fn(async (_schema: unknown, _prompt: string) => ({
  type: 'guessResult',
  questionCount: 1,
  content: {
    correct: false,
    response: 'Mock response',
  },
}));

jest.unstable_mockModule('../ai.js', () => ({
  __esModule: true,
  generateStructured: generateStructuredMock,
}));

// 3. Mock external metadata fetch (used only when requesting a hint).
jest.unstable_mockModule('../rawgDetails.js', () => ({
  __esModule: true,
  fetchGameMetadata: jest.fn(async () => ({
    developer: 'Nintendo',
    publisher: 'Nintendo',
    releaseYear: 1985,
  })),
}));

// ----------------------------- Test setup -----------------------------

let game: typeof import('../game.js');

beforeEach(async () => {
  jest.clearAllMocks();
  game = await import('../game.js');
  // Ensure sessions are isolated between tests.
  game.clearSessions();
});

describe('Partial scoring and hint usage', () => {
  it('awards 0.5 points for a near-correct guess', async () => {
    const { sessionId } = await game.startPlayerGuessesGame();

    const guessInput = 'Super Marlo'; // Levenshtein distance 1 → close guess
    const result = await game.handlePlayerQuestion(sessionId, guessInput);

    if (result.type !== 'guessResult') {
      throw new Error('Expected a guessResult');
    }

    expect((result.content as any).score).toBe(0.5);
    expect((result.content as any).usedHint).toBe(false);
    expect((result.content as any).correct).toBe(false);
  });

  it('propagates usedHint flag when a hint was requested', async () => {
    const { sessionId } = await game.startPlayerGuessesGame();

    // Simulate the player requesting a hint before guessing.
    await game.getPlayerGuessHint(sessionId);

    const guessInput = 'Super Mario';
    const result = await game.handlePlayerQuestion(sessionId, guessInput);

    if (result.type !== 'guessResult') {
      throw new Error('Expected a guessResult');
    }

    expect((result.content as any).score).toBe(1);
    expect((result.content as any).usedHint).toBe(true);
    expect((result.content as any).correct).toBe(true);
  });
});
