import type { ChatMessage } from '../types';

// Shape returned by the backend for each chat history entry. The
// `game_type` field is optional because the backend only attaches it on
// endpoints that need to record which game produced the turn.
export interface BackendChatMessage {
  role: string;
  content: string;
  game_type?: string;
}

/**
* Convert the backend `chatHistory` payload to the shape expected by the
* frontend components. The backend stores messages as `{ role, content }`
* whereas the UI expects the structured `{ role, parts: [{ text }] }` form
* used by the Google Generative AI SDK.
*/
export function transformBackendHistory(rawHistory: BackendChatMessage[] | undefined): ChatMessage[] {
  if (!rawHistory?.length) return [];

  return rawHistory.map(({ role, content, game_type }) => ({
    role: role as ChatMessage['role'],
    parts: [{ text: content }],
    // Preserve the original game type, if supplied.
    gameType: game_type,
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
