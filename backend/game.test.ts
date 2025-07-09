// @ts-nocheck
// C:\Users\himan\code\game-guessr\backend\game.test.js
import {jest} from '@jest/globals';

jest.unstable_mockModule('./gemini.ts', () => ({
    callGeminiAPI: jest.fn(),
}));

const { callGeminiAPI } = await import('./gemini.ts');
// Cast to jest.Mock for TypeScript
const mockCallGeminiAPI = callGeminiAPI as jest.Mock;
const {
    startPlayerGuessesGame,
    handlePlayerQuestion,
    startAIGuessesGame,
    handleAIAnswer,
    getSession,
    clearSessions
} = await import('./game.ts');


describe('Game Logic', () => {
    beforeEach(() => {
        clearSessions();
        jest.clearAllMocks();
    });

    describe('Player Guesses Game', () => {
        it('should start a new game', async () => {
            mockCallGeminiAPI.mockResolvedValue({ secretGame: 'Test Game' });
            const { sessionId } = await startPlayerGuessesGame();
            expect(sessionId).toBeDefined();
            const session = getSession(sessionId);
            expect(session.secretGame).toBe('Test Game');
        });

        it('should handle a player question', async () => {
            mockCallGeminiAPI.mockResolvedValueOnce({ secretGame: 'Test Game' });
            const { sessionId } = await startPlayerGuessesGame();

            mockCallGeminiAPI.mockResolvedValueOnce({ type: 'answer', content: 'Yes' });
            const result = await handlePlayerQuestion(sessionId, 'Is it a test game?');

            expect(result.type).toBe('answer');
            expect(result.content).toBe('Yes');
            expect(result.questionCount).toBe(1);
        });
    });

    describe('AI Guesses Game', () => {
        it('should start a new AI game', async () => {
            const aiResponse = { type: 'question', content: 'Is it a test game?' };
            mockCallGeminiAPI.mockResolvedValue(aiResponse);
            const { sessionId, aiResponse: initialResponse, questionCount } = await startAIGuessesGame();

            expect(sessionId).toBeDefined();
            expect(initialResponse).toEqual(aiResponse);
            expect(questionCount).toBe(1);
            const session = getSession(sessionId);
            expect(session.questionCount).toBe(1);
        });

        it('should handle a user answer', async () => {
            const startResponse = { type: 'question', content: 'Is it a test game?' };
            mockCallGeminiAPI.mockResolvedValueOnce(startResponse);
            const { sessionId } = await startAIGuessesGame();

            const nextResponse = { type: 'question', content: 'Is it a new game?' };
            mockCallGeminiAPI.mockResolvedValueOnce(nextResponse);
            const result = await handleAIAnswer(sessionId, 'Yes');

            expect(result.aiResponse).toEqual(nextResponse);
            expect(result.questionCount).toBe(2);
        });
    });
});
