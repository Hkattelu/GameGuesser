import { beforeEach, jest } from '@jest/globals';

const callGeminiMock = jest.fn();
const fetchRandomGameMock = jest.fn();
const getDailyGameMock = jest.fn();
const saveDailyGameMock = jest.fn();
const getRecentDailyGamesMock = jest.fn();

// Use unstable_mockModule for ESM mocking
jest.unstable_mockModule('../rawg.ts', () => ({
  __esModule: true,
  fetchRandomGame: fetchRandomGameMock,
}));

jest.unstable_mockModule('../gemini.ts', () => ({
  __esModule: true,
  callGeminiAPI: callGeminiMock,
}));

jest.unstable_mockModule('../db.ts', () => ({
  __esModule: true,
  getDailyGame: getDailyGameMock,
  saveDailyGame: saveDailyGameMock,
  getRecentDailyGames: getRecentDailyGamesMock,
}));

describe('dailyGameStore with RAWG integration', () => {
  let getDailyGame: typeof import('../dailyGameStore.ts').getDailyGame;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Dynamically import the module under test AFTER mocks are set up
    const dailyGameStore = await import('../dailyGameStore.ts');
    getDailyGame = dailyGameStore.getDailyGame;
  });

  it('prefers RAWG result when fetch succeeds', async () => {
    getDailyGameMock.mockResolvedValue(undefined);
    fetchRandomGameMock.mockResolvedValue(Promise.resolve('RAWG Hit'));
    getRecentDailyGamesMock.mockResolvedValue([]);

    const game = await getDailyGame(new Date('2025-03-03T00:00:00Z'));
    expect(game).toBe('RAWG Hit');
    expect(callGeminiMock).not.toHaveBeenCalled();
    expect(saveDailyGameMock).toHaveBeenCalledWith('2025-03-03', 'RAWG Hit');
  });

  it('falls back to Gemini when RAWG fails', async () => {
    getDailyGameMock.mockResolvedValue(undefined);
    fetchRandomGameMock.mockRejectedValue(new Error('network oops'));
    callGeminiMock.mockResolvedValue({ secretGame: 'Gemini Backup' });
    getRecentDailyGamesMock.mockResolvedValue([]);

    const game = await getDailyGame(new Date('2025-04-04T00:00:00Z'));
    expect(game).toBe('Gemini Backup');
    expect(saveDailyGameMock).toHaveBeenCalledWith('2025-04-04', 'Gemini Backup');
  });

  it('returns the stored game if it exists', async () => {
    getDailyGameMock.mockResolvedValue('Stored Game');

    const game = await getDailyGame(new Date('2025-05-05T00:00:00Z'));
    expect(game).toBe('Stored Game');
    expect(fetchRandomGameMock).not.toHaveBeenCalled();
    expect(callGeminiMock).not.toHaveBeenCalled();
    expect(saveDailyGameMock).not.toHaveBeenCalled();
  });
});
