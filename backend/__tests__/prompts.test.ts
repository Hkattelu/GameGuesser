import { describe, it, expect } from '@jest/globals';

import {
  SECRET_GAME_PICK_PROMPT,
  PLAYER_QA_WITH_CLASSIFICATION_PROMPT,
  AI_GUESS_INITIAL_PROMPT,
} from '../prompts.js';

describe('Prompt templates', () => {
  it('SECRET_GAME_PICK_PROMPT interpolates the exclusion list', () => {
    const prompt = SECRET_GAME_PICK_PROMPT(['Halo', 'Portal']);

    // Should list the exclusions joined by commas.
    expect(prompt).toMatch(/Halo,Portal/);

    // Must instruct the model to return strict JSON.
    expect(prompt).toMatch(/Your response MUST be a JSON object/i);
  });

  it('PLAYER_QA_WITH_CLASSIFICATION_PROMPT embeds the user input and secret game', () => {
    const prompt = PLAYER_QA_WITH_CLASSIFICATION_PROMPT('Is it an RPG?', 'Final Fantasy VII');

    expect(prompt).toMatch(/Is it an RPG\?/);
    expect(prompt).toMatch(/Final Fantasy VII/);

    // Should describe both possible JSON shapes.
    expect(prompt).toMatch(/"type": "answer"/);
    expect(prompt).toMatch(/"type": "guessResult"/);
    expect(prompt).toMatch(/"confidence": <1-10>/);
  });

  it('AI_GUESS_INITIAL_PROMPT references the question budget', () => {
    const prompt = AI_GUESS_INITIAL_PROMPT(20);
    expect(prompt).toMatch(/20 Questions/i);
    expect(prompt).toMatch(/Total questions: 20/);
  });
});
