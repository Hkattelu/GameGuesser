import { ResponseOption } from './types';

export const AI_NAME = 'Quiz Bot';

// Maximum number of questions allowed in a single game of 20Q.
export const MAX_QUESTIONS = 20;

// Maximum number of suggested chips allowed to be shown.
export const MAX_SUGGESTIONS = 5;

// Suggested example questions surfaced to users when they are stuck.
export const SUGGESTIONS: readonly string[] = [
  'Was it released after 2010?',
  'Was it released before 2010?',
  'Was it released on a Nintendo console?',
  'Was it released on a PlayStation console?',
  'Was it released on an Xbox console?',
  'Does it involve a post-apocalyptic setting?',
  'Does it feature a female protagonist?',
  'Does it have a realistic art style?',
  'Is it a multiplayer game?',
  'Is it exclusive to a single platform?',
  'Is it an RPG (Role-Playing Game)?',
  'Is it a First-Person Shooter (FPS)?',
  'Is it a fighting game?',
  'Is it a platformer?',
  'Is it a strategy game?',
  'Is it a puzzle game?',
  'Is it a horror game?',
  'Is it an open-world game?',
  'Is it primarily a single-player game?',
  'Is it a multiplayer-focused game?',
  'Is it a PC-exclusive game?',
  'Is it set in a fantasy world?',
  'Is it set in a sci-fi world?',
  'Is it an indie game?',
  'Is it part of a long-running franchise (more than 3 games)?',
  'Is it known for its story?',
  'Is it primarily a competitive game?',
  'Is it rated "M" for Mature?',
] as const satisfies readonly string[];

export const RESPONSE_OPTIONS: readonly ResponseOption[] = ['Yes', 'No', 'Unsure'] as const;
