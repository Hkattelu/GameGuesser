import { jest, beforeEach, describe, it, expect } from '@jest/globals';
import { MockFirestore, randomId } from './mocks/firestoreMock.js';

// Mock Firestore early
jest.unstable_mockModule('@google-cloud/firestore', () => ({
  Firestore: MockFirestore,
  Timestamp: {
    now: jest.fn(() => ({ toDate: () => new Date() })),
    fromDate: jest.fn((date: Date) => ({ toDate: () => date })),
  },
}));

let db: typeof import('../db.js');
let firestore: MockFirestore;

beforeEach(async () => {
  // Dynamic import to ensure mocks are applied
  db = await import('../db.js');
  firestore = db.getFirestoreInstance() as unknown as MockFirestore;
  firestore.clear();
});

describe('getGameHistory', () => {
  const userId = 'test-user';

  const createConversationMessage = (
    sessionId: string,
    role: 'user' | 'model' | 'system',
    content: string,
    createdAt: Date = new Date()
  ) => ({
    user_id: userId,
    session_id: sessionId,
    role,
    content,
    created_at: {
      toDate: () => createdAt,
    },
  });

  it('returns empty array when no conversations exist', async () => {
    const result = await db.getGameHistory(userId);
    expect(result).toEqual([]);
  });

  it('extracts player-guesses game session correctly', async () => {
    const sessionId = 'pg-session-1';
    const gameDate = new Date('2025-07-01');

    // Mock conversation data for a complete player-guesses game
    firestore.mockCollection('conversations', [
      createConversationMessage(sessionId, 'system', 'Player-guesses game started', gameDate),
      createConversationMessage(sessionId, 'user', 'Is it an RPG?', gameDate),
      createConversationMessage(
        sessionId,
        'model',
        JSON.stringify({ type: 'answer', content: { answer: 'Yes' } }),
        gameDate
      ),
      createConversationMessage(sessionId, 'user', 'Is it fantasy?', gameDate),
      createConversationMessage(
        sessionId,
        'model',
        JSON.stringify({ type: 'answer', content: { answer: 'No' } }),
        gameDate
      ),
      createConversationMessage(sessionId, 'user', 'Final Fantasy VII', gameDate),
      createConversationMessage(
        sessionId,
        'model',
        JSON.stringify({
          type: 'guessResult',
          content: { correct: true, response: 'Final Fantasy VII' },
        }),
        gameDate
      ),
    ]);

    const result = await db.getGameHistory(userId);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      session_id: sessionId,
      date: '2025-07-01',
      game_mode: 'player-guesses',
      victory: true,
      question_count: 3, // 3 user questions (excluding system message)
      total_questions: 20,
      game_name: 'Final Fantasy VII',
      score: undefined,
      used_hint: undefined,
    });
  });

  it('extracts ai-guesses game session correctly', async () => {
    const sessionId = 'ai-session-1';
    const gameDate = new Date('2025-07-02');

    // Mock conversation data for AI-guesses game
    firestore.mockCollection('conversations', [
      createConversationMessage(sessionId, 'system', 'AI-guesses game started', gameDate),
      createConversationMessage(
        sessionId,
        'model',
        JSON.stringify({ type: 'question', content: 'Is it an RPG?' }),
        gameDate
      ),
      createConversationMessage(sessionId, 'user', 'User answered: Yes', gameDate),
      createConversationMessage(
        sessionId,
        'model',
        JSON.stringify({ type: 'question', content: 'Is it fantasy?' }),
        gameDate
      ),
      createConversationMessage(sessionId, 'user', 'User answered: No', gameDate),
      createConversationMessage(
        sessionId,
        'model',
        JSON.stringify({ type: 'guess', content: 'Mass Effect' }),
        gameDate
      ),
    ]);

    const result = await db.getGameHistory(userId);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      session_id: sessionId,
      date: '2025-07-02',
      game_mode: 'ai-guesses',
      victory: false, // No victory detected
      question_count: 2, // 2 user answers (excluding system message)
      total_questions: 20,
      game_name: undefined,
      score: undefined,
      used_hint: undefined,
      score: undefined,
      used_hint: undefined,
    });
  });

  it('handles losing player-guesses game', async () => {
    const sessionId = 'pg-loss-1';
    const gameDate = new Date('2025-07-03');

    firestore.mockCollection('conversations', [
      createConversationMessage(sessionId, 'system', 'Player-guesses game started', gameDate),
      createConversationMessage(sessionId, 'user', 'Wrong Guess', gameDate),
      createConversationMessage(
        sessionId,
        'model',
        JSON.stringify({
          type: 'guessResult',
          content: { correct: false, response: 'That is incorrect' },
        }),
        gameDate
      ),
    ]);

    const result = await db.getGameHistory(userId);

    expect(result[0].victory).toBe(false);
    expect(result[0].game_name).toBeUndefined();
  });

  it('detects victory from plain text messages', async () => {
    const sessionId = 'pg-text-win';
    const gameDate = new Date('2025-07-04');

    firestore.mockCollection('conversations', [
      createConversationMessage(sessionId, 'system', 'Player-guesses game started', gameDate),
      createConversationMessage(sessionId, 'user', 'Correct Game', gameDate),
      createConversationMessage(sessionId, 'model', 'You guessed it! Correct!', gameDate),
    ]);

    const result = await db.getGameHistory(userId);

    expect(result[0].victory).toBe(true);
  });

  it('filters by date range correctly', async () => {
    const session1 = 'session-june';
    const session2 = 'session-july';
    const session3 = 'session-august';

    const juneDate = new Date('2025-06-15');
    const julyDate = new Date('2025-07-15');
    const augustDate = new Date('2025-08-15');

    firestore.mockCollection('conversations', [
      createConversationMessage(session1, 'system', 'Player-guesses game started', juneDate),
      createConversationMessage(session2, 'system', 'Player-guesses game started', julyDate),
      createConversationMessage(session3, 'system', 'Player-guesses game started', augustDate),
    ]);

    const result = await db.getGameHistory(userId, '2025-07-01', '2025-07-31');

    expect(result).toHaveLength(1);
    expect(result[0].session_id).toBe(session2);
    expect(result[0].date).toBe('2025-07-15');
  });

  it('sorts results by date descending', async () => {
    const session1 = 'session-1';
    const session2 = 'session-2';
    const session3 = 'session-3';

    const date1 = new Date('2025-07-01');
    const date2 = new Date('2025-07-15');
    const date3 = new Date('2025-07-10');

    firestore.mockCollection('conversations', [
      createConversationMessage(session1, 'system', 'Player-guesses game started', date1),
      createConversationMessage(session2, 'system', 'Player-guesses game started', date2),
      createConversationMessage(session3, 'system', 'Player-guesses game started', date3),
    ]);

    const result = await db.getGameHistory(userId);

    expect(result).toHaveLength(3);
    expect(result[0].date).toBe('2025-07-15'); // Most recent first
    expect(result[1].date).toBe('2025-07-10');
    expect(result[2].date).toBe('2025-07-01');
  });

  it('ignores sessions without system messages', async () => {
    const sessionId = 'incomplete-session';
    const gameDate = new Date('2025-07-01');

    firestore.mockCollection('conversations', [
      createConversationMessage(sessionId, 'user', 'Is it an RPG?', gameDate),
      createConversationMessage(sessionId, 'model', 'Yes', gameDate),
    ]);

    const result = await db.getGameHistory(userId);

    expect(result).toHaveLength(0);
  });

  it('handles malformed JSON in model messages gracefully', async () => {
    const sessionId = 'malformed-json';
    const gameDate = new Date('2025-07-01');

    firestore.mockCollection('conversations', [
      createConversationMessage(sessionId, 'system', 'Player-guesses game started', gameDate),
      createConversationMessage(sessionId, 'user', 'Is it an RPG?', gameDate),
      createConversationMessage(sessionId, 'model', 'Invalid JSON {', gameDate),
    ]);

    const result = await db.getGameHistory(userId);

    expect(result).toHaveLength(1);
    expect(result[0].victory).toBe(false);
  });

  it('filters out system messages from question count', async () => {
    const sessionId = 'question-count-test';
    const gameDate = new Date('2025-07-01');

    firestore.mockCollection('conversations', [
      createConversationMessage(sessionId, 'system', 'Player-guesses game started', gameDate),
      createConversationMessage(sessionId, 'user', 'Game Started', gameDate), // Should be filtered
      createConversationMessage(sessionId, 'user', 'Is it an RPG?', gameDate), // Should count
      createConversationMessage(sessionId, 'model', 'Yes', gameDate),
      createConversationMessage(sessionId, 'user', 'answered: Yes', gameDate), // Should be filtered
      createConversationMessage(sessionId, 'user', 'Final guess', gameDate), // Should count
    ]);

    const result = await db.getGameHistory(userId);

    expect(result[0].question_count).toBe(2); // Only actual questions count
  });

  it('handles multiple sessions for same user', async () => {
    const session1 = 'session-1';
    const session2 = 'session-2';
    const gameDate = new Date('2025-07-01');

    firestore.mockCollection('conversations', [
      createConversationMessage(session1, 'system', 'Player-guesses game started', gameDate),
      createConversationMessage(session1, 'user', 'Question 1', gameDate),
      createConversationMessage(session2, 'system', 'AI-guesses game started', gameDate),
      createConversationMessage(session2, 'user', 'Answer 1', gameDate),
    ]);

    const result = await db.getGameHistory(userId);

    expect(result).toHaveLength(2);
    expect(result.map(r => r.session_id)).toContain(session1);
    expect(result.map(r => r.session_id)).toContain(session2);
  });

  it('returns only sessions for the specified user', async () => {
    const otherUserId = 'other-user';
    const sessionId = 'user-specific-session';
    const gameDate = new Date('2025-07-01');

    firestore.mockCollection('conversations', [
      // Messages for our user
      createConversationMessage(sessionId, 'system', 'Player-guesses game started', gameDate),
      // Messages for another user
      {
        user_id: otherUserId,
        session_id: 'other-session',
        role: 'system',
        content: 'Player-guesses game started',
        created_at: { toDate: () => gameDate },
      },
    ]);

    const result = await db.getGameHistory(userId);

    expect(result).toHaveLength(1);
    expect(result[0].session_id).toBe(sessionId);
  });
});
