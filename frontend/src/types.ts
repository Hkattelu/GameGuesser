export type GameMode = 'ai-guesses' | 'player-guesses';

export interface ChatPart {
  text: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: ChatPart[];
}

export type ResponseOption = 'Yes' | 'No' | 'Unsure';
