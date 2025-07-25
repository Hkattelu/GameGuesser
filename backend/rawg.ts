/**
* RAWG API client.
*
* Encapsulates HTTP calls to the RAWG Video Games Database API.
* Documentation: https://api.rawg.io/docs
*
* This module exports a single `fetchRandomGame` function that retrieves a
* randomly-selected game name from RAWG.
*
* The module expects a `RAWG_API_KEY` environment variable to be present. If it
* is missing, `fetchRandomGame()` throws synchronously so callers can decide
* whether to fall back to alternative logic.
*/

interface Game {
  id: number;
  name: string;
  slug: string;
};

interface RawgGameDetails {
  id: number;
  name: string;
  background_image: string | null;
  metacritic: number | null;
  stores: Array<{ store: { name: string; domain: string } }>;
  description_raw: string;
  website: string;
}

/**
* Partial shape of RAWG’s `/games` list response we care about.
* {@link https://api.rawg.io/docs#operation/games_list}
*/
interface RawgGamesListResponse {
  results: Game[];
};

/**
* Fetches detailed information for a game by its name from RAWG.
*
* @param {string} gameName - The name of the game to search for.
* @returns {Promise<RawgGameDetails | null>} Detailed game information or null if not found.
*/
export async function fetchGameDetailsByName(gameName: string): Promise<RawgGameDetails | null> {
  const apiKey = process.env.RAWG_API_KEY;
  if (!apiKey) {
    throw new Error('RAWG_API_KEY environment variable is required.');
  }

  try {
    // Step 1: Search for the game by name to get its ID
    const searchUrl = new URL('https://api.rawg.io/api/games');
    searchUrl.searchParams.set('key', apiKey);
    searchUrl.searchParams.set('search', gameName);
    searchUrl.searchParams.set('page_size', '1');

    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) {
      throw new Error(`RAWG search failed with status ${searchRes.status}`);
    }

    const searchData = await searchRes.json() as { results: Game[] };
    if (!searchData.results || searchData.results.length === 0) {
      return null; // Game not found
    }

    const gameId = searchData.results[0].id;

    // Step 2: Fetch full details using the game ID
    const detailsUrl = new URL(`https://api.rawg.io/api/games/${gameId}`);
    detailsUrl.searchParams.set('key', apiKey);

    const detailsRes = await fetch(detailsUrl);
    if (!detailsRes.ok) {
      throw new Error(`RAWG details fetch failed with status ${detailsRes.status}`);
    }

    const gameDetails = await detailsRes.json() as RawgGameDetails;
    return gameDetails;

  } catch (error) {
    console.error('Error fetching game details from RAWG:', error);
    return null;
  }
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

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

  const data = await res.json() as RawgGamesListResponse;
  if (!data?.results?.length) {
    throw new Error('RAWG API response contained no games.');
  }

  const game = data.results[randomInt(0, data.results.length - 1)];
  return game.name;
}
