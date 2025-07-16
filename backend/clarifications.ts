/**
* Clarification utilities for the *player-guesses* game flow.
*
* At certain times an otherwise binary **yes/no** answer can confuse the
* player.  For example, when they ask *“Is the game part of a series?”* and the
* secret title is *The Elder Scrolls Online* the truthful answer is a nuanced
* **yes** – the game is branded under *The Elder Scrolls* franchise – yet it
* also does **not** have a direct numbered sequel or prequel. Returning a bare
* "Yes" easily leads the player down the wrong track.
*
* This helper detects such cases and returns an explanatory clarification
* string that replaces the plain yes/no.  The logic intentionally stays
* lightweight and **never leaks the actual game title**.
*/

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
* Returns a clarification string when the given `userInput` requires it for
* the `secretGame`. When no special handling is needed it returns `null` so
* callers can fall back to the regular yes/no flow.
*
* Currently only one category is implemented – *series affiliation*.
*/
export function getClarification(secretGame: string, userInput: string): string | null {
  // 1. Is the player asking about series/franchise membership at all?
  if (!isSeriesQuestion(userInput)) return null;

  // 2. Does the hidden title look like a spin-off / side entry without an
  //     obvious numeric sequel indicator?
  if (!needsSeriesAffiliationClarification(secretGame)) return null;

  // 3. Return the standardized clarification text.  Keep it short and avoid
  //    mentioning anything that could identify the game.
  return "It's branded as part of a series but has no direct sequels or prequels.";
}

// ---------------------------------------------------------------------------
// Internals (helpers)
// ---------------------------------------------------------------------------

/** Case-insensitive regex that catches common phrasings around series/franchise questions. */
const SERIES_REGEX = /(series|franchise)/i;

function isSeriesQuestion(input: string): boolean {
  return SERIES_REGEX.test(input);
}

/**
* We approximate “spinoff that sits in a franchise but has no numbered sequel”
* with two simple heuristics:
*
*   1. The title **does not** contain an explicit sequel number or Roman
*      numeral ("2", "III", "XIV", …).
*   2. The title **does** include a well-known *subtitle keyword* that often
*      denotes spin-offs ("Online", "Origins", "Legends", …).
*
* This is intentionally heuristic – it is *good enough* for the handful of
* problematic cases highlighted by play-testing while keeping the
* implementation dependency-free.
*/
const ROMAN_NUMERALS = [
  ' ii',
  ' iii',
  ' iv',
  ' v',
  ' vi',
  ' vii',
  ' viii',
  ' ix',
  ' x',
  ' xi',
  ' xii',
  ' xiii',
  ' xiv',
  ' xv',
  ' xvi',
];

const SUBTITLE_KEYWORDS = [
  'online',
  'legends',
  'origins',
  'chronicles',
  'story',
  'stories',
  'tactics',
  'odyssey',
  'valhalla',
  'anniversary',
  'definitive',
];

function needsSeriesAffiliationClarification(title: string): boolean {
  const lower = title.toLowerCase();

  // (a) Skip if the game clearly advertises itself as a numbered sequel.
  if (/[0-9]+/.test(lower)) return false;
  if (ROMAN_NUMERALS.some((roman) => lower.includes(roman))) return false;

  // (b) Trigger clarification when a spin-off subtitle keyword is present.
  return SUBTITLE_KEYWORDS.some((kw) => lower.includes(kw));
}
