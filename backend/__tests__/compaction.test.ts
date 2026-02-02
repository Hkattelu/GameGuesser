import { jest, beforeEach, describe, it, expect } from '@jest/globals';

import { MockFirestore } from './mocks/firestoreMock.js';

const firestore = new MockFirestore();

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
    const savedDoc = snap.data() as any;
    
    // GOAL (Compacted):
    // 1. chatHistory should be shortened to 'h'
    expect(savedDoc.data.h).toBeDefined();
    expect(savedDoc.data.chatHistory).toBeUndefined();
    
    // 2. The first system message should be OMITTED
    expect(savedDoc.data.h.length).toBe(1);
    expect(savedDoc.data.h[0].role).toBe('model');
    
    // 3. Other keys should be shortened
    expect(savedDoc.data.s).toBeDefined(); // secretGame
    expect(savedDoc.data.q).toBeDefined(); // questionCount
  });

  it('should rehydrate session data correctly from compacted format', async () => {
    const sessionId = 'test-session-id';
    const compactedData: any = {
      kind: 'player',
      data: {
        s: 'Zelda',
        h: [{ role: 'model', content: { type: 'answer', questionCount: 1, content: { answer: 'Yes' } } }],
        q: 1,
        uh: true
      },
      updated_at: {},
      expiresAt: { toDate: () => new Date() },
    };

    await firestore.collection('gameSessions').doc(sessionId).set(compactedData);

    const session = await getOrLoadSession(sessionId);

    expect(session).toBeDefined();
    expect(session.questionCount).toBe(1);
    expect((session as any).secretGame).toBe('Zelda');
    expect((session as any).usedHint).toBe(true);
    // History should have 2 messages: the prepended system one + the one from DB
    expect(session.chatHistory.length).toBe(2);
    expect(session.chatHistory[0].content).toContain('The secret game is Zelda');
  });
});
