import type { ChatMessage } from '../types';

/**
* Convert the backend `chatHistory` payload to the shape expected by the
* frontend components. The backend stores messages as `{ role, content }`
* whereas the UI expects the structured `{ role, parts: [{ text }] }` form
* used by the Google Generative AI SDK.
*/
export function transformBackendHistory(rawHistory: Array<{ role: string; content: string }>): ChatMessage[] {
  if (!rawHistory || rawHistory.length === 0) return [];

  return rawHistory.map(({ role, content }) => ({
    role: role as ChatMessage['role'],
    parts: [{ text: content }],
    // `gameType` is only present when the server records the origin of each
    // turn (player-guesses vs ai-guesses). Preserve it when available to avoid
    // losing information.
    gameType: (rawHistory as any).game_type,
  }));
}

/**
* Simple runtime utility that detects whether the backend responded with an
* HTTP 401 and, if so, returns a human-readable error message used by the UI
* to trigger a logout & redirect.
*/
export function mapResponseError(status: number): string | null {
  if (status === 401) {
    return 'Your login credentials are stale. Refreshing the page...';
  }
  return null;
}
