import { jest, beforeEach, describe, it, expect, beforeAll } from '@jest/globals';

// ---------------------- Mocks ----------------------
const callGeminiMock = jest.fn();
const fetchRandomGameMock = jest.fn();
const getDailyGameDbMock = jest.fn();
const saveDailyGameDbMock = jest.fn();
const getRecentDailyGamesDbMock = jest.fn();

// Use ESM-aware mocking so we can import the module-under-test after stubs are ready
jest.unstable_mockModule('../rawg.js', () => ({
  __esModule: true,
  fetchRandomGame: fetchRandomGameMock,
}));

jest.unstable_mockModule('../gemini.js', () => ({
  __esModule: true,
  callGeminiAPI: callGeminiMock,
}));

jest.unstable_mockModule('../db.js', () => ({
  __esModule: true,
  getDailyGame: getDailyGameDbMock,
  saveDailyGame: saveDailyGameDbMock,
  getRecentDailyGames: getRecentDailyGamesDbMock,
}));

// ---------------------- Imports ----------------------
let getDailyGame: typeof import('../dailyGameStore.ts').getDailyGame;

beforeAll(async () => {
  const mod = await import('../dailyGameStore.ts');
  getDailyGame = mod.getDailyGame;
});

// ---------------------- Tests ----------------------

describe('dailyGameStore with RAWG integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('prefers RAWG result when fetch succeeds', async () => {
    getDailyGameDbMock.mockResolvedValue(undefined);
    fetchRandomGameMock.mockResolvedValue('RAWG Hit');
    getRecentDailyGamesDbMock.mockResolvedValue([]);

    const game = await getDailyGame(new Date('2025-03-03T00:00:00Z'));
    expect(game).toBe('RAWG Hit');
    expect(callGeminiMock).not.toHaveBeenCalled();
    expect(saveDailyGameDbMock).toHaveBeenCalledWith('2025-03-03', 'RAWG Hit');
  });

  it('falls back to Gemini when RAWG fails', async () => {
    getDailyGameDbMock.mockResolvedValue(undefined);
    fetchRandomGameMock.mockRejectedValue(new Error('network oops'));
    callGeminiMock.mockResolvedValue({ secretGame: 'Gemini Backup' });
    getRecentDailyGamesDbMock.mockResolvedValue([]);

    const game = await getDailyGame(new Date('2025-04-04T00:00:00Z'));
    expect(game).toBe('Gemini Backup');
    expect(saveDailyGameDbMock).toHaveBeenCalledWith('2025-04-04', 'Gemini Backup');
  });

  it('returns the stored game if it exists', async () => {
    getDailyGameDbMock.mockResolvedValue('Stored Game');

    const game = await getDailyGame(new Date('2025-05-05T00:00:00Z'));
    expect(game).toBe('Stored Game');
    expect(fetchRandomGameMock).not.toHaveBeenCalled();
    expect(callGeminiMock).not.toHaveBeenCalled();
    expect(saveDailyGameDbMock).not.toHaveBeenCalled();
  });
});
