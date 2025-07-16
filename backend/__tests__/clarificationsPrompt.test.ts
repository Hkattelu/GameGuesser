import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// ---------------------------------------------------------------------------
// Mock external modules before importing the code under test
// ---------------------------------------------------------------------------

// 1. Daily game store – deterministic title
const getDailyGameMock = jest.fn(async () => 'Elder Scrolls Online');
jest.unstable_mockModule('../dailyGameStore.js', () => ({
  __esModule: true,
  getDailyGame: getDailyGameMock,
}));

// 2. RAWG metadata fetcher – basic metadata only (no series flags)
const mockMetadata = {
  developer: 'ZeniMax Online Studios',
  publisher: 'Bethesda Softworks',
  releaseYear: 2014,
};
const fetchGameMetadataMock = jest.fn(async () => mockMetadata);
jest.unstable_mockModule('../rawgDetails.js', () => ({
  __esModule: true,
  fetchGameMetadata: fetchGameMetadataMock,
}));

// 3. AI generation – we capture the prompt and return a synthetic answer
let capturedPrompt: string | undefined;
const aiResponse = {
  type: 'answer',
  questionCount: 1,
  content: {
    answer: 'No',
    clarification: "It doesn't have a direct sequel or prequel, but it is branded as part of a series.",
  },
};
const generateStructuredMock = jest.fn(async (_schema: unknown, prompt: string) => {
  capturedPrompt = prompt;
  return aiResponse;
});
jest.unstable_mockModule('../ai.js', () => ({
  __esModule: true,
  generateStructured: generateStructuredMock,
}));

// ---------------------------------------------------------------------------
// Import the module under test AFTER mocks are in place
// ---------------------------------------------------------------------------
let startPlayerGuessesGame: typeof import('../game.js').startPlayerGuessesGame;
let handlePlayerQuestion: typeof import('../game.js').handlePlayerQuestion;

beforeEach(async () => {
  jest.clearAllMocks();
  capturedPrompt = undefined;

  const gameModule = await import('../game.js');
  startPlayerGuessesGame = gameModule.startPlayerGuessesGame;
  handlePlayerQuestion = gameModule.handlePlayerQuestion;
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Player-Guesses – prompt-based clarification', () => {
  it('includes clarification instructions in the prompt and relies on the model', async () => {
    const { sessionId } = await startPlayerGuessesGame();

    const question = 'Is the game part of a series?';
    const response = await handlePlayerQuestion(sessionId, question);

    // The returned response is whatever the mocked AI produced.
    expect(response).toEqual(aiResponse);

    // The AI helper should have been called once.
    expect(generateStructuredMock).toHaveBeenCalledTimes(1);

    // Prompt should contain the instruction about appending a clarification.
    expect(capturedPrompt).toBeDefined();
    expect(capturedPrompt!).toMatch(/content\.clarification/i);

    // RAWG metadata is not required for clarification anymore – ensure we do
    // not hit RAWG in this flow.
    expect(fetchGameMetadataMock).not.toHaveBeenCalled();
  });
});
