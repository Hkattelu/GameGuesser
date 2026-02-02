import { jest, beforeEach, describe, it, expect } from '@jest/globals';

import { MockFirestore } from './mocks/firestoreMock.js';

const firestore = new MockFirestore();

function requireRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Expected an object record');
  }
  return value as Record<string, unknown>;
}

// We mock db.ts before importing game.ts to control Firestore instance
(jest as any).unstable_mockModule('../db.js', () => ({
  getFirestoreInstance: () => firestore,
}));

// We need to import things AFTER mocking
const { startPlayerGuessesGame, clearSessions } = await import('../game.js');

describe('Firestore TTL', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    firestore.clear();
    clearSessions();
  });

  it('should include expiresAt field in the persisted document', async () => {
    const before = Date.now();
    await startPlayerGuessesGame();
    const after = Date.now();

    const docs = [...firestore.collection('gameSessions').store.values()];
    expect(docs.length).toBe(1);

    const savedDoc = requireRecord(docs[0] as unknown);
    const expiresAtValue = savedDoc['expiresAt'];
    expect(expiresAtValue).toBeDefined();

    const expiresAtRecord = requireRecord(expiresAtValue);
    const toDate = expiresAtRecord['toDate'];
    if (typeof toDate !== 'function') {
      throw new Error('Expected expiresAt.toDate to be a function');
    }

    const expiresAt = (toDate as (this: unknown) => Date).call(expiresAtValue).getTime();
    const expectedMs = 24 * 60 * 60 * 1000;
    expect(expiresAt).toBeGreaterThanOrEqual(before + expectedMs);
    expect(expiresAt).toBeLessThanOrEqual(after + expectedMs);
  });
});
