import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
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
const DATA_FILE = process.env.DAILY_GAME_FILE_PATH
    ? path.resolve(process.env.DAILY_GAME_FILE_PATH)
    : path.join(__dirname, 'daily-games.json');
/**
* Lazily initialised in-memory cache. This avoids reading the JSON file on every request.
* Cleared in tests via `_clearCache()`.
*/
let cache = null;
// ------------------------------------------------------------------------------------------------
// Persistence helpers
// ------------------------------------------------------------------------------------------------
async function loadData() {
    if (cache)
        return cache;
    try {
        const raw = await fs.readFile(DATA_FILE, 'utf-8');
        cache = JSON.parse(raw);
        return cache;
    }
    catch (err) {
        if (err.code === 'ENOENT') {
            cache = {};
            return cache;
        }
        throw err;
    }
}
async function saveData(data) {
    cache = data;
    // NOTE: For simplicity we write directly. In production you may want an atomic write.
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}
function toUtcDateString(date) {
    // Returns YYYY-MM-DD for the provided date in UTC.
    return date.toISOString().split('T')[0];
}
// ------------------------------------------------------------------------------------------------
// Gemini integration (lazy-loaded to avoid cycles in tests)
// ------------------------------------------------------------------------------------------------
let _callGeminiAPI = null;
async function callGeminiOnce() {
    if (!_callGeminiAPI) {
        const mod = await import('./gemini.js');
        _callGeminiAPI = mod.callGeminiAPI;
    }
    const prompt = 'Pick a random, well-known video game title. Your response MUST be a JSON object of the form {"secretGame": "<Title>"}.';
    const jsonResponse = await _callGeminiAPI(prompt);
    const secretGame = jsonResponse?.secretGame;
    if (!secretGame) {
        throw new Error('Gemini did not return a secretGame field.');
    }
    return secretGame;
}
// ------------------------------------------------------------------------------------------------
// Public API
// ------------------------------------------------------------------------------------------------
/**
* Retrieves the secret game for the provided date (UTC).
* If none is stored it will fetch a new title from Gemini, persist it and return it.
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
* Clears the in-memory cache (used in unit tests).
*/
export function _clearCache() {
    cache = null;
}
// Exported solely for inspection in tests / debugging.
export const _DATA_FILE = DATA_FILE;
