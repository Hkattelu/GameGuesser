/**
* Lightweight RAWG metadata fetcher.
*
* Given a game title, this helper uses the RAWG "games" search endpoint to
* find the best-matching game and returns a subset of metadata that can be
* used as hints in the Player-Guesses mode.
*
* The RAWG API key must be provided via the `RAWG_API_KEY` environment
* variable, identical to `rawg.ts`.
*/

import fetch from 'node-fetch';

interface Named {
  name: string;
}

interface SearchResponse {
  results: GameMetadata[];
}

interface GameMetadataResponse {
  developers: Named[];
  publishers: Named[];
  released: string;  // YYYY-MM-DD
}

export interface GameMetadata {
  id?: string;
  developer?: string;
  publisher?: string;
  releaseYear?: number;
}

/**
* Fetches developer, publisher and release year for the given game title.
*
* The function performs a best-effort lookup – if the RAWG API is not
* configured or the game cannot be found, it returns an empty object instead
* of throwing so callers can decide how to handle missing data.
*/
export async function fetchGameMetadata(title: string): Promise<GameMetadata> {
  const apiKey = process.env.RAWG_API_KEY;
  if (!apiKey) {
    return {};
  }

  try {
    // Step 1 – search for the game by name. We only need the first result.
    const searchUrl = new URL('https://api.rawg.io/api/games');
    searchUrl.searchParams.set('key', apiKey);
    searchUrl.searchParams.set('search', title);
    searchUrl.searchParams.set('page_size', '1');

    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) throw new Error(`RAWG search failed: ${searchRes.status}`);


    const searchJson = (await searchRes.json()) as SearchResponse;
    const first = searchJson?.results?.[0];
    if (!first) return {};

    // Step 2 – fetch full details to get developers/publishers
    const detailUrl = new URL(`https://api.rawg.io/api/games/${first.id}`);
    detailUrl.searchParams.set('key', apiKey);

    const detailRes = await fetch(detailUrl);
    if (!detailRes.ok) throw new Error(`RAWG detail failed: ${detailRes.status}`);

    const detailJson = (await detailRes.json()) as GameMetadataResponse;

    const developer: string | undefined = detailJson?.developers?.[0]?.name;
    const publisher: string | undefined = detailJson?.publishers?.[0]?.name;
    const released: string | undefined = detailJson?.released;
    const releaseYear = released ? Number(released.split('-')[0]) : undefined;

    return {
      developer,
      publisher,
      releaseYear: Number.isNaN(releaseYear) ? undefined : releaseYear,
    };
  } catch {
    // Network issues or parsing errors – return empty so caller can fall back.
    return {};
  }
}
