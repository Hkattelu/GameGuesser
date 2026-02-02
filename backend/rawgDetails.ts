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
import { createHash } from 'node:crypto';
import * as dbModule from './db.js';

interface Named {
  name: string;
}

interface SearchResponse {
  results: Array<{ id: number }>;
}

interface GameMetadataResponse {
  developers: Named[];
  publishers: Named[];
  platforms: { platform: Named }[];
  released: string;  // YYYY-MM-DD
}

export interface GameMetadata {
  id?: string;
  developer?: string;
  platform?: string;
  publisher?: string;
  releaseYear?: number;
  special?: string;
}

const metadataCache = new Map<string, GameMetadata>();

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

function metadataDocId(title: string): string {
  return createHash('sha256').update(normalizeTitle(title)).digest('hex');
}

function getFirestore() {
  return (dbModule as any).getFirestoreInstance();
}

/**
* Fetches developer, publisher and release year for the given game title.
*
* The function performs a best-effort lookup – if the RAWG API is not
* configured or the game cannot be found, it returns an empty object instead
* of throwing so callers can decide how to handle missing data.
*/
export async function fetchGameMetadata(title: string): Promise<GameMetadata> {
  const cacheKey = normalizeTitle(title);
  const docId = metadataDocId(title);

  // 1. Check in-memory cache
  const cached = metadataCache.get(cacheKey);
  if (cached) return cached;

  // 2. Check Firestore cache
  try {
    const doc = await getFirestore().collection('metadata').doc(docId).get();
    if (doc.exists) {
      const data = doc.data() as GameMetadata;
      metadataCache.set(cacheKey, data);
      return data;
    }
  } catch (err) {
    // Ignore cache read errors
  }

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
    const platform: string | undefined = detailJson?.platforms?.[0]?.platform?.name;
    const released: string | undefined = detailJson?.released;
    const releaseYear = released ? Number(released.split('-')[0]) : undefined;

    const result: GameMetadata = {
      developer,
      platform,
      publisher,
      releaseYear: Number.isNaN(releaseYear) ? undefined : releaseYear,
    };

    // 3. Save to caches
    metadataCache.set(cacheKey, result);
    try {
      await getFirestore().collection('metadata').doc(docId).set(result);
    } catch (err) {
      // Ignore cache write errors
    }

    return result;
  } catch (err) {
    // Network issues or parsing errors – log a warning so we have visibility
    // in staging/production without crashing the request handler.
    if (process.env.NODE_ENV !== 'test') {
      console.warn('[rawgDetails] Failed to fetch metadata:', err);
    }

    // Return empty so callers can gracefully handle missing data.
    return {};
  }
}

/**
* Explicitly saves metadata to both in-memory and Firestore caches.
* Useful for attaching AI-generated hints to the cached record.
*/
export async function saveMetadata(title: string, metadata: GameMetadata): Promise<void> {
  const cacheKey = normalizeTitle(title);
  const docId = metadataDocId(title);

  metadataCache.set(cacheKey, metadata);
  try {
    await getFirestore().collection('metadata').doc(docId).set(metadata);
  } catch (err) {
    // Ignore cache write errors
  }
}
