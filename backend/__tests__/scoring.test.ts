import { describe, it, expect } from '@jest/globals';

import { calculateScore, NEAR_GUESS_THRESHOLD } from '../scoring.js';

describe('calculateScore', () => {
  it('returns 1.0 for an exact (case-insensitive) match', () => {
    expect(calculateScore('Halo', 'halo')).toBe(1);
  });

  it('returns 0.5 for a near miss within the threshold', () => {
    // Make two titles with small edit distance (changes 1 char)
    // "Portal" vs "Portel" differ by 1 char out of 6 (≈0.83 similarity)
    const similarity = 1 - 1 / Math.max('portal'.length, 'portel'.length);
    expect(similarity).toBeGreaterThanOrEqual(NEAR_GUESS_THRESHOLD);

    expect(calculateScore('Portel', 'Portal')).toBe(0.5);
  });

  it('returns 0.0 when similarity is below the threshold', () => {
    expect(calculateScore('Doom', 'Stardew Valley')).toBe(0);
  });
});
