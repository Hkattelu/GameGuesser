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

export type ResponseOption = 'Yes' | 'No' | 'Unsure';
