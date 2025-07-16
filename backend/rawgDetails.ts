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

  /**
   * True if the game has at least one officially released title that is a
   * direct narrative sequel (chronologically *after* this game).
   *
   * The value is best-effort – when RAWG returns any game in the same series
   * with a later release date, we treat that as a sequel.
   */
  hasDirectSequel?: boolean;

  /**
   * True if the game has at least one officially released title that is a
   * direct narrative prequel (chronologically *before* this game).
   */
  hasDirectPrequel?: boolean;

  /**
   * True if the game is marketed/labelled as belonging to a broader franchise
   * (for example, **Elder Scrolls Online** is part of *The Elder Scrolls*
   * series even though it lacks a numbered sequel or prequel).
   */
  isBrandedInSeries?: boolean;
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

    // ---------------------------------------------------------------
    // Extra franchise / sequel / prequel detection
    // ---------------------------------------------------------------

    let hasDirectSequel: boolean | undefined;
    let hasDirectPrequel: boolean | undefined;
    let isBrandedInSeries: boolean | undefined;

    try {
      // RAWG exposes a dedicated "game-series" sub-resource that returns all
      // titles belonging to the same franchise. We use it to approximate
      // sequel/prequel information and franchise branding.

      const seriesUrl = new URL(`https://api.rawg.io/api/games/${first.id}/game-series`);
      seriesUrl.searchParams.set('key', apiKey);
      seriesUrl.searchParams.set('page_size', '40'); // max allowed

      const seriesRes = await fetch(seriesUrl);
      if (seriesRes.ok) {
        interface SeriesResp { results: Array<{ released: string | null }>; }
        const seriesJson = (await seriesRes.json()) as SeriesResp;

        const seriesGames = seriesJson?.results ?? [];
        isBrandedInSeries = seriesGames.length > 0;

        if (releaseYear && seriesGames.length) {
          for (const g of seriesGames) {
            if (!g.released) continue;
            const yr = Number(g.released.split('-')[0]);
            if (Number.isNaN(yr)) continue;
            if (yr > releaseYear) hasDirectSequel = true;
            if (yr < releaseYear) hasDirectPrequel = true;
          }
        }
      }
    } catch {
      // Non-fatal – leave the fields undefined when RAWG refuses the request.
    }

    return {
      developer,
      publisher,
      releaseYear: Number.isNaN(releaseYear) ? undefined : releaseYear,
      hasDirectSequel,
      hasDirectPrequel,
      isBrandedInSeries,
    };
  } catch {
    // Network issues or parsing errors – return empty so caller can fall back.
    return {};
  }
}
