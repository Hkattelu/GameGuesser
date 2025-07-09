// backend/dailyGameStore.js
// A minimal persistent store that maps a calendar date (UTC, formatted as YYYY-MM-DD)
// to the secret game chosen for that date.
//
// The data is persisted to the local filesystem so the daily selection survives
// process restarts. The default location is alongside this file, but it can be
// overridden for tests by setting the `DAILY_GAME_STORE_FILE` environment
// variable.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Determine store location ----------------------------------------------------
const DEFAULT_STORE_FILE = (() => {
  // Resolve to a path on disk next to this file: backend/daily_game_store.json
  const dirname = path.dirname(fileURLToPath(import.meta.url));
  return path.join(dirname, 'daily_game_store.json');
})();

function getStoreFilePath() {
  return process.env.DAILY_GAME_STORE_FILE || DEFAULT_STORE_FILE;
}

// Helpers ---------------------------------------------------------------------

/**
* Return today's date in UTC formatted as `YYYY-MM-DD`.
*/
function getTodayStringUTC() {
  return new Date().toISOString().slice(0, 10);
}

/**
* Read the JSON store from disk. If the file does not exist or is corrupted it
* returns an empty object rather than throwing, allowing the caller to
* re-initialise the store.
*/
async function readStore() {
  const file = getStoreFilePath();
  try {
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    // ENOENT → no file yet; SyntaxError → corrupt JSON. In both cases treat as empty.
    return {};
  }
}

/**
* Atomically write the provided object to disk.
*/
async function writeStore(data) {
  const file = getStoreFilePath();
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data), 'utf8');
  await fs.rename(tmp, file);
}

// Public API ------------------------------------------------------------------

/**
* Returns the secret game for today if it has already been set, otherwise
* `undefined`.
*/
export async function getDailyGameForToday() {
  const store = await readStore();
  return store[getTodayStringUTC()];
}

/**
* Persist the provided secret game for today. Overwrites any existing value
* for the current date.
*/
export async function setDailyGameForToday(secretGame) {
  if (!secretGame) {
    throw new Error('secretGame must be a non-empty string');
  }
  const store = await readStore();
  store[getTodayStringUTC()] = secretGame;
  await writeStore(store);
}

/**
* Remove all persisted data. Intended for testing only.
*/
export async function clearDailyGameStore() {
  const file = getStoreFilePath();
  try {
    await fs.unlink(file);
  } catch (err) {
    // Ignore if file didn't exist.
    if (err.code !== 'ENOENT') throw err;
  }
}
