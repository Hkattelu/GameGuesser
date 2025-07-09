import { ResponseOption } from './types';

// Backend base URL – configurable via Vite at build-time, falls back to localhost during development.
export const API_URL: string = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8080';

// Maximum number of questions allowed in a single game of 20Q.
export const MAX_QUESTIONS = 20;

// Suggested example questions surfaced to users when they are stuck.
export const SUGGESTIONS: readonly string[] = [
  'Is it an RPG?',
  'Was it released after 2010?',
  'Is it a first-person shooter?',
  'Is it a multiplayer game?',
  'Is it exclusive to a single platform?',
] as const satisfies readonly string[];

export const RESPONSE_OPTIONS: readonly ResponseOption[] = ['Yes', 'No', 'Unsure'] as const;
