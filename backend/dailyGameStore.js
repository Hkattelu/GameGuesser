import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve directory of this module in ESM compatible way.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Allow the data file path to be overridden (useful for tests).
const DATA_FILE = process.env.DAILY_GAME_FILE_PATH
  ? path.resolve(process.env.DAILY_GAME_FILE_PATH)
  : path.join(__dirname, 'daily-games.json');

// Lazy in-memory cache so we do not hit the filesystem on every call.
let cache = null;

async function loadData() {
  if (cache) return cache;

  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8');
    cache = JSON.parse(raw);
    return cache;
  } catch (err) {
    if (err.code === 'ENOENT') {
      cache = {};
      return cache;
    }
    throw err;
  }
}

async function saveData(data) {
  cache = data;
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function toUtcDateString(date) {
  // Returns YYYY-MM-DD for the provided date in UTC.
  return date.toISOString().split('T')[0];
}

// We import lazily to avoid circular deps in tests where gemini.js is mocked
let _callGeminiAPI;
async function callGeminiOnce() {
  if (!_callGeminiAPI) {
    // Dynamic import to avoid init-time cycle problems.
    const mod = await import('./gemini.js');
    _callGeminiAPI = mod.callGeminiAPI;
  }

  const prompt =
    'Pick a random, well-known video game title. Your response MUST be a JSON object of the form {"secretGame": "<Title>"}.';

  const jsonResponse = await _callGeminiAPI(prompt);
  const secretGame = jsonResponse?.secretGame;
  if (!secretGame) {
    throw new Error('Gemini did not return a secretGame field.');
  }
  return secretGame;
}

/**
* Retrieves the secret game for the provided date (UTC) from persistent storage.
* If the record does not exist yet, it will request a new game from Gemini,
* persist it, and return it.
*
* @param {Date} [date=new Date()] – The reference date (defaults to now).
* @returns {Promise<string>} The secret game title for that date.
*/
export async function getDailyGame(date = new Date()) {
  const dateKey = toUtcDateString(date);
  const data = await loadData();

  if (data[dateKey]) {
    return data[dateKey];
  }

  const secretGame = await callGeminiOnce();
  data[dateKey] = secretGame;
  await saveData(data);
  return secretGame;
}

/**
* Clears the in-memory cache (useful for tests).
*/
export function _clearCache() {
  cache = null;
}

// For direct inspection / debugging.
export const _DATA_FILE = DATA_FILE;
