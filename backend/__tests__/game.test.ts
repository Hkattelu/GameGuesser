import { jest } from '@jest/globals';

const callGeminiMock = jest.fn();
const fetchRandomGameMock = jest.fn();
const getDailyGameDbMock = jest.fn(); // Mock for db.ts's getDailyGame
const saveDailyGameDbMock = jest.fn(); // Mock for db.ts's saveDailyGame
const getRecentDailyGamesDbMock = jest.fn(); // Mock for db.ts's getRecentDailyGames
const getDailyGameStoreMock = jest.fn(); // Mock for dailyGameStore.ts's getDailyGame

// Use unstable_mockModule for ESM mocking
jest.unstable_mockModule('../rawg.ts', () => ({
  __esModule: true,
  fetchRandomGame: fetchRandomGameMock,
}));

jest.unstable_mockModule('../gemini.ts', () => ({
  __esModule: true,
  callGeminiAPI: callGeminiMock,
}));

jest.unstable_mockModule('../db.ts', () => ({
  __esModule: true,
  getDailyGame: getDailyGameDbMock,
  saveDailyGame: saveDailyGameDbMock,
  getRecentDailyGames: getRecentDailyGamesDbMock,
}));

jest.unstable_mockModule('../dailyGameStore.ts', () => ({
  __esModule: true,
  getDailyGame: getDailyGameStoreMock,
}));

describe('Game Logic with Daily Game system', () => {
  let startPlayerGuessesGame: typeof import('../game.ts').startPlayerGuessesGame;
  let handlePlayerQuestion: typeof import('../game.ts').handlePlayerQuestion;
  let startAIGuessesGame: typeof import('../game.ts').startAIGuessesGame;
  let handleAIAnswer: typeof import('../game.ts').handleAIAnswer;
  let getSession: typeof import('../game.ts').getSession;
  let clearSessions: typeof import('../game.ts').clearSessions;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Dynamically import the module under test AFTER mocks are set up
    const gameModule = await import('../game.ts');
    startPlayerGuessesGame = gameModule.startPlayerGuessesGame;
    handlePlayerQuestion = gameModule.handlePlayerQuestion;
    startAIGuessesGame = gameModule.startAIGuessesGame;
    handleAIAnswer = gameModule.handleAIAnswer;
    getSession = gameModule.getSession;
    clearSessions = gameModule.clearSessions;

    // Set a default mock for getDailyGame for game.ts tests
    getDailyGameStoreMock.mockResolvedValue('Mocked Daily Game');

    // Set a default mock for callGeminiAPI to avoid unexpected behavior
    callGeminiMock.mockResolvedValue({ type: 'question', content: 'Default Gemini Question' });

    clearSessions();
  });

  describe('Player Guesses Game', () => {
    it('starts a new session using the daily secret game', async () => {
      const { sessionId } = await startPlayerGuessesGame();

      expect(sessionId).toBeDefined();
      const session = getSession(sessionId!);
      expect((session as PlayerGuessSession).secretGame).toBe('Mocked Daily Game');

      expect(callGeminiMock).not.toHaveBeenCalled();
    });

    it('reuses the same game for multiple sessions on the same day', async () => {
      const { sessionId: s1 } = await startPlayerGuessesGame();
      const { sessionId: s2 } = await startPlayerGuessesGame();

      const game1 = (getSession(s1!) as PlayerGuessSession).secretGame;
      const game2 = (getSession(s2!) as PlayerGuessSession).secretGame;

      expect(game1).toBe('Mocked Daily Game');
      expect(game2).toBe('Mocked Daily Game');
      expect(callGeminiMock).not.toHaveBeenCalled();
    });

    it('handles a player question', async () => {
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

  describe('AI Guesses Game', () => {
    it('starts a new AI game', async () => {
      const initialAIResponse = { type: 'question', content: 'Is it an RPG?' };
      callGeminiMock.mockResolvedValueOnce(initialAIResponse);

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
