import { jest } from '@jest/globals';

// Define Mock Firestore
const mockSet = jest.fn().mockResolvedValue(undefined);
const mockDoc = jest.fn().mockReturnValue({ set: mockSet });
const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });
const mockFirestore = {
  collection: mockCollection,
};

// We mock db.ts before importing game.ts to control Firestore instance
(jest as any).unstable_mockModule('../db.js', () => ({
  getFirestoreInstance: () => mockFirestore,
}));

// We need to import things AFTER mocking
const { startPlayerGuessesGame } = await import('../game.js');

describe('Firestore TTL', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should include expiresAt field in the persisted document', async () => {
    await startPlayerGuessesGame();

    expect(mockSet).toHaveBeenCalled();
    const savedDoc = mockSet.mock.calls[0][0] as any;
    
    expect(savedDoc.expiresAt).toBeDefined();
    // Check if it's a date in the future (e.g., 24 hours from now)
    const now = Date.now();
    const expiresAt = savedDoc.expiresAt.toDate ? savedDoc.expiresAt.toDate().getTime() : new Date(savedDoc.expiresAt).getTime();
    
    expect(expiresAt).toBeGreaterThan(now);
  });
});
