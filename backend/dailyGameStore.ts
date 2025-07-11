import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ------------------------------------------------------------------------------------------------
// Types
// ------------------------------------------------------------------------------------------------

/**
* Mapping of UTC date string (YYYY-MM-DD) ➜ secret game title returned by Gemini.
*/
type DailyGameMap = Record<string, string>;

// ------------------------------------------------------------------------------------------------
// Private constants & helpers
// ------------------------------------------------------------------------------------------------

// Resolve directory of this module in an ESM-compatible way.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
* Location on disk where the daily map is stored.
* Can be overridden via the `DAILY_GAME_FILE_PATH` environment variable so callers can
* mount a persistent volume or point to a temporary directory during tests.
*/
const DATA_FILE: string = process.env.DAILY_GAME_FILE_PATH
  ? path.resolve(process.env.DAILY_GAME_FILE_PATH)
  : path.join(__dirname, 'daily-games.json');

/**
* Lazily initialised in-memory cache. This avoids reading the JSON file on every request.
* Cleared in tests via `_clearCache()`.
*/
let cache: DailyGameMap | null = null;

// ------------------------------------------------------------------------------------------------
// Persistence helpers
// ------------------------------------------------------------------------------------------------

async function loadData(): Promise<DailyGameMap> {
  if (cache) return cache;

  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8');
    cache = JSON.parse(raw) as DailyGameMap;
    return cache;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      cache = {};
      return cache;
    }
    throw err;
  }
}

async function saveData(data: DailyGameMap): Promise<void> {
  cache = data;
  // NOTE: For simplicity we write directly. In production you may want an atomic write.
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function toUtcDateString(date: Date): string {
  // Returns YYYY-MM-DD for the provided date in UTC.
  return date.toISOString().split('T')[0];
}

// ------------------------------------------------------------------------------------------------
// Gemini integration (lazy-loaded to avoid cycles in tests)
// ------------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------
// RAWG integration – we lazily import to avoid increasing startup time and to make it easy to
// inject a Jest mock in unit tests without manually resetting the module cache.
// ---------------------------------------------------------------------------------------------

let _fetchRandomGame:
  | (typeof import('./integrations/rawgApiClient.ts'))['fetchRandomGame']
  | null = null;

async function fetchRandomGameOnce(): Promise<string> {
  if (!_fetchRandomGame) {
    // Dynamic import so Jest can intercept with `unstable_mockModule()`.
    const mod = await import('./integrations/rawgApiClient.ts');
    _fetchRandomGame = mod.fetchRandomGame;
  }

  const gameMeta = await _fetchRandomGame!();
  if (!gameMeta?.name) {
    throw new Error('RAWG did not return a game name.');
  }

  return gameMeta.name;
}

// ------------------------------------------------------------------------------------------------
// Public API
// ------------------------------------------------------------------------------------------------

/**
* Retrieves the secret game for the provided date (UTC).
* If none is stored it will fetch a new title from Gemini, persist it and return it.
*/
export async function getDailyGame(date: Date = new Date()): Promise<string> {
  const dateKey = toUtcDateString(date);
  const data = await loadData();

  if (data[dateKey]) {
    return data[dateKey];
  }

  const secretGame = await fetchRandomGameOnce();
  data[dateKey] = secretGame;
  await saveData(data);
  return secretGame;
}

/**
* Clears the in-memory cache (used in unit tests).
*/
export function _clearCache(): void {
  cache = null;
}

// Exported solely for inspection in tests / debugging.
export const _DATA_FILE = DATA_FILE;
