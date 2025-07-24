import { jest, describe, it, beforeEach, expect } from '@jest/globals';

// ---------------------------------------------------------------------------
// Stub the AI helper BEFORE importing the module under test so that the
// original implementation never executes network calls.
// ---------------------------------------------------------------------------

let capturedPrompts: string[] = [];

const generateStructuredMock = jest.fn(async (_schema: unknown, prompt: string) => {
  capturedPrompts.push(prompt);
  // Return a minimal shape that satisfies `AIJsonResponseSchema`.
  return {
    type: 'question',
    content: 'Placeholder question?',
    confidence: 5,
  } as any;
});

jest.unstable_mockModule('../ai.js', () => ({
  __esModule: true,
  generateStructured: generateStructuredMock,
}));

// Stubbing RAWG metadata helper to avoid `node-fetch` and network calls.
jest.unstable_mockModule('../rawgDetails.js', () => ({
  __esModule: true,
  fetchGameMetadata: jest.fn(async () => ({})),
}));

// Stubbing daily game store as it pulls in Firestore & RAWG logic.
jest.unstable_mockModule('../dailyGameStore.js', () => ({
  __esModule: true,
  getDailyGame: jest.fn(async () => 'Test Game'),
}));

// ---------------------------------------------------------------------------
// Dynamically import the game module AFTER mocks are registered.
// ---------------------------------------------------------------------------

let startAIGuessesGame: typeof import('../game.js').startAIGuessesGame;
let handleAIAnswer: typeof import('../game.js').handleAIAnswer;

beforeEach(async () => {
  jest.clearAllMocks();
  capturedPrompts = [];

  const gameMod = await import('../game.js');
  startAIGuessesGame = gameMod.startAIGuessesGame;
  handleAIAnswer = gameMod.handleAIAnswer;
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AI-Guesses mode – prompt construction', () => {
  it('builds the correct initial prompt for question #1', async () => {
    await startAIGuessesGame();

    expect(generateStructuredMock).toHaveBeenCalledTimes(1);
    const [initialPrompt] = capturedPrompts;
    expect(initialPrompt).toMatch(/friendly robot playing a "20 Questions" game/i);
    expect(initialPrompt).toMatch(/This is question 1/i);
    expect(initialPrompt).toMatch(/Your response MUST be a JSON object/i);
  });

  it('builds the follow-up prompt that references the user answer and remaining questions', async () => {
    const { sessionId } = await startAIGuessesGame();

    // The second call simulates the user responding "Yes" to the first question.
    await handleAIAnswer(sessionId, 'Yes');

    // Two calls in total: initial + follow-up.
    expect(generateStructuredMock).toHaveBeenCalledTimes(2);

    const [, followUpPrompt] = capturedPrompts;
    expect(followUpPrompt).toMatch(/user just answered \"Yes\"/i);
    expect(followUpPrompt).toMatch(/questions left/iu);
    expect(followUpPrompt).toMatch(/ask your next yes\/no question/i);
  });
});
