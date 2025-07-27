import type { JestConfigWithTsJest } from 'ts-jest';

const config: JestConfigWithTsJest = {
  preset: 'ts-jest/presets/js-with-ts-esm',

  // Specify the test environment as 'node' for Node.js projects
  testEnvironment: 'node',

  // Collect coverage from TypeScript files
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts', // Exclude declaration files
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['json', 'lcov', 'text', 'clover'],

  // Configure how Jest should transform files
  transform: {
    '^.+\.ts$': ['ts-jest', {
      useESM: true,
      tsconfig: 'tsconfig.jest.json'
    }],
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

  // Support TypeScript "NodeNext" style imports that append `.js` when
  // referencing `.ts` source files. The regexp strips the trailing `.js`
  // so Jest's resolver can locate the underlying `.ts` module during tests.
  // Without this, imports like "./db.js" fail because Jest looks for an actual
  // JavaScript file on disk instead of the source `.ts` file.
  moduleNameMapper: {
    '^(\.{1,2}/.*)\.js': '$1',
    '@google-cloud/firestore': '<rootDir>/__tests__/mocks/firestoreMock.js',
  }
};

export default config;