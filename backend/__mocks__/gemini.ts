import { jest } from '@jest/globals';

// Manual mock for `backend/gemini.ts` used in Jest tests.
// Jest will substitute this file whenever a test calls
// `jest.mock('./gemini.ts')` *before* importing the module.

export const callGeminiAPI: jest.Mock = jest.fn();

// Re-export types from the real module for convenience in tests that
// import them solely for type annotations. This has no runtime impact.
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
export type { ChatMessage, ChatPart } from '../gemini.ts';
