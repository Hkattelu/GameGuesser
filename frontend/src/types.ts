export type GameMode = 'ai-guesses' | 'player-guesses';

export interface ChatPart {
  text: string;
}

export type Role = 'user' | 'model' | 'system';

export interface ChatMessage {
  role: Role;
  parts: ChatPart[];
  /**
   * Optional field that indicates which game variant produced this message.
   * Populated when the backend includes `game_type` in its response so the
   * frontend can reason about mixed histories (e.g. on the Start screen).
   */
  gameType?: string;
}

export interface ChatTurn {
  user: string;
  model?: string;
}

export interface PlayerQuestionResponse {
  confidence: number;
  answer: string;
  clarification? : string;
}

export interface Platform {
  id: number;
  name: string;
}

export interface RAWGGamePlatform {
  platform: Platform;
}

export interface RAWGGameDetails {
  developer?: string;
  publisher?: string;
  platform?: string;
  releaseYear?: number;
  platforms?: RAWGGamePlatform[];
}

export interface PlayerGuessResponse {
  correct: boolean;
  response: string;
  score?: number;
  usedHint?: boolean;
}
