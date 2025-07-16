import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// ---- Mock all external dependencies BEFORE importing the module under test ----

// 1. Daily game store returns a deterministic title so we can craft metadata.
const getDailyGameMock = jest.fn(async () => 'Elder Scrolls Online');
jest.unstable_mockModule('../dailyGameStore.js', () => ({
  __esModule: true,
  getDailyGame: getDailyGameMock,
}));

// 2. AI generation is never executed in this unit – but we stub it defensively.
jest.unstable_mockModule('../ai.js', () => ({
  __esModule: true,
  generateStructured: jest.fn(),
}));

// 3. RAWG metadata fetcher supplies the enriched franchise fields.
const mockMetadata = {
  developer: 'ZeniMax Online Studios',
  publisher: 'Bethesda Softworks',
  releaseYear: 2014,
  hasDirectSequel: false,
  hasDirectPrequel: false,
  isBrandedInSeries: true,
};

const fetchGameMetadataMock = jest.fn(async () => mockMetadata);
jest.unstable_mockModule('../rawgDetails.js', () => ({
  __esModule: true,
  fetchGameMetadata: fetchGameMetadataMock,
  GameMetadata: {},
}));

// Import the module under test *after* mocks are in place.
let startPlayerGuessesGame: typeof import('../game.js').startPlayerGuessesGame;
let handlePlayerQuestion: typeof import('../game.js').handlePlayerQuestion;

beforeEach(async () => {
  jest.clearAllMocks();
  const gameModule = await import('../game.js');
  startPlayerGuessesGame = gameModule.startPlayerGuessesGame;
  handlePlayerQuestion = gameModule.handlePlayerQuestion;
});

describe('Player-Guesses – clarification support', () => {
  it('adds a clarification when the user asks if the game is part of a series', async () => {
    // Start a new session so we have a predictable sessionId.
    const { sessionId } = await startPlayerGuessesGame();

    const question = 'Is the game part of a series?';
    const response = await handlePlayerQuestion(sessionId, question);

    expect(response).toEqual({
      type: 'answer',
      questionCount: 1,
      content: 'No - It doesn\'t have a direct sequel or prequel, but it is branded as part of a series.',
    });

    // RAWG metadata should be fetched exactly once.
    expect(fetchGameMetadataMock).toHaveBeenCalledWith('Elder Scrolls Online');
  });
});
