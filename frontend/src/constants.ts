import { ResponseOption } from './types';

export const AI_NAME = 'Quiz Bot';

// Maximum number of questions allowed in a single game of 20Q.
export const MAX_QUESTIONS = 20;

// Maximum number of suggested chips allowed to be shown.
export const MAX_SUGGESTIONS = 5;

// Suggested example questions surfaced to users when they are stuck.
export const SUGGESTIONS: readonly string[] = [
  'Is it an RPG?',
  'Was it released after 2010?',
  'Is it a first-person shooter?',
  'Is it a multiplayer game?',
  'Is it exclusive to a single platform?',
] as const satisfies readonly string[];

export const RESPONSE_OPTIONS: readonly ResponseOption[] = ['Yes', 'No', 'Unsure'] as const;
