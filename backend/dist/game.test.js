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
// Mock Gemini so we have full control over responses.
jest.unstable_mockModule('./gemini.js', () => ({
    callGeminiAPI: jest.fn(),
}));
// Dynamic imports AFTER the mock & env var so modules pick them up.
const { callGeminiAPI } = await import('./gemini.js');
const callGeminiMock = callGeminiAPI;
const { startPlayerGuessesGame, handlePlayerQuestion, startAIGuessesGame, handleAIAnswer, getSession, clearSessions, } = await import('./game.js');
// Allow clearing the store cache between tests.
const { _clearCache: clearDailyGameCache } = await import('./dailyGameStore.js');
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
            callGeminiMock.mockResolvedValueOnce({ secretGame: 'Test Game' });
            const { sessionId } = await startPlayerGuessesGame();
            expect(sessionId).toBeDefined();
            const session = getSession(sessionId);
            expect(session.secretGame).toBe('Test Game');
            // Gemini should have been called exactly once to choose the daily game.
            expect(callGeminiMock).toHaveBeenCalledTimes(1);
        });
        it('reuses the same game for multiple sessions on the same day', async () => {
            callGeminiMock.mockResolvedValueOnce({ secretGame: 'Shared Game' });
            const { sessionId: s1 } = await startPlayerGuessesGame();
            const { sessionId: s2 } = await startPlayerGuessesGame();
            const game1 = getSession(s1).secretGame;
            const game2 = getSession(s2).secretGame;
            expect(game1).toBe('Shared Game');
            expect(game2).toBe('Shared Game');
            expect(callGeminiMock).toHaveBeenCalledTimes(1);
        });
        it('handles a player question', async () => {
            callGeminiMock.mockResolvedValueOnce({ secretGame: 'Test Game' });
            const { sessionId } = await startPlayerGuessesGame();
            callGeminiMock.mockResolvedValueOnce({ type: 'answer', content: 'Yes' });
            const result = await handlePlayerQuestion(sessionId, 'Is it a test game?');
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
            const session = getSession(sessionId);
            expect(session.questionCount).toBe(1);
        });
        it('handles a user answer', async () => {
            const startResponse = { type: 'question', content: 'Is it a test game?' };
            callGeminiMock.mockResolvedValueOnce(startResponse);
            const { sessionId } = await startAIGuessesGame();
            const nextResponse = { type: 'question', content: 'Is it a new game?' };
            callGeminiMock.mockResolvedValueOnce(nextResponse);
            const result = await handleAIAnswer(sessionId, 'Yes');
            expect(result.aiResponse).toEqual(nextResponse);
            expect(result.questionCount).toBe(2);
        });
    });
});
