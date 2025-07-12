import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { callGeminiAPI } from './gemini.ts';
import { fetchRandomGame } from './rawg.ts';

/**
* Mapping of UTC date string (YYYY-MM-DD) ➜ Game of the day
*/
type DailyGameMap = Record<string, string>;

// Resolve directory of this module in an ESM-compatible way.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DAILY_GAMES_FILENAME: string = process.env.DAILY_GAME_FILE_PATH
  ? path.resolve(process.env.DAILY_GAME_FILE_PATH)
  : path.join(__dirname, 'daily-games.json');


let dailyGameMap: DailyGameMap | null = null;

/**
 * Attempts to load the daily games map from the server-configured filename.
 * @returns {Promise<DailyGameMap>} a daily games map
 */
async function loadDailyGamesMap(): Promise<DailyGameMap> {
  if (dailyGameMap) return dailyGameMap;

  console.error(DAILY_GAMES_FILENAME);
  try {
    const raw = await fs.readFile(DAILY_GAMES_FILENAME, 'utf-8');
    dailyGameMap = JSON.parse(raw) as DailyGameMap;
    return dailyGameMap;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      dailyGameMap = {};
      return dailyGameMap;
    }
    throw err;
  }
}

/**
 * Write the specificied map to the server-configured filename
 * @param data the daily game map to write
 */
async function saveDailyGamesMap(data: DailyGameMap): Promise<void> {
  dailyGameMap = data;
  await fs.writeFile(DAILY_GAMES_FILENAME, JSON.stringify(data, null, 2), 'utf-8');
}

/** Returns YYYY-MM-DD for the provided date in UTC. */
function toUtcDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

async function callGeminiOnce(): Promise<string> {
  const prompt =
    `Pick a random, well-known video game title.
     It must not be from one of these: [${Object.values(dailyGameMap).join(',')}]
     Your response MUST be a JSON object of the form {"secretGame": "<Title>"}.
    `;
  const jsonResponse = await callGeminiAPI<{ secretGame: string }>(prompt);

  const secretGame = jsonResponse?.secretGame;
  if (!secretGame) {
    throw new Error('Gemini did not return a secretGame field.');
  }
  return secretGame;
}

/**
 * Retrieve a random game title from the RAWG API.
 */
async function fetchGameFromRawg(): Promise<string> {
  let game: string = '';
  let counter = 0;

  // Fetch random games from the API until we get one we haven't seen.
  // Give up if it takes more than 5 tries
  while (counter < 5 && game === '') {
    const tempGame = await fetchRandomGame();
    if (!Object.values(dailyGameMap).includes(tempGame)) {
      game = tempGame
      break;
    }
    counter++;
  }

  if (!game) {
    throw new Error('Could not find a game from the RAWG API.');
  }
  return game;
}

/**
* Retrieves the secret game for the provided date (UTC).
* If none is stored it will fetch a new title – preferring RAWG when the
*   `RAWG_API_KEY` is configured, otherwise falling back to Gemini.
* The chosen title is persisted so subsequent calls on the same date return the
* cached value without hitting external services.
*/
export async function getDailyGame(date: Date = new Date()): Promise<string> {
  const dateKey = toUtcDateString(date);
  const dailyGamesMap = await loadDailyGamesMap();

  if (dailyGamesMap[dateKey]) {
    return dailyGamesMap[dateKey];
  }

  let secretGame: string;

  // Prefer RAWG because it provides real, up-to-date titles.
  // Fallback to Gemini when RAWG is not configured or fails.
  try {
    secretGame = await fetchGameFromRawg();
  } catch {
    secretGame = await callGeminiOnce();
  }
  dailyGamesMap[dateKey] = secretGame;
  await saveDailyGamesMap(dailyGamesMap);
  return secretGame;
}

/** Clears the in-memory cache (used in unit tests). */
function clearCache(): void {
  dailyGameMap = null;
}
export const TEST_ONLY = {
  clearCache
};

/** Exported solely for inspection in tests / debugging. */
export const _DAILY_GAMES_FILENAME = DAILY_GAMES_FILENAME;
