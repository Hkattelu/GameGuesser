/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest/presets/js-with-ts-esm',
  testEnvironment: 'jest-environment-node',
  transform: {
    '^.+\.ts$': ['ts-jest', { useESM: true }],
  },
  moduleNameMapper: {
    '^(\.{1,2}/.*)\.js$': '$1',
    '^(\.{1,2}/.*)\.cjs$': '$1',
    'stream/web': '<rootDir>/node_modules/@types/node/stream/web.d.ts',
  },
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts',
  ],
};
