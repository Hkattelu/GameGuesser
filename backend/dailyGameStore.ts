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

let _callGeminiAPI: (<T = unknown>(prompt: string) => Promise<T>) | null = null;

// RAWG lazy import to avoid cost when disabled or during tests.
let _fetchRandomGame: (() => Promise<string>) | null = null;

async function callGeminiOnce(): Promise<string> {
  if (!_callGeminiAPI) {
    const mod = await import('./gemini.js');
    _callGeminiAPI = mod.callGeminiAPI;
  }

  const prompt =
    'Pick a random, well-known video game title. Your response MUST be a JSON object of the form {"secretGame": "<Title>"}.';

  const jsonResponse = await _callGeminiAPI<{ secretGame: string }>(prompt);
  const secretGame = jsonResponse?.secretGame;
  if (!secretGame) {
    throw new Error('Gemini did not return a secretGame field.');
  }
  return secretGame;
}

// ------------------------------------------------------------------------------------------------
// RAWG integration (lazy-loaded & optional)
// ------------------------------------------------------------------------------------------------

/**
* Attempts to retrieve a random game title from the RAWG API.
*
* The function short-circuits (throws) when `RAWG_API_KEY` is absent so the
* caller can fall back immediately without incurring a dynamic import or HTTP
* overhead in environments that don’t configure RAWG (e.g. CI).
*/
async function callRawgOnce(): Promise<string> {
  if (!process.env.RAWG_API_KEY) {
    throw new Error('RAWG_API_KEY not configured');
  }

  if (!_fetchRandomGame) {
    const mod = await import('./rawg.js');
    _fetchRandomGame = mod.fetchRandomGame;
  }

  return _fetchRandomGame();
}

// ------------------------------------------------------------------------------------------------
// Public API
// ------------------------------------------------------------------------------------------------

/**
* Retrieves the secret game for the provided date (UTC).
* If none is stored it will fetch a new title – preferring RAWG when the
*   `RAWG_API_KEY` is configured, otherwise falling back to Gemini.
* The chosen title is persisted so subsequent calls on the same date return the
* cached value without hitting external services.
*/
export async function getDailyGame(date: Date = new Date()): Promise<string> {
  const dateKey = toUtcDateString(date);
  const data = await loadData();

  if (data[dateKey]) {
    return data[dateKey];
  }

  let secretGame: string;

  try {
    // Prefer RAWG because it provides real, up-to-date titles.
    secretGame = await callRawgOnce();
  } catch {
    // Fallback to Gemini when RAWG is not configured or fails.
    secretGame = await callGeminiOnce();
  }
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
