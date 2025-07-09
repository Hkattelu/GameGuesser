// Re-export the TypeScript implementation so ESM imports using the .js extension
// continue to work both in TS source and the compiled JS output.
export * from './auth.ts';
export { register, login, authenticateToken } from './auth.ts';
