/**
* Lightweight RAWG API client responsible for fetching a single random game.
*
* RAWG API docs: https://api.rawg.io/docs
*
* The implementation purposefully keeps the surface area tiny – we only expose
* `fetchRandomGame()` which returns a minimal subset of metadata required by
* the daily-game flow:
*   - id            RAWG numeric game identifier
*   - name          Human-readable game title
*   - releaseDate   ISO date string (or null) of the original release
*
* NOTE:
* 1. RAWG caps the maximum `page_size` at 40. We request the minimum (1) to
*    avoid unnecessary payload.
* 2. We perform two lightweight requests:
*      a) `/games?page_size=1`  – gets the global game `count` so we can pick a
*         truly random offset.
*      b) `/games?page=<n>&page_size=1` – fetches the specific game.
*
*    This is slightly slower than approximating, but the JSON payload is tiny
*    (~2–3 KB each) and it guarantees uniform distribution without maintaining
*    server-side state.
* 3. The `RAWG_API_KEY` **must** be set in the environment. Consumers should
*    inject a dummy value and mock the module during tests to avoid network
*    calls.
*/

const BASE_URL = 'https://api.rawg.io/api';

export interface GameMeta {
  id: number;
  name: string;
  releaseDate: string | null;
}

/**
* Fetches a single random game from RAWG.
*
* @throws If the API key is missing or the network request fails.
*/
export async function fetchRandomGame(): Promise<GameMeta> {
  const API_KEY = process.env.RAWG_API_KEY;
  if (!API_KEY) {
    throw new Error('RAWG_API_KEY environment variable is not set.');
  }

  // ------------------------------------------------------------------------------------------
  // 1. Fetch the global count so we know the valid offset range.
  // ------------------------------------------------------------------------------------------
  const countRes = await fetch(`${BASE_URL}/games?key=${encodeURIComponent(API_KEY)}&page_size=1`);
  if (!countRes.ok) {
    throw new Error(`RAWG count request failed with status ${countRes.status}`);
  }
  type CountResponse = { count: number };
  const countJson = (await countRes.json()) as CountResponse;
  if (typeof countJson.count !== 'number' || countJson.count === 0) {
    throw new Error('RAWG returned an unexpected count');
  }

  const maxIndex = countJson.count - 1;
  const randomIndex = Math.floor(Math.random() * (maxIndex + 1));

  // RAWG pagination is 20 items per page by default. But since we explicitly
  // set `page_size=1` we can map the absolute index directly to the page by
  // adding 1 (pages are 1-based) and ignoring the modulo.
  const page = randomIndex + 1;

  // ------------------------------------------------------------------------------------------
  // 2. Fetch the concrete game at the random offset.
  // ------------------------------------------------------------------------------------------
  const gameRes = await fetch(
    `${BASE_URL}/games?key=${encodeURIComponent(API_KEY)}&page_size=1&page=${page}`,
  );
  if (!gameRes.ok) {
    throw new Error(`RAWG game request failed with status ${gameRes.status}`);
  }

  type GamesResponse = {
    results: Array<{ id: number; name: string; released: string | null }>;
  };
  const gamesJson = (await gameRes.json()) as GamesResponse;
  const game = gamesJson.results?.[0];
  if (!game) {
    throw new Error('RAWG returned an empty results array');
  }

  return {
    id: game.id,
    name: game.name,
    releaseDate: game.released ?? null,
  };
}
