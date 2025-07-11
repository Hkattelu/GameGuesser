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

// Tell Jest to use the manual mock for the RAWG client instead of the real network call.
jest.unstable_mockModule('./integrations/rawgApiClient.ts', () => ({
  fetchRandomGame: jest.fn(),
}));

// Dynamic import AFTER the mock & env var so the module picks them up.
const { fetchRandomGame } = await import('./integrations/rawgApiClient.ts');
const fetchRandomGameMock = fetchRandomGame as jest.Mock<any>;
const { getDailyGame, _clearCache } = await import('./dailyGameStore.ts');

describe('dailyGameStore (RAWG-powered)', () => {
  beforeEach(() => {
    _clearCache();
    jest.clearAllMocks();
    if (fs.existsSync(dataFilePath)) {
      fs.unlinkSync(dataFilePath);
    }
  });

  it('creates and persists a new record when none exists', async () => {
    fetchRandomGameMock.mockResolvedValueOnce({ id: 1, name: 'Persisted Game', releaseDate: '2025-01-01' });

    const game = await getDailyGame(new Date('2025-01-01T12:00:00Z'));

    expect(game).toBe('Persisted Game');
    expect(fetchRandomGameMock).toHaveBeenCalledTimes(1);

    const stored = JSON.parse(fs.readFileSync(dataFilePath, 'utf-8'));
    expect(stored['2025-01-01']).toBe('Persisted Game');
  });

  it('returns the same game for multiple calls on the same date', async () => {
    fetchRandomGameMock.mockResolvedValueOnce({ id: 2, name: 'Shared Game', releaseDate: '2025-02-02' });

    const date = new Date('2025-02-02T00:00:00Z');

    const first = await getDailyGame(date);
    const second = await getDailyGame(date);

    expect(first).toBe('Shared Game');
    expect(second).toBe('Shared Game');
    expect(fetchRandomGameMock).toHaveBeenCalledTimes(1);
  });
});
