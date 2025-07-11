/**
* RAWG API client.
*
* Encapsulates HTTP calls to the RAWG Video Games Database API.
* Documentation: https://api.rawg.io/docs
*
* This module exports a single `fetchRandomGame` function that retrieves a
* randomly-selected game name from RAWG. The implementation intentionally keeps
* the logic simple and relies on RAWG’s popularity ordering combined with a
* random page/element pick – it does **not** attempt to exhaustively randomize
* over the full 500k game catalogue because that would require additional
* API calls to discover the total number of pages. This trade-off is perfectly
* acceptable for the "daily secret game" use-case.
*
* The module expects a `RAWG_API_KEY` environment variable to be present. If it
* is missing, `fetchRandomGame()` throws synchronously so callers can decide
* whether to fall back to alternative logic.
*/

// ------------------------------------------------------------------------------------------------
// Types & helpers – kept minimal on purpose to avoid pulling in extra deps.
// ------------------------------------------------------------------------------------------------

/**
* Partial shape of RAWG’s `/games` list response we care about.
* {@link https://api.rawg.io/docs#operation/games_list}
*/
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
/**
* @typedef {Object} RawgGamesListResponse
* @property {{id: number, name: string, slug: string, released?: string|null}[]} results
*/

/**
* Picks a random integer between `min` (inclusive) and `max` (inclusive).
*/
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ------------------------------------------------------------------------------------------------
// Public API
// ------------------------------------------------------------------------------------------------

/**
* Fetches the name of a random game from RAWG.
*
* Strategy:
*   1. Choose a random page between 1 and 20 (RAWG caps `page_size` at 40).
*      The first ~800 games *by popularity* gives us enough variety for daily
*      play without hammering the API.
*   2. Request that page with a `page_size` of 40.
*   3. Pick a random item from the returned `results` array.
*
* The function throws when:
*   - `RAWG_API_KEY` env var is missing.
*   - Network error / non-2xx status.
*   - The response JSON is missing the expected shape or contains no results.
*
* @returns {Promise<string>} Name of the randomly selected game.
*/
export async function fetchRandomGame() {
  const apiKey = process.env.RAWG_API_KEY;
  if (!apiKey) {
    throw new Error('RAWG_API_KEY environment variable is required.');
  }

  // RAWG allows max page_size=40. We randomly select among the first 20 pages
  // (800 games) which is a good balance of variety vs request overhead.
  const page = randomInt(1, 20);
  const pageSize = 40;

  const url = new URL('https://api.rawg.io/api/games');
  url.searchParams.set('key', apiKey);
  url.searchParams.set('page', String(page));
  url.searchParams.set('page_size', String(pageSize));
  // Order by "-added" (games added most by RAWG users) to get a broad popular
  // list that spans eras and genres.
  url.searchParams.set('ordering', '-added');

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`RAWG API request failed with status ${res.status}`);
  }

  /** @type {RawgGamesListResponse} */
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const data = await res.json();
  if (!data?.results?.length) {
    throw new Error('RAWG API response contained no games.');
  }

  const game = data.results[randomInt(0, data.results.length - 1)];
  return game.name;
}
