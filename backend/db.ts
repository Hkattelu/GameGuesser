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
  return username;
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
 * Retrieves the full conversation history for a user ordered by creation time.
 */
export async function getConversationHistory(
  userId: string,
): Promise<Pick<ConversationRow, 'session_id' | 'role' | 'content' | 'created_at'>[]> {
  const snap = await conversationsCol
    .where('user_id', '==', userId)
    .orderBy('created_at', 'asc')
    .get();

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
        (data.created_at as any) instanceof Timestamp
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