/**
* Lightweight Levenshtein distance implementation optimised for short game
* titles (<100 chars). We keep the algorithm simple (no transposition costs,
* ASCII-only) to avoid extra runtime dependencies.
*/

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const alen = a.length;
  const blen = b.length;

  if (alen === 0) return blen;
  if (blen === 0) return alen;

  // Swap to consume less memory when `b` is shorter.
  if (alen < blen) {
    [a, b] = [b, a];
  }

  const v0: number[] = Array(b.length + 1)
    .fill(0)
    .map((_, i) => i);
  const v1: number[] = new Array(b.length + 1);

  for (let i = 0; i < a.length; i++) {
    v1[0] = i + 1;

    for (let j = 0; j < b.length; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      v1[j + 1] = Math.min(
        v1[j] + 1, // insertion
        v0[j + 1] + 1, // deletion
        v0[j] + cost, // substitution
      );
    }

    // copy v1 to v0 for next iteration
    for (let j = 0; j < v0.length; j++) v0[j] = v1[j];
  }

  return v1[b.length];
}

/**
* A guess is considered "near" when the normalised similarity between the
* player's guess and the correct answer meets or exceeds this threshold. The
* similarity is defined as: `1 - (levenshtein / maxLen)`.
*/
export const NEAR_GUESS_THRESHOLD = 0.8;

/**
* Calculates a numeric score for a guess.
*
* - 1.0 when `guess` exactly matches `answer` (case-insensitive).
* - 0.5 when the similarity score >= `NEAR_GUESS_THRESHOLD`.
* - 0.0 otherwise.
*
* The function performs a case-insensitive comparison and strips common
* punctuation/whitespace to make the matching a little more forgiving without
* relying on heavy NLP libraries.
*/
export function calculateScore(guess: string, answer: string): 1 | 0.5 | 0 {
  const normalise = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '') // remove spaces, punctuation
      .trim();

  const g = normalise(guess);
  const a = normalise(answer);

  if (g === a) return 1;

  const distance = levenshtein(g, a);
  const maxLen = Math.max(g.length, a.length) || 1;
  const similarity = 1 - distance / maxLen;

  return similarity >= NEAR_GUESS_THRESHOLD ? 0.5 : 0;
}

// Exporting the raw `levenshtein` helper is useful for unit testing but it is
// not part of the public API consumed by application code.
export { levenshtein };
