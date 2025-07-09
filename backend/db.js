// Re-export the TypeScript implementation so ESM imports using the .js extension
// continue to work both in TS source and the compiled JS output.
export * from './db.ts';
export { default } from './db.ts';
