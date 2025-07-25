// Shared Jest setup mocks for backend test suite.
// Moved out of `__tests__` so Jest doesn't try to treat it as a test file.

import { jest } from '@jest/globals';

// ---------------------------------------------------------------------------
// firebase-admin mock
// ---------------------------------------------------------------------------

(jest as any).unstable_mockModule('firebase-admin', () => {
  const credential = { cert: jest.fn() } as any;
  return {
    __esModule: true,
    default: {
      initializeApp: jest.fn(),
      credential,
      auth: () => ({ verifyIdToken: jest.fn() }),
      app: () => ({ name: '[mock-app]' }),
    },
  };
});

// ---------------------------------------------------------------------------
// zod mock – lightweight schema passthrough
// ---------------------------------------------------------------------------

const passthrough = {
  parse: (v: unknown) => v,
  safeParse: (v: unknown) => ({ success: true, data: v }),
  optional: () => passthrough,
};

const factory = () => ({ ...passthrough, optional: () => ({ ...passthrough }) });

(jest as any).unstable_mockModule('zod', () => {
  const zMock: any = {
    __esModule: true,
    z: undefined as any, // will link to self below
    ZodError: class ZodError extends Error {},
    literal: factory,
    enum: () => factory(),
    object: () => ({ ...factory(), shape: jest.fn(), extend: factory }),
    string: factory,
    number: factory,
    boolean: factory,
    array: () => factory(),
    date: factory,
    union: () => factory(),
  };

  zMock.z = zMock;
  return zMock;
});

export {}; // silence TS2688
