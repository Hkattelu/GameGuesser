import { beforeEach, jest } from '@jest/globals';
import { getDailyGame, TEST_ONLY } from '../dailyGameStore.ts';

const callGeminiMock = jest.fn();
const fetchRandomGameMock = jest.fn();

jest.mock('../rawg.ts', () => ({
  __esModule: true,
  fetchRandomGame: fetchRandomGameMock,
}));

// Do the same for the gemini module.
jest.mock('../gemini.ts', () => ({
  __esModule: true,
  callGeminiAPI: callGeminiMock,
}));


describe('dailyGameStore with RAWG integration', () => {
  beforeEach(() => {
    TEST_ONLY.clearCache();
  });

  it('prefers RAWG result when fetch succeeds', async () => {
    fetchRandomGameMock.mockResolvedValue(Promise.resolve('RAWG Hit'));

    const game = await getDailyGame(new Date('2025-03-03T00:00:00Z'));
    expect(game).toBe('RAWG Hit');
    expect(callGeminiMock).not.toHaveBeenCalled();
  });

  it('falls back to Gemini when RAWG fails', async () => {
    fetchRandomGameMock.mockRejectedValue(new Error('network oops'));
    callGeminiMock.mockResolvedValue({ secretGame: 'Gemini Backup' });

    const game = await getDailyGame(new Date('2025-04-04T00:00:00Z'));
    expect(game).toEqual({ secretGame: 'Gemini Backup' });
  });
});