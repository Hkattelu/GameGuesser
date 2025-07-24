import { jest, describe, it, beforeEach, expect } from '@jest/globals';

const getDailyGameMock = jest.fn(async () => 'Super Mario');
jest.unstable_mockModule('../dailyGameStore.js', () => ({
  __esModule: true,
  getDailyGame: getDailyGameMock,
}));

// Always declare the guess as correct.
const generateStructuredMock = jest.fn(async (_schema: unknown, _prompt: string) => ({
  type: 'guessResult',
  questionCount: 1,
  content: {
    correct: true,
    response: 'Mock response',
  },
}));

jest.unstable_mockModule('../ai.js', () => ({
  __esModule: true,
  generateStructured: generateStructuredMock,
}));

// Mock external metadata fetch (used only when requesting a hint).
jest.unstable_mockModule('../rawgDetails.js', () => ({
  __esModule: true,
  fetchGameMetadata: jest.fn(async () => ({
    developer: 'Nintendo',
    publisher: 'Nintendo',
    releaseYear: 1985,
  })),
}));

let game: typeof import('../game.js');

beforeEach(async () => {
  jest.clearAllMocks();
  game = await import('../game.js');
  game.clearSessions();
});

describe('Partial scoring and hint usage', () => {
  it('awards 0.5 points for a guess with a hint', async () => {
    const { sessionId } = await game.startPlayerGuessesGame();
    await game.getPlayerGuessHint(sessionId, 'developer');
    const result = await game.handlePlayerQuestion(sessionId, 'Super Mario');

    expect((result.content).score).toBe(0.5);
    expect((result.content).usedHint).toBe(true);
    expect((result.content).correct).toBe(true);
  });

  it('awards 1 point for a guess without a hint', async () => {
    const { sessionId } = await game.startPlayerGuessesGame();
    const result = await game.handlePlayerQuestion(sessionId, 'Super Mario');

    expect((result.content).score).toBe(1);
    expect((result.content).usedHint).toBe(false);
    expect((result.content).correct).toBe(true);
  });
});
