// Thin re-export so both TypeScript and JavaScript consumers can import
// `./gemini.js`, while the source of truth lives in `gemini.ts`.
//
// Jest tests rely on importing this path and mocking it with
// `jest.unstable_mockModule()`, so keeping this file separate (and *always*
// exporting the same symbols) avoids breaking tests when the TypeScript
// extension changes.

export { callGeminiAPI } from './gemini.ts';
