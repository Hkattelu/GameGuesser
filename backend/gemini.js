// Thin re-export so both TypeScript and JavaScript consumers can import
// `./gemini.js`, while the source of truth lives in `gemini.ts`.
//
// Jest tests (and potentially runtime code compiled to CJS) rely on importing
// this path, so it must always re-export the same symbols.

export { callGeminiAPI } from './gemini.ts';
