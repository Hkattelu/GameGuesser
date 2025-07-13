import type { JestConfigWithTsJest } from 'ts-jest';

const config: JestConfigWithTsJest = {
  preset: 'ts-jest/presets/js-with-ts-esm',

  // Specify the test environment as 'node' for Node.js projects
  testEnvironment: 'node',

  // Collect coverage from all TypeScript source files in the backend package
  collectCoverageFrom: [
    '**/*.ts',
    '!**/*.d.ts', // Exclude declaration files
    '!**/__tests__/**', // Exclude test files
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['json', 'lcov', 'text', 'clover'],

  // Ignore files that are thin wrappers around external services. These are
  // either fully mocked in tests or contain no meaningful executable logic
  // worth covering.
  coveragePathIgnorePatterns: [
    '/node_modules/',
    'db.ts',
    'gemini.ts',
    'rawg.ts',
    'rawgDetails.ts',
    'auth.ts',
    'game.ts',
  ],

  // Configure how Jest should transform files
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true,
    }],
  },

  // Map single-segment relative imports ("./foo.js" or "../bar.js") that
  // originate from the backend source code to their `.ts` file equivalents.
  // We deliberately exclude deeper paths like "./cjs/x.js" to avoid
  // interfering with Node modules that legitimately ship real `.js` files.
  moduleNameMapper: {
    '^\\./(auth|dailyGameStore|db|game|gemini|rawg|rawgDetails|server)\\.js$':
      '<rootDir>/$1.ts',
    '^\\.\\./(auth|dailyGameStore|db|game|gemini|rawg|rawgDetails|server)\\.js$':
      '<rootDir>/$1.ts',
  },
  globals: {
    extensionsToTreatAsEsm: ['.ts', '.js'],
    'ts-jest': {
      useESM: true
    }
  },

  // Define patterns for test files
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/__tests__/*.ts',
    '**/?(*.)+(spec|test).ts',
  ],
  extensionsToTreatAsEsm: [".ts"],
  // Ignore patterns for test paths
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/', // Assuming compiled output is in 'dist'
  ],
  verbose: true,
};

export default config;
