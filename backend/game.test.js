jest.mock('./gemini.ts', () => ({
  callGeminiAPI: jest.fn(),
}));

const { callGeminiAPI } = require('./gemini.ts');
const {
  startPlayerGuessesGame,
  handlePlayerQuestion,
  startAIGuessesGame,
  handleAIAnswer,
  getSession,
  clearSessions,
} = require('./game.ts');

describe('Game Logic', () => {
  beforeEach(() => {
    clearSessions();
    jest.clearAllMocks();
  });

  describe('Player Guesses Game', () => {
    it('starts a new game and stores session state', async () => {
      callGeminiAPI.mockResolvedValue({ secretGame: 'Test Game' });

      const { sessionId } = await startPlayerGuessesGame();
      expect(sessionId).toBeDefined();

      const session = getSession(sessionId);
      expect(session?.secretGame).toBe('Test Game');
    });

    it('handles a player question turn', async () => {
      callGeminiAPI.mockResolvedValueOnce({ secretGame: 'Test Game' });
      const { sessionId } = await startPlayerGuessesGame();

      callGeminiAPI.mockResolvedValueOnce({ type: 'answer', content: 'Yes' });
      const result = await handlePlayerQuestion(sessionId, 'Is it a test game?');

      expect(result).toEqual({ type: 'answer', content: 'Yes', questionCount: 1 });
    });
  });

  describe('AI Guesses Game', () => {
    it('starts a new AI game', async () => {
      const aiResponse = { type: 'question', content: 'Is it a test game?' };
      callGeminiAPI.mockResolvedValue(aiResponse);

      const { sessionId, aiResponse: initialResponse, questionCount } = await startAIGuessesGame();

      expect(sessionId).toBeDefined();
      expect(initialResponse).toEqual(aiResponse);
      expect(questionCount).toBe(1);
    });

    it('handles a user answer and increments question count', async () => {
      const startResponse = { type: 'question', content: 'Is it a test game?' };
      callGeminiAPI.mockResolvedValueOnce(startResponse);
      const { sessionId } = await startAIGuessesGame();

      const nextResponse = { type: 'question', content: 'Is it a new game?' };
      callGeminiAPI.mockResolvedValueOnce(nextResponse);

      const result = await handleAIAnswer(sessionId, 'Yes');

      expect(result).toEqual({ aiResponse: nextResponse, questionCount: 2 });
    });
  });
});
