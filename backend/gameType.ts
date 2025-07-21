/**
* Centralised `gameType` domain model.
*
* Having a single authoritative definition avoids the drift that happens when
* each module defines its own `'player-guesses' | 'ai-guesses'` union and the
* matching runtime validation logic. Import this helper anywhere you need to
* reference the game type literals or validate an untrusted string.
*/

/** The only two game modes currently supported by the backend. */
export const gameTypes = ['player-guesses', 'ai-guesses'] as const;

/**
* Type derived from the `gameTypes` tuple. Equivalent to
* `'player-guesses' | 'ai-guesses'` but guaranteed to stay in sync with the
* runtime value.
*/
export type GameType = typeof gameTypes[number];

/**
* Runtime type-guard that verifies a string is one of the supported
* `gameType` literals.
*/
export function isValidGameType(t: string): t is GameType {
  // Cast to a plain readonly array of strings so TS recognises the built-in
  // `includes()` signature available in Node 18+.
  return (gameTypes as readonly string[]).includes(t);
}
