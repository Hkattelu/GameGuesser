// This file exists solely so that Jest ESM resolution in `ts-jest` based tests
// can find the module when test files import `./gemini.js`.
//
// The real implementation lives in `gemini.ts`. We re-export everything so
// runtime behaviour is identical while avoiding import path churn in the test
// suite.

export * from './gemini.ts';
