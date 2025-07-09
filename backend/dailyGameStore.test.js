import { jest } from '@jest/globals';
import os from 'os';
import path from 'path';
import fs from 'fs';

// Provide an independent tmp file for the store.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daily-game-store-'));
const dataFilePath = path.join(tmpDir, 'daily-games.json');
process.env.DAILY_GAME_FILE_PATH = dataFilePath;

jest.unstable_mockModule('./gemini.js', () => ({
  callGeminiAPI: jest.fn(),
}));

const { callGeminiAPI } = await import('./gemini.js');
const { getDailyGame, _clearCache } = await import('./dailyGameStore.js');

describe('dailyGameStore', () => {
  beforeEach(() => {
    _clearCache();
    jest.clearAllMocks();
    if (fs.existsSync(dataFilePath)) {
      fs.unlinkSync(dataFilePath);
    }
  });

  it('creates and persists a new record when none exists', async () => {
    callGeminiAPI.mockResolvedValueOnce({ secretGame: 'Persisted Game' });

    const game = await getDailyGame(new Date('2025-01-01T12:00:00Z'));

    expect(game).toBe('Persisted Game');
    expect(callGeminiAPI).toHaveBeenCalledTimes(1);

    // After the call, the file should exist with the persisted data.
    const stored = JSON.parse(fs.readFileSync(dataFilePath, 'utf-8'));
    expect(stored['2025-01-01']).toBe('Persisted Game');
  });

  it('returns the same game for multiple calls on the same date', async () => {
    callGeminiAPI.mockResolvedValueOnce({ secretGame: 'Shared Game' });

    const date = new Date('2025-02-02T00:00:00Z');

    const first = await getDailyGame(date);
    const second = await getDailyGame(date);

    expect(first).toBe('Shared Game');
    expect(second).toBe('Shared Game');
    // Gemini should only have been called once.
    expect(callGeminiAPI).toHaveBeenCalledTimes(1);
  });
});
