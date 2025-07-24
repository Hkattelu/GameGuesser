import { jest, beforeEach, describe, it, expect } from '@jest/globals';

// Mocks for dependencies
const fetchGameMetadataMock = jest.fn();
const generateStructuredMock = jest.fn();
const getDailyGameDbMock = jest.fn();
const saveDailyGameDbMock = jest.fn();
const getRecentDailyGamesDbMock = jest.fn();

jest.unstable_mockModule('../rawgDetails.js', () => ({
  __esModule: true,
  fetchGameMetadata: fetchGameMetadataMock,
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

let getPlayerGuessHint: typeof import('../game.js').getPlayerGuessHint;
let startPlayerGuessesGame: typeof import('../game.js').startPlayerGuessesGame;
let sessionId: string;

beforeEach(async () => {
  jest.clearAllMocks();

  // Always return a unique game for each test to avoid cache issues
  getDailyGameDbMock.mockResolvedValue(undefined);
  getRecentDailyGamesDbMock.mockResolvedValue([]);
  saveDailyGameDbMock.mockResolvedValue(undefined);

  // Use a unique secret game for each test
  const secretGame = 'Test Game ' + Math.random();
  fetchGameMetadataMock.mockResolvedValue({}); // Default to no metadata

  // Import after all mocks are in place
  const mod = await import('../game.js');
  getPlayerGuessHint = mod.getPlayerGuessHint;
  startPlayerGuessesGame = mod.startPlayerGuessesGame;

  // Patch getDailyGame to always return our unique secret game
  getDailyGameDbMock.mockResolvedValueOnce(undefined);
  saveDailyGameDbMock.mockResolvedValueOnce(undefined);

  // Patch fetchGameMetadata to return empty unless overridden in a test
  fetchGameMetadataMock.mockResolvedValue({});

  // Use the public API to create a session
  const { sessionId: sid } = await startPlayerGuessesGame();
  sessionId = sid;
});

describe('getPlayerGuessHint', () => {
  it('returns a special hint from the model', async () => {
    generateStructuredMock.mockResolvedValue({ special: 'This is a subtle hint.' });

    const result = await getPlayerGuessHint(sessionId, 'special');
    expect(result).toEqual({ hintType: 'special', hintText: 'This is a subtle hint.' });
    expect(generateStructuredMock).toHaveBeenCalled();
  });

  it('returns developer, publisher, or releaseYear hints if requested', async () => {
    fetchGameMetadataMock.mockResolvedValue({
      developer: 'Test Dev',
      publisher: 'Test Pub',
      releaseYear: 2000,
    });
    generateStructuredMock.mockResolvedValue({ special: 'irrelevant' });

    const devHint = await getPlayerGuessHint(sessionId, 'developer');
    expect(devHint.hintType).toBe('developer');
    expect(devHint.hintText).toBe('Test Dev');

    const pubHint = await getPlayerGuessHint(sessionId, 'publisher');
    expect(pubHint.hintType).toBe('publisher');
    expect(pubHint.hintText).toBe('Test Pub');

    const yearHint = await getPlayerGuessHint(sessionId, 'releaseYear');
    expect(yearHint.hintType).toBe('releaseYear');
    expect(yearHint.hintText).toBe('2000');
  });

  it('throws if no session is found', async () => {
    await expect(getPlayerGuessHint('bad-session', 'special')).rejects.toThrow('Session not found.');
  });

  it('throws if no hint data is available', async () => {
    // Ensure fetchGameMetadata returns no metadata and the LLM returns nothing
    fetchGameMetadataMock.mockResolvedValue({});
    generateStructuredMock.mockResolvedValue({});
    await expect(getPlayerGuessHint(sessionId, 'developer')).rejects.toThrow('No hint data available');
  });
});
