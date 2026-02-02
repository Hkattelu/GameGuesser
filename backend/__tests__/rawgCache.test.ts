import { jest } from '@jest/globals';

// Define Mock Firestore
const mockGet = jest.fn();
const mockSet = jest.fn().mockResolvedValue(undefined);
const mockDoc = jest.fn().mockReturnValue({ get: mockGet, set: mockSet });
const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });
const mockFirestore = {
  collection: mockCollection,
};

// Mock fetch
const mockFetch = jest.fn();

// We mock db.ts
(jest as any).unstable_mockModule('../db.js', () => ({
  getFirestoreInstance: () => mockFirestore,
}));

// We mock node-fetch
(jest as any).unstable_mockModule('node-fetch', () => ({
  default: mockFetch,
}));

const { fetchGameMetadata } = await import('../rawgDetails.js');

describe('RAWG Metadata Caching', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.RAWG_API_KEY = 'test-key';
  });

  it('should fetch from Firestore if not in memory', async () => {
    const title = 'Zelda';
    const cachedData = {
      developer: 'Nintendo',
      publisher: 'Nintendo',
      releaseYear: 2017
    };

    // First call: not in memory, find in Firestore
    mockGet.mockResolvedValueOnce({
      exists: true,
      data: () => cachedData
    });

    const result = await fetchGameMetadata(title);

    expect(result).toEqual(cachedData);
    expect(mockCollection).toHaveBeenCalledWith('metadata');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should fetch from RAWG and save to Firestore if not found anywhere', async () => {
    const title = 'NewGame';
    
    // Not in Firestore
    mockGet.mockResolvedValueOnce({
      exists: false
    });

    // RAWG responses
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [{ id: 123 }] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          developers: [{ name: 'Dev' }],
          publishers: [{ name: 'Pub' }],
          platforms: [{ platform: { name: 'Switch' } }],
          released: '2024-01-01'
        })
      });

    const result = await fetchGameMetadata(title);

    expect(result.developer).toBe('Dev');
    expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
      developer: 'Dev'
    }));
  });

  it('should explicitly save metadata using saveMetadata', async () => {
    const { saveMetadata } = await import('../rawgDetails.js');
    const title = 'ManualSave';
    const data = { developer: 'Manual', special: 'AI Hint' };

    await saveMetadata(title, data);

    expect(mockCollection).toHaveBeenCalledWith('metadata');
    expect(mockDoc).toHaveBeenCalledWith(title);
    expect(mockSet).toHaveBeenCalledWith(data);
  });
});
