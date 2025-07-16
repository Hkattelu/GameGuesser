import { generateStructured } from './ai.js';
import { fetchRandomGame } from './rawg.js';
import { SECRET_GAME_PICK_PROMPT } from './prompts.js';
import * as db from './db.js';

/** Returns YYYY-MM-DD for the provided date in UTC. */
function toUtcDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

import { z } from 'zod';

const secretGameSchema = z.object({ secretGame: z.string() });

async function callAIOnce(exclude: string[]): Promise<string> {
  const prompt = SECRET_GAME_PICK_PROMPT(exclude);
  const jsonResponse = await generateStructured(secretGameSchema, prompt);

  const secretGame = jsonResponse?.secretGame;
  if (!secretGame) {
    throw new Error('Gemini did not return a secretGame field.');
  }
  return secretGame;
}

/**
 * Retrieve a random game title from the RAWG API.
 * If the game is already in the @param exclude list, try again.
 */
async function fetchGameFromRawg(exclude: string[]): Promise<string> {
  let game: string = '';
  let counter = 0;

  // Fetch random games from the API until we get one we haven't seen.
  // Give up if it takes more than 5 tries
  while (counter < 5 && game === '') {
    const tempGame = await fetchRandomGame();
    if (!exclude.includes(tempGame)) {
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
  
  const game = await db.getDailyGame(dateKey);

  if (game) {
    return game;
  }

  let secretGame: string;

  // To avoid picking a game that has been picked recently, we'll get the last
  // 100 games and pass them as an exclusion list to the game pickers.
  
  const recentGames = await db.getRecentDailyGames(100);
  const recentGameNames = recentGames.map((g: { gameName: string }) => g.gameName);

  // Prefer RAWG because it provides real, up-to-date titles.
  // Fallback to Gemini when RAWG is not configured or fails.
  try {
    secretGame = await fetchGameFromRawg(recentGameNames);
  } catch {
    secretGame = await callAIOnce(recentGameNames);
  }
  
  await db.saveDailyGame(dateKey, secretGame);
  return secretGame;
}
