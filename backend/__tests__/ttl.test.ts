import { jest, beforeEach, describe, it, expect } from '@jest/globals';

import { MockFirestore } from './mocks/firestoreMock.js';

const firestore = new MockFirestore();

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

    const savedDoc = docs[0] as any;
    expect(savedDoc.expiresAt).toBeDefined();
    expect(typeof savedDoc.expiresAt.toDate).toBe('function');

    const expiresAt = savedDoc.expiresAt.toDate().getTime();
    const expectedMs = 24 * 60 * 60 * 1000;
    expect(expiresAt).toBeGreaterThanOrEqual(before + expectedMs);
    expect(expiresAt).toBeLessThanOrEqual(after + expectedMs);
  });
});
