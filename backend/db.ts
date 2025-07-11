import { Firestore, Timestamp } from '@google-cloud/firestore';

// ---------------------------------------------------------------------------
// Firestore initialisation
// ---------------------------------------------------------------------------

// The client will automatically pick up credentials from the standard
// GOOGLE_APPLICATION_CREDENTIALS environment variable when running in a local
// environment. In production (Cloud Functions, Cloud Run, App Engine, etc.) the
// default service account is used. You can override any field below via env
// vars as needed.

export const firestore = new Firestore({
  /**
   * Your GCP project ID. Leave undefined to let the SDK infer the project from
   * credentials.
   */
  projectId: process.env.GCP_PROJECT_ID /* || 'your-project-id' */,
  /**
   * Path to a service-account key JSON file – only required for local dev when
   * you are not using `gcloud auth application-default login`.
   *
   * Set via the GOOGLE_APPLICATION_CREDENTIALS env var instead of hard-coding.
   */
  // keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

// Re-use collection references to avoid re-allocating on every call.
const usersCol = firestore.collection('users');
const conversationsCol = firestore.collection('conversations');

// ---------------------------------------------------------------------------
// Types – mirror Firestore document layouts.
// ---------------------------------------------------------------------------

export interface UserRow {
  id: string; // Doc ID – equals `username` for simplicity.
  username: string;
  password_hash: string;
  created_at: string; // ISO timestamp string for easy transport.
}

export interface ConversationRow {
  id: string; // Firestore document ID (unused externally)
  user_id: string;
  session_id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  created_at: string | Timestamp; // Stored as Firestore Timestamp, returned as ISO string
}

// ---------------------------------------------------------------------------
// Public helpers – CRUD operations translated from SQLite to Firestore.
// ---------------------------------------------------------------------------

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

/**
* Returns a user by username or undefined when none exists.
*/
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
