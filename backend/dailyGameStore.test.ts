import { jest } from '@jest/globals';
import os from 'os';
import path from 'path';
import fs from 'fs';

// ------------------------------------------------------------------------------------------
// Test helpers – point the store at a tmp directory so tests never touch the real filesystem.
// ------------------------------------------------------------------------------------------

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daily-game-store-'));
const dataFilePath = path.join(tmpDir, 'daily-games.json');
process.env.DAILY_GAME_FILE_PATH = dataFilePath;

// Tell Jest to use the manual mock for Gemini.
jest.unstable_mockModule('./gemini.js', () => ({
  callGeminiAPI: jest.fn(),
}));

// Dynamically import after the mock + env var so the module picks them up.
const { callGeminiAPI } = await import('./gemini.js');
const callGeminiMock = callGeminiAPI as jest.Mock<any>;
const { getDailyGame, _clearCache } = await import('./dailyGameStore.ts');

describe('dailyGameStore', () => {
  beforeEach(() => {
    _clearCache();
    jest.clearAllMocks();
    if (fs.existsSync(dataFilePath)) {
      fs.unlinkSync(dataFilePath);
    }
  });

  it('creates and persists a new record when none exists', async () => {
    callGeminiMock.mockResolvedValueOnce({ secretGame: 'Persisted Game' });

    const game = await getDailyGame(new Date('2025-01-01T12:00:00Z'));

    expect(game).toBe('Persisted Game');
    expect(callGeminiMock).toHaveBeenCalledTimes(1);

    const stored = JSON.parse(fs.readFileSync(dataFilePath, 'utf-8'));
    expect(stored['2025-01-01']).toBe('Persisted Game');
  });

  it('returns the same game for multiple calls on the same date', async () => {
    callGeminiMock.mockResolvedValueOnce({ secretGame: 'Shared Game' });

    const date = new Date('2025-02-02T00:00:00Z');

    const first = await getDailyGame(date);
    const second = await getDailyGame(date);

    expect(first).toBe('Shared Game');
    expect(second).toBe('Shared Game');
    expect(callGeminiMock).toHaveBeenCalledTimes(1);
  });
});
