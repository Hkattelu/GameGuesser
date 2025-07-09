import { jest } from '@jest/globals';
import os from 'os';
import path from 'path';
import fs from 'fs';

// Dynamically create an isolated tmp file for the DAILY_GAME_FILE_PATH so each
// test run is fully deterministic and does not touch the repo.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daily-game-tests-'));
const dataFilePath = path.join(tmpDir, 'daily-games.json');

// Must be set before the modules under test are imported so they pick up the
// overridden location.
process.env.DAILY_GAME_FILE_PATH = dataFilePath;

// Mock Gemini so the tests are independent of the external API.
jest.unstable_mockModule('./gemini.js', () => ({
  callGeminiAPI: jest.fn(),
}));

// Now we can import modules under test (they will pick up the env override and mock).
const { callGeminiAPI } = await import('./gemini.js');
const {
  startPlayerGuessesGame,
  handlePlayerQuestion,
  startAIGuessesGame,
  handleAIAnswer,
  getSession,
  clearSessions,
} = await import('./game.js');
const { _clearCache: clearDailyGameCache } = await import('./dailyGameStore.js');


describe('Game Logic with Daily Game system', () => {
  beforeEach(() => {
    clearSessions();
    clearDailyGameCache();
    jest.clearAllMocks();
    // Ensure the tmp data file starts empty for each test.
    if (fs.existsSync(dataFilePath)) {
      fs.unlinkSync(dataFilePath);
    }
  });

  describe('Player Guesses Game', () => {
    it('starts a new session using the daily secret game', async () => {
      callGeminiAPI.mockResolvedValueOnce({ secretGame: 'Test Game' });

      const { sessionId } = await startPlayerGuessesGame();

      expect(sessionId).toBeDefined();
      const session = getSession(sessionId);
      expect(session.secretGame).toBe('Test Game');

      // Gemini should have been called exactly once to choose the daily game.
      expect(callGeminiAPI).toHaveBeenCalledTimes(1);
    });

    it('reuses the same game for multiple sessions on the same day', async () => {
      // First session triggers Gemini to pick the game.
      callGeminiAPI.mockResolvedValueOnce({ secretGame: 'Shared Game' });

      const { sessionId: s1 } = await startPlayerGuessesGame();
      const { sessionId: s2 } = await startPlayerGuessesGame();

      const game1 = getSession(s1).secretGame;
      const game2 = getSession(s2).secretGame;

      expect(game1).toBe('Shared Game');
      expect(game2).toBe('Shared Game');
      // Gemini should only have been called once even though we started two sessions.
      expect(callGeminiAPI).toHaveBeenCalledTimes(1);
    });

    it('handles a player question', async () => {
      // First call: choose daily game
      callGeminiAPI.mockResolvedValueOnce({ secretGame: 'Test Game' });
      const { sessionId } = await startPlayerGuessesGame();

      // Second call: answer the player question
      callGeminiAPI.mockResolvedValueOnce({ type: 'answer', content: 'Yes' });

      const result = await handlePlayerQuestion(sessionId, 'Is it a test game?');

      expect(result.type).toBe('answer');
      expect(result.content).toBe('Yes');
      expect(result.questionCount).toBe(1);
    });
  });

  describe('AI Guesses Game (unchanged by daily system)', () => {
    it('starts a new AI game', async () => {
      const initialAIResponse = { type: 'question', content: 'Is it an RPG?' };
      callGeminiAPI.mockResolvedValueOnce(initialAIResponse);

      const { sessionId, aiResponse, questionCount } = await startAIGuessesGame();

      expect(sessionId).toBeDefined();
      expect(aiResponse).toEqual(initialAIResponse);
      expect(questionCount).toBe(1);
      const session = getSession(sessionId);
      expect(session.questionCount).toBe(1);
    });

    it('handles a user answer', async () => {
      // Start game
      const startResponse = { type: 'question', content: 'Is it a test game?' };
      callGeminiAPI.mockResolvedValueOnce(startResponse);
      const { sessionId } = await startAIGuessesGame();

      // Next question
      const nextResponse = { type: 'question', content: 'Is it a new game?' };
      callGeminiAPI.mockResolvedValueOnce(nextResponse);

      const result = await handleAIAnswer(sessionId, 'Yes');

      expect(result.aiResponse).toEqual(nextResponse);
      expect(result.questionCount).toBe(2);
    });
  });
});
