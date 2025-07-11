import { jest } from '@jest/globals';
import os from 'os';
import path from 'path';
import fs from 'fs';

// ---------------------------------------------------------------------------
// Test helpers – isolate FS interactions & set env vars *before* module load.
// ---------------------------------------------------------------------------

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daily-game-store-'));
const dataFilePath = path.join(tmpDir, 'daily-games.json');
process.env.DAILY_GAME_FILE_PATH = dataFilePath;

// RAWG key (dummy) so the module attempts RAWG first when we want it to.
process.env.RAWG_API_KEY = 'test-rawg-key';

// Tell Jest to use manual mocks for the external services.
jest.unstable_mockModule('./gemini.js', () => ({
  callGeminiAPI: jest.fn(),
}));

jest.unstable_mockModule('./rawg.js', () => ({
  fetchRandomGame: jest.fn(),
}));

// Dynamically import after mocks + env var so dailyGameStore picks them up.
const { callGeminiAPI } = await import('./gemini.js');
const { fetchRandomGame } = await import('./rawg.js');

const callGeminiMock = callGeminiAPI as jest.Mock<any>;
const fetchRandomGameMock = fetchRandomGame as jest.Mock<any>;

const { getDailyGame, _clearCache } = await import('./dailyGameStore.ts');

describe('dailyGameStore with RAWG integration', () => {
  beforeEach(() => {
    _clearCache();
    jest.clearAllMocks();
    if (fs.existsSync(dataFilePath)) {
      fs.unlinkSync(dataFilePath);
    }
  });

  it('prefers RAWG result when fetch succeeds', async () => {
    fetchRandomGameMock.mockResolvedValueOnce('RAWG Hit');

    const game = await getDailyGame(new Date('2025-03-03T00:00:00Z'));

    expect(game).toBe('RAWG Hit');
    expect(fetchRandomGameMock).toHaveBeenCalledTimes(1);
    expect(callGeminiMock).not.toHaveBeenCalled();

    const stored = JSON.parse(fs.readFileSync(dataFilePath, 'utf-8'));
    expect(stored['2025-03-03']).toBe('RAWG Hit');
  });

  it('falls back to Gemini when RAWG fails', async () => {
    fetchRandomGameMock.mockRejectedValueOnce(new Error('network oops'));
    callGeminiMock.mockResolvedValueOnce({ secretGame: 'Gemini Backup' });

    const game = await getDailyGame(new Date('2025-04-04T00:00:00Z'));

    expect(game).toBe('Gemini Backup');
    expect(fetchRandomGameMock).toHaveBeenCalledTimes(1);
    expect(callGeminiMock).toHaveBeenCalledTimes(1);
  });
});
