import { jest } from '@jest/globals';
import os from 'os';
import path from 'path';
import fs from 'fs';

// ---------------------------------------------------------------------------
// Test setup – isolate the daily games file so test runs are deterministic.
// ---------------------------------------------------------------------------

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daily-game-tests-'));
const dataFilePath = path.join(tmpDir, 'daily-games.json');
process.env.DAILY_GAME_FILE_PATH = dataFilePath;

// Tell Jest to use the manual mock for Gemini.
jest.unstable_mockModule('./gemini.js', () => ({
  callGeminiAPI: jest.fn(),
}));

// Mock the RAWG client so we can control the daily-game selection deterministically.
jest.unstable_mockModule('./integrations/rawgApiClient.ts', () => ({
  fetchRandomGame: jest.fn(),
}));

// Dynamic imports AFTER the mock & env var so modules pick them up.
const { callGeminiAPI } = await import('./gemini.js');
const callGeminiMock = callGeminiAPI as jest.Mock<any>;

// RAWG mock import (must come AFTER the mockModule call)
const { fetchRandomGame } = await import('./integrations/rawgApiClient.ts');
const fetchRandomGameMock = fetchRandomGame as jest.Mock<any>;
const {
  startPlayerGuessesGame,
  handlePlayerQuestion,
  startAIGuessesGame,
  handleAIAnswer,
  getSession,
  clearSessions,
} = await import('./game.ts');

// Allow clearing the store cache between tests.
const { _clearCache: clearDailyGameCache } = await import('./dailyGameStore.ts');

describe('Game Logic with Daily Game system', () => {
  beforeEach(() => {
    clearSessions();
    clearDailyGameCache();
    jest.clearAllMocks();
    if (fs.existsSync(dataFilePath)) {
      fs.unlinkSync(dataFilePath);
    }
  });

  // -----------------------------------------------------------------------
  // Player-Guesses mode (Wordle-style daily secret game)
  // -----------------------------------------------------------------------

  describe('Player Guesses Game', () => {
    it('starts a new session using the daily secret game', async () => {
      fetchRandomGameMock.mockResolvedValueOnce({ id: 1, name: 'Test Game', releaseDate: '2025-01-01' });

      const { sessionId } = await startPlayerGuessesGame();

      expect(sessionId).toBeDefined();
      const session = getSession(sessionId!);
      expect((session as any).secretGame).toBe('Test Game');

      // RAWG client should have been called exactly once to choose the daily game.
      expect(fetchRandomGameMock).toHaveBeenCalledTimes(1);
    });

    it('reuses the same game for multiple sessions on the same day', async () => {
      fetchRandomGameMock.mockResolvedValueOnce({ id: 2, name: 'Shared Game', releaseDate: '2025-02-02' });

      const { sessionId: s1 } = await startPlayerGuessesGame();
      const { sessionId: s2 } = await startPlayerGuessesGame();

      const game1 = (getSession(s1!) as any).secretGame;
      const game2 = (getSession(s2!) as any).secretGame;

      expect(game1).toBe('Shared Game');
      expect(game2).toBe('Shared Game');
      expect(fetchRandomGameMock).toHaveBeenCalledTimes(1);
    });

    it('handles a player question', async () => {
      fetchRandomGameMock.mockResolvedValueOnce({ id: 3, name: 'Test Game', releaseDate: '2025-03-03' });
      const { sessionId } = await startPlayerGuessesGame();

      callGeminiMock.mockResolvedValueOnce({ type: 'answer', content: 'Yes' });
      const result = await handlePlayerQuestion(sessionId!, 'Is it a test game?');

      expect(result.type).toBe('answer');
      expect(result.content).toBe('Yes');
      expect(result.questionCount).toBe(1);
    });
  });

  // -----------------------------------------------------------------------
  // AI-Guesses mode (unchanged by the daily system)
  // -----------------------------------------------------------------------

  describe('AI Guesses Game (unchanged by daily system)', () => {
    it('starts a new AI game', async () => {
      const initialAIResponse = { type: 'question', content: 'Is it an RPG?' };
      callGeminiMock.mockResolvedValueOnce(initialAIResponse);

      const { sessionId, aiResponse, questionCount } = await startAIGuessesGame();

      expect(sessionId).toBeDefined();
      expect(aiResponse).toEqual(initialAIResponse);
      expect(questionCount).toBe(1);
      const session = getSession(sessionId!);
      expect((session as any).questionCount).toBe(1);
    });

    it('handles a user answer', async () => {
      const startResponse = { type: 'question', content: 'Is it a test game?' };
      callGeminiMock.mockResolvedValueOnce(startResponse);
      const { sessionId } = await startAIGuessesGame();

      const nextResponse = { type: 'question', content: 'Is it a new game?' };
      callGeminiMock.mockResolvedValueOnce(nextResponse);

      const result = await handleAIAnswer(sessionId!, 'Yes');

      expect(result.aiResponse).toEqual(nextResponse);
      expect(result.questionCount).toBe(2);
    });
  });
});
