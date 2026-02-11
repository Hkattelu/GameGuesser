import { jest, beforeEach, describe, it, expect } from '@jest/globals';

import { MockFirestore } from './mocks/firestoreMock.js';

const firestore = new MockFirestore();

function requireRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Expected an object record');
  }
  return value as Record<string, unknown>;
}

// Define Mock AI
const mockGenerateStructured = jest.fn();

// We mock db.ts before importing game.ts to control Firestore instance
(jest as any).unstable_mockModule('../db.js', () => ({
  getFirestoreInstance: () => firestore,
}));

// Mock AI module
(jest as any).unstable_mockModule('../ai.js', () => ({
  generateStructured: mockGenerateStructured,
  ai: {},
}));

// We need to import things AFTER mocking
const {
  startPlayerGuessesGame,
  handlePlayerQuestion,
  clearSessions,
  getOrLoadSession,
} = await import('../game.js');

describe('Data Compaction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    firestore.clear();
    clearSessions();
  });

  it('should store compacted session data in Firestore', async () => {
    mockGenerateStructured.mockResolvedValue({
      type: 'answer',
      questionCount: 1,
      content: { answer: 'Yes', confidence: 10 }
    });

    const { sessionId } = await startPlayerGuessesGame();

    await handlePlayerQuestion(sessionId, 'Is it an RPG?');

    const snap = await firestore.collection('gameSessions').doc(sessionId).get();
    expect(snap.exists).toBe(true);
    const savedDoc = requireRecord(snap.data() as unknown);
    const savedData = requireRecord(savedDoc['data']);
    
    // GOAL (Compacted):
    // 1. chatHistory should be shortened to 'h'
    expect(savedData['h']).toBeDefined();
    expect(savedData['chatHistory']).toBeUndefined();
    
    // 2. The first system message should be OMITTED
    const history = savedData['h'];
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBe(1);
    expect(requireRecord(history[0])['role']).toBe('model');
    
    // 3. Other keys should be shortened
    expect(savedData['s']).toBeDefined(); // secretGame
    expect(savedData['q']).toBeDefined(); // questionCount
  });

  it('should rehydrate session data correctly from compacted format', async () => {
    const sessionId = 'test-session-id';
    const compactedData = {
      kind: 'player',
      data: {
        s: 'Zelda',
        h: [{ role: 'model', content: { type: 'answer', questionCount: 1, content: { answer: 'Yes' } } }],
        q: 1,
        uh: true
      },
      updated_at: {},
      expiresAt: { toDate: () => new Date() },
    } satisfies Record<string, unknown>;

    await firestore.collection('gameSessions').doc(sessionId).set(compactedData);

    const session = await getOrLoadSession(sessionId);

    expect(session).toBeDefined();
    expect(session?.questionCount).toBe(1);
    if (!session || !('secretGame' in session)) {
      throw new Error('Expected a player session');
    }
    expect(session.secretGame).toBe('Zelda');
    expect(session.usedHint).toBe(true);
    // History should have 2 messages: the prepended system one + the one from DB
    expect(session.chatHistory.length).toBe(2);
    expect(session.chatHistory[0].content).toContain('The secret game is Zelda');
  });
});
