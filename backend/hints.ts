import { callGeminiAPI } from './gemini.ts';

export interface GameHint {
  developer: string;
  publisher: string;
  releaseYear: number;
}

/**
* Retrieves developer, publisher and release year information for the given
* game title. The default implementation queries the Gemini API because the
* RAWG API requires two network round-trips (search → details) and an API
* key that might not be configured in all environments. Swapping out the
* implementation is trivial for callers – simply mock `fetchGameHint()` in
* tests or replace it with a RAWG integration later.
*
* @param gameTitle The human-readable game title.
* @returns A structured hint object that can be directly serialised to JSON.
*/
export async function fetchGameHint(gameTitle: string): Promise<GameHint> {
  // Prompt Gemini to return a compact JSON object.
  const prompt = `Provide a concise JSON object with the main developer, publisher and the initial release year for the video game \"${gameTitle}\".
    The shape MUST exactly be: {\"developer\":\"...\", \"publisher\":\"...\", \"releaseYear\": 1990}`;

  const response = await callGeminiAPI<GameHint>(prompt);

  // Basic sanity validation to make sure Gemini returned all fields.
  if (!response?.developer || !response?.publisher || !response?.releaseYear) {
    throw new Error('Incomplete hint data returned from Gemini');
  }

  return response;
}
