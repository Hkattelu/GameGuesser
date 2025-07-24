// Frontend-local utility types plus re-exports of shared request/response
// contracts that are consumed across both packages. Importing from
// `@shared/types` (configured via `paths` in `tsconfig.json`) avoids brittle
// relative paths like "../../shared".

export * from '@shared/types';

// ---------------------------------------------------------------------------
// UI-specific helper types (not needed by the backend but convenient for React)
// ---------------------------------------------------------------------------

export type GameMode = 'ai-guesses' | 'player-guesses';

export interface ChatPart {
  text: string;
}

export type Role = 'user' | 'model' | 'system';

export interface ChatMessage {
  role: Role;
  parts: ChatPart[];
}

export interface ChatTurn {
  user: string;
  model?: string;
}
