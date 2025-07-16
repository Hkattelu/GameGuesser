import { jest, beforeEach, describe, it, expect } from '@jest/globals';

// Stub collaborators BEFORE importing the module under test. We must use
// `jest.unstable_mockModule` because `dailyGameStore.ts` is ESM.

const fetchRandomGameMock = jest.fn();
const generateStructuredMock = jest.fn();
const getDailyGameDbMock = jest.fn();
const saveDailyGameDbMock = jest.fn();
const getRecentDailyGamesDbMock = jest.fn();

jest.unstable_mockModule('../rawg.js', () => ({
  __esModule: true,
  fetchRandomGame: fetchRandomGameMock,
}));


jest.unstable_mockModule('../ai.js', () => ({
  __esModule: true,
  generateStructured: generateStructuredMock,
}));

jest.unstable_mockModule('../db.js', () => ({
  __esModule: true,
  getDailyGame: getDailyGameDbMock,
  saveDailyGame: saveDailyGameDbMock,
  getRecentDailyGames: getRecentDailyGamesDbMock,
}));

let getDailyGame: typeof import('../dailyGameStore.ts').getDailyGame;

beforeEach(async () => {
  jest.clearAllMocks();

  // Dynamically import after mocks are in place
  ({ getDailyGame } = await import('../dailyGameStore.ts'));
});

describe('dailyGameStore', () => {
  const date = new Date('2025-06-06T00:00:00Z');
  const dateKey = '2025-06-06';

  it('returns cached game when present in DB', async () => {
    getDailyGameDbMock.mockResolvedValue('Stored Game');

    const result = await getDailyGame(date);

    expect(result).toBe('Stored Game');
    expect(fetchRandomGameMock).not.toHaveBeenCalled();
    expect(generateStructuredMock).not.toHaveBeenCalled();
    expect(saveDailyGameDbMock).not.toHaveBeenCalled();
  });

  it('prefers RAWG when available', async () => {
    getDailyGameDbMock.mockResolvedValue(undefined);
    getRecentDailyGamesDbMock.mockResolvedValue([]);

    fetchRandomGameMock.mockResolvedValue('RAWG Hit');

    const result = await getDailyGame(date);

    expect(result).toBe('RAWG Hit');
    expect(fetchRandomGameMock).toHaveBeenCalledTimes(1);
    expect(generateStructuredMock).not.toHaveBeenCalled();
    expect(saveDailyGameDbMock).toHaveBeenCalledWith(dateKey, 'RAWG Hit');
  });

  it('falls back to Gemini when RAWG fails', async () => {
    getDailyGameDbMock.mockResolvedValue(undefined);
    getRecentDailyGamesDbMock.mockResolvedValue([]);

    fetchRandomGameMock.mockRejectedValue(new Error('RAWG down'));
    generateStructuredMock.mockResolvedValue({ secretGame: 'Gemini Game' });

    const result = await getDailyGame(date);

    expect(result).toBe('Gemini Game');
    expect(fetchRandomGameMock).toHaveBeenCalled();
    expect(generateStructuredMock).toHaveBeenCalled();
    expect(saveDailyGameDbMock).toHaveBeenCalledWith(dateKey, 'Gemini Game');
  });
});
