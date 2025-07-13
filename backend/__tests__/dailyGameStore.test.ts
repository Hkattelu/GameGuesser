import { beforeEach, jest } from '@jest/globals';
import { getDailyGame } from '../dailyGameStore.ts';

const callGeminiMock = jest.fn();
const fetchRandomGameMock = jest.fn();
const getDailyGameMock = jest.fn();
const saveDailyGameMock = jest.fn();
const getRecentDailyGamesMock = jest.fn();

jest.mock('../rawg.js', () => ({
  __esModule: true,
  fetchRandomGame: fetchRandomGameMock,
}));

jest.mock('../gemini.js', () => ({
  __esModule: true,
  callGeminiAPI: callGeminiMock,
}));

jest.mock('../db.js', () => ({
  __esModule: true,
  getDailyGame: getDailyGameMock,
  saveDailyGame: saveDailyGameMock,
  getRecentDailyGames: getRecentDailyGamesMock,
}));

describe('dailyGameStore with RAWG integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('prefers RAWG result when fetch succeeds', async () => {
    getDailyGameMock.mockResolvedValue(undefined);
    fetchRandomGameMock.mockResolvedValue('RAWG Hit');
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
