import { jest } from '@jest/globals';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { callGeminiAPI } from '../gemini.ts';
import { fetchRandomGame } from '../rawg.ts';

// ---------------------------------------------------------------------------
// Test setup – Mocks and environment variables
// ---------------------------------------------------------------------------
jest.mock('../gemini.ts', () => ({
  __esModule: true, // This is crucial for mocking ES modules
  callGeminiAPI: jest.fn(),
}));

// Mock the rawg module
jest.mock('../rawg.ts', () => ({
  __esModule: true, // This is crucial for mocking ES modules
  fetchRandomGame: jest.fn(),
}));

const callGeminiMock = callGeminiAPI as jest.Mock;
const fetchRandomGameMock = fetchRandomGame as jest.Mock;

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daily-game-store-'));
const dataFilePath = path.join(tmpDir, 'daily-games.json');
process.env.DAILY_GAME_FILE_PATH = dataFilePath;

// Use `await import` to get the mocked versions of the modules.
const { getDailyGame, _clearCache } = await import('../dailyGameStore.ts');


describe('dailyGameStore with RAWG integration', () => {
  beforeEach(() => {
    _clearCache();
    jest.clearAllMocks();
    if (fs.existsSync(dataFilePath)) {
      fs.unlinkSync(dataFilePath);
    }
  });

  it('prefers RAWG result when fetch succeeds', async () => {
    fetchRandomGameMock.mockResolvedValue('RAWG Hit');

    const game = await getDailyGame(new Date('2025-03-03T00:00:00Z'));

    expect(game).toBe('RAWG Hit');
    expect(fetchRandomGameMock).toHaveBeenCalledTimes(1);
    expect(callGeminiMock).not.toHaveBeenCalled();

    const stored = JSON.parse(fs.readFileSync(dataFilePath, 'utf-8'));
    expect(stored['2025-03-03']).toBe('RAWG Hit');
  });

  it('falls back to Gemini when RAWG fails', async () => {
    fetchRandomGameMock.mockRejectedValue(new Error('network oops'));
    callGeminiMock.mockResolvedValue({ secretGame: 'Gemini Backup' });

    const game = await getDailyGame(new Date('2025-04-04T00:00:00Z'));

    expect(game).toBe('Gemini Backup');
    expect(fetchRandomGameMock).toHaveBeenCalledTimes(1);
    expect(callGeminiMock).toHaveBeenCalledTimes(1);
  });
});
