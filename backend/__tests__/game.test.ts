import { jest } from '@jest/globals';
import os from 'os';
import path from 'path';
import fs from 'fs';
import type { PlayerGuessSession } from '../game.ts';
import { callGeminiAPI } from '../gemini.ts';

// ---------------------------------------------------------------------------
// Test setup – Mocks and environment variables
// --------------------------------------
jest.mock('../gemini.ts');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daily-game-tests-'));
const dataFilePath = path.join(tmpDir, 'daily-games.json');
process.env.DAILY_GAME_FILE_PATH = dataFilePath;

// Use `await import` to get the mocked versions of the modules.
const {
  startPlayerGuessesGame,
  handlePlayerQuestion,
  startAIGuessesGame,
  handleAIAnswer,
  getSession,
  clearSessions,
} = await import('../game.ts');
const { _clearCache: clearDailyGameCache } = await import(
  '../dailyGameStore.ts'
);

const callGeminiMock = callGeminiAPI as jest.Mock;

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
      callGeminiMock.mockResolvedValue({ secretGame: 'Test Game' });

      const { sessionId } = await startPlayerGuessesGame();

      expect(sessionId).toBeDefined();
      const session = getSession(sessionId!);
      expect((session as PlayerGuessSession).secretGame).toBe('Test Game');

      // Gemini should have been called exactly once to choose the daily game.
      expect(callGeminiMock).toHaveBeenCalledTimes(1);
    });

    it('reuses the same game for multiple sessions on the same day', async () => {
      callGeminiMock.mockResolvedValue({ secretGame: 'Shared Game' });

      const { sessionId: s1 } = await startPlayerGuessesGame();
      const { sessionId: s2 } = await startPlayerGuessesGame();

      const game1 = (getSession(s1!) as PlayerGuessSession).secretGame;
      const game2 = (getSession(s2!) as PlayerGuessSession).secretGame;

      expect(game1).toBe('Shared Game');
      expect(game2).toBe('Shared Game');
      expect(callGeminiMock).toHaveBeenCalledTimes(1);
    });

    it('handles a player question', async () => {
      callGeminiMock.mockResolvedValueOnce({ secretGame: 'Test Game' });
      const { sessionId } = await startPlayerGuessesGame();

      callGeminiMock.mockResolvedValueOnce({ type: 'answer', content: 'Yes' });
      const result = await handlePlayerQuestion(
        sessionId!,
        'Is it a test game?',
      );

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
      callGeminiMock.mockResolvedValue(initialAIResponse);

      const { sessionId, aiResponse, questionCount } =
        await startAIGuessesGame();

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
