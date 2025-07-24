import { jest } from '@jest/globals';

// Capture a reference for resetting later
const generateStructuredMock = jest.fn();

// Mock the AI helper *before* importing the game module (ESM mocking rule).
jest.unstable_mockModule('../ai.js', () => ({
  __esModule: true,
  generateStructured: generateStructuredMock,
}));

describe('handlePlayerQuestion – error handling', () => {
  let startPlayerGuessesGame: typeof import('../game.js').startPlayerGuessesGame;
  let handlePlayerQuestion: typeof import('../game.js').handlePlayerQuestion;
  let getSession: typeof import('../game.js').getSession;

  beforeAll(async () => {
    const gameMod = await import('../game.js');
    startPlayerGuessesGame = gameMod.startPlayerGuessesGame;
    handlePlayerQuestion = gameMod.handlePlayerQuestion;
    getSession = gameMod.getSession;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('does not increment question count when generateStructured throws', async () => {
    // Arrange – create a fresh session
    const { sessionId } = await startPlayerGuessesGame();

    // Force the AI call to fail
    generateStructuredMock.mockRejectedValueOnce(new Error('Model offline'));

    // Act – invoke the question handler and catch the error
    await expect(
      handlePlayerQuestion(sessionId, 'Is it an RTS?'),
    ).rejects.toThrow('Model offline');

    // Assert – session questionCount remains 0
    const session = getSession(sessionId) as any;
    expect(session.questionCount).toBe(0);
  });
});
