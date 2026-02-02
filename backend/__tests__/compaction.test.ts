import { jest } from '@jest/globals';

// Define Mock Firestore
const mockSet = jest.fn().mockResolvedValue(undefined);
const mockDoc = jest.fn().mockReturnValue({ set: mockSet });
const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });
const mockFirestore = {
  collection: mockCollection,
};

// Define Mock AI
const mockGenerateStructured = jest.fn();

// We mock db.ts before importing game.ts to control Firestore instance
(jest as any).unstable_mockModule('../db.js', () => ({
  getFirestoreInstance: () => mockFirestore,
}));

// Mock AI module
(jest as any).unstable_mockModule('../ai.js', () => ({
  generateStructured: mockGenerateStructured,
  ai: {},
}));

// We need to import things AFTER mocking
const { startPlayerGuessesGame, handlePlayerQuestion } = await import('../game.js');

describe('Data Compaction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should store compacted session data in Firestore', async () => {
    mockGenerateStructured.mockResolvedValue({
      type: 'answer',
      questionCount: 1,
      content: { answer: 'Yes', confidence: 10 }
    });

    const { sessionId } = await startPlayerGuessesGame();
    
    // Clear mocks from the start call
    mockSet.mockClear();

    await handlePlayerQuestion(sessionId, 'Is it an RPG?');

    // Check what was saved to Firestore
    expect(mockSet).toHaveBeenCalled();
    const savedDoc = mockSet.mock.calls[0][0] as any;
    
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
    const compactedData = {
      kind: 'player',
      data: {
        s: 'Zelda',
        h: [{ role: 'model', content: { type: 'answer', questionCount: 1, content: { answer: 'Yes' } } }],
        q: 1,
        uh: true
      },
      updated_at: {}
    };

    // Mock DB response
    const mockGet = jest.fn().mockResolvedValue({
      exists: true,
      data: () => compactedData
    });
    mockDoc.mockReturnValue({ get: mockGet, set: mockSet });

    const { getSession, getOrLoadSession } = await import('../game.js');
    
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
