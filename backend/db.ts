import { Firestore, Timestamp } from '@google-cloud/firestore';

export const firestore = new Firestore({
  /** GCP project ID */
  projectId: process.env.GCP_PROJECT_ID,
  /**
   * Path to a service-account key JSON file – only required for local dev when
   * you are not using `gcloud auth application-default login`.
   *
   * Set via the GOOGLE_APPLICATION_CREDENTIALS env var instead of hard-coding.
   */
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

/**
* Returns the singleton Firestore instance used by the application. Having a
* typed accessor allows test suites to obtain the *mocked* instance without
* resorting to double `as unknown as` casts.
*/
export function getFirestoreInstance(): Firestore {
  return firestore;
}

const usersCol = firestore.collection('users');
const conversationsCol = firestore.collection('conversations');
const dailyGamesCol = firestore.collection('dailyGames');

export interface UserRow {
  id: string; // Doc ID – equals `username` for simplicity.
  username: string;
  password_hash: string;
  created_at: string; // ISO timestamp string for easy transport.
}

export interface ConversationRow {
  id: string; // Firestore document ID
  user_id: string;
  session_id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  created_at: string | Timestamp; // Stored as Firestore Timestamp, returned as ISO string
}

export interface DailyGameRow {
  id: string; // Doc ID – equals `YYYY-MM-DD` for simplicity.
  gameName: string;
}

/**
 * Creates a new user document. The document ID is the `username`, which keeps
 * lookups fast and guarantees uniqueness without an additional index.
 */
export async function createUser(username: string, passwordHash: string): Promise<string> {
  const docRef = usersCol.doc(username);
  await docRef.set({
    username,
    password_hash: passwordHash,
    created_at: new Date().toISOString(),
  });
  return docRef.id;
}

/** Returns a user by username or undefined when none exists. */
export async function findUserByUsername(username: string): Promise<UserRow | undefined> {
  const doc = await usersCol.doc(username).get();
  if (!doc.exists) return undefined;
  const data = doc.data() as Omit<UserRow, 'id'>;
  return { id: doc.id, ...data } satisfies UserRow;
}

/**
 * Persists a single conversation message. We store all messages flat in the
 * `conversations` collection keyed by Firestore's auto-id. This avoids deep
 * sub-collection queries and keeps indexes simple.
 */
export async function saveConversationMessage(
  userId: string,
  sessionId: string,
  role: ConversationRow['role'],
  content: string,
): Promise<void> {
  await conversationsCol.add({
    user_id: userId,
    session_id: sessionId,
    role,
    content,
    created_at: Timestamp.now(),
  });
}

/**
 * Retrieves the conversation history for a user, optionally filtered by day.
 * If no date is provided, it fetches conversations from all time.
 */
export async function getConversationHistory(
  userId: string,
  date?: string,
): Promise<Pick<ConversationRow, 'session_id' | 'role' | 'content' | 'created_at'>[]> {
  let query = conversationsCol.where('user_id', '==', userId);

  if (date) {
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    query = query
      .where('created_at', '>=', Timestamp.fromDate(startOfDay))
      .where('created_at', '<=', Timestamp.fromDate(endOfDay));
  }

  const snap = await query.orderBy('created_at', 'asc').get();

  return snap.docs.map((d) => {
    const data = d.data() as ConversationRow;
    return {
      session_id: data.session_id,
      role: data.role,
      content: data.content,
      created_at:
        (data.created_at as any) instanceof Timestamp
          ? (data.created_at as Timestamp).toDate().toISOString()
          : String(data.created_at),
    };
  });
}

export interface GameSession {
  session_id: string;
  date: string;
  game_mode: 'player-guesses' | 'ai-guesses';
  victory: boolean;
  question_count: number;
  total_questions: number;
  game_name?: string;
  /** Fractional score for the guess that resolved the session (if available) */
  score?: number;
  /** Whether the player used a hint in this session */
  used_hint?: boolean;
}

/**
 * Retrieves game session statistics for a user, optionally filtered by date range.
 * Analyzes conversation history to extract game sessions and their outcomes.
 */
export async function getGameHistory(
  userId: string,
  startDate?: string,
  endDate?: string,
): Promise<GameSession[]> {
  let query = conversationsCol.where('user_id', '==', userId);

  if (startDate && endDate) {
    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);

    query = query
      .where('created_at', '>=', Timestamp.fromDate(start))
      .where('created_at', '<=', Timestamp.fromDate(end));
  }

  const snap = await query.orderBy('created_at', 'asc').get();
  const conversations = snap.docs.map((d) => d.data() as ConversationRow);

  // Group conversations by session_id
  const sessionGroups = new Map<string, ConversationRow[]>();
  conversations.forEach((conv) => {
    if (!sessionGroups.has(conv.session_id)) {
      sessionGroups.set(conv.session_id, []);
    }
    sessionGroups.get(conv.session_id)!.push(conv);
  });

  const gameSessions: GameSession[] = [];

  // Analyze each session to extract game data
  sessionGroups.forEach((messages, sessionId) => {
    const systemMessage = messages.find(m => m.role === 'system');
    if (!systemMessage) return;

    const gameMode = systemMessage.content.includes('Player-guesses') 
      ? 'player-guesses' as const
      : 'ai-guesses' as const;

    const userMessages = messages.filter(m => m.role === 'user');
    const modelMessages = messages.filter(m => m.role === 'model');

    let victory = false;
    let gameName: string | undefined;
    let score: number | undefined;
    let usedHint: boolean | undefined;
    let questionCount = 0;

    // Count actual questions (exclude system messages)
    if (gameMode === 'player-guesses') {
      questionCount = userMessages.filter(m => 
        !m.content.includes('Game Started') && 
        !m.content.includes('answered:')
      ).length;
    } else {
      questionCount = userMessages.filter(m => 
        !m.content.includes('Game Started')
      ).length;
    }

    // Check for victory conditions
    for (const msg of modelMessages) {
      try {
        const parsed = JSON.parse(msg.content);
        if (parsed.type === 'guessResult') {
          // Capture score / hint regardless of correctness so that the frontend
          // can render partial results.
          if (typeof parsed.content?.score === 'number') {
            score = parsed.content.score;
          }
          if (typeof parsed.content?.usedHint === 'boolean') {
            usedHint = parsed.content.usedHint;
          }

          if (parsed.content?.correct) {
            victory = true;
            gameName = parsed.content.response;
            break;
          }
        }
      } catch {
        // Check plain text victory messages
        if (msg.content.includes('You guessed it!') || msg.content.includes('correct')) {
          victory = true;
          break;
        }
      }
    }

    // Get the date from the first message
    const firstMessage = messages[0];
    const date = (firstMessage.created_at as any)?.toDate
      ? (firstMessage.created_at as Timestamp).toDate().toISOString().split('T')[0]
      : new Date(firstMessage.created_at as string).toISOString().split('T')[0];

    gameSessions.push({
      session_id: sessionId,
      date,
      game_mode: gameMode,
      victory,
      question_count: questionCount,
      total_questions: 20,
      game_name: gameName,
      score,
      used_hint: usedHint,
    });
  });

  return gameSessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}


/**
 * Retrieves the full conversation history for a user ordered by creation time.
 */
export async function getConversationsBySession(
  sessionId: string,
): Promise<Pick<ConversationRow, 'session_id' | 'role' | 'content' | 'created_at'>[]> {
  const snap = await conversationsCol
    .where('session_id', '==', sessionId)
    .orderBy('created_at', 'asc')
    .get();

  return snap.docs.map((d) => {
    const data = d.data() as ConversationRow;
    return {
      session_id: data.session_id,
      role: data.role,
      content: data.content,
      created_at:
        (data.created_at as any)?.toDate
          ? (data.created_at as Timestamp).toDate().toISOString()
          : String(data.created_at),
    };
  });
}

/** Returns a daily game by date string (YYYY-MM-DD) or undefined when none exists. */
export async function getDailyGame(dateKey: string): Promise<string | undefined> {
  const doc = await dailyGamesCol.doc(dateKey).get();
  if (!doc.exists) return undefined;
  const data = doc.data() as Omit<DailyGameRow, 'id'>;
  return data.gameName;
}

/**
 * Creates a new daily game document. The document ID is the date string to
 * keep lookups fast and guarantees uniqueness without an additional index.
 */
export async function saveDailyGame(dateKey: string, gameName: string): Promise<void> {
  const docRef = dailyGamesCol.doc(dateKey);
  await docRef.set({
    gameName,
  });
}

/**
 * Retrieves the most recent daily games.
 * @param n The number of recent games to retrieve.
 * @returns A list of the most recent daily games.
 */
export async function getRecentDailyGames(n: number): Promise<DailyGameRow[]> {
  const snap = await dailyGamesCol.orderBy('__name__', 'desc').limit(n).get();
  return snap.docs.map((d) => {
    const data = d.data() as Omit<DailyGameRow, 'id'>;
    return { id: d.id, ...data } satisfies DailyGameRow;
  });
}
