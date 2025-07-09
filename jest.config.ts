import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  resolver: 'ts-jest-resolver',
  moduleNameMapper: {
    // Allow importing compiled JS specifiers in TS source
    '^(\\.{1,2}/.*)\\.js$': '$1.ts',
  },
  collectCoverage: true,
  coverageDirectory: './coverage',
  collectCoverageFrom: [
    'backend/**/*.{ts,tsx}',
    'frontend/src/**/*.{ts,tsx}',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      statements: 50,
      branches: 30,
      functions: 40,
      lines: 50,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  transform: {
    '^.+\\.(t|j)sx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
};

export default config;
