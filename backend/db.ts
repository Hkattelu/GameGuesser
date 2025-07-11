import { firestore } from './firestoreClient.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UserRow {
  id: string; // Firestore document ID (string UUID)
  username: string;
  password_hash: string;
  created_at: string; // ISO string
}

export interface ConversationRow {
  id: string; // Firestore document ID
  user_id: string;
  session_id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  created_at: string; // ISO string
}

// ---------------------------------------------------------------------------
// Collection references (kept as constants to avoid typos)
// ---------------------------------------------------------------------------

const usersCol = firestore.collection('users');
const conversationsCol = firestore.collection('conversations');

// ---------------------------------------------------------------------------
// Public helpers – users
// ---------------------------------------------------------------------------

/**
* Creates a new user document and returns its generated id.
*
* @param username The account's username.
* @param passwordHash BCrypt hash stored as-is.
*/
export async function createUser(username: string, passwordHash: string): Promise<string> {
  const now = new Date().toISOString();
  const docRef = await usersCol.add({
    username,
    password_hash: passwordHash,
    created_at: now,
  });
  return docRef.id;
}

/**
* Finds a user by its unique username.
*/
export async function findUserByUsername(username: string): Promise<UserRow | undefined> {
  const snap = await usersCol.where('username', '==', username).limit(1).get();
  if (snap.empty) return undefined;
  const doc = snap.docs[0];
  const data = doc.data() as Omit<UserRow, 'id'>;
  return { id: doc.id, ...data } satisfies UserRow;
}

// ---------------------------------------------------------------------------
// Public helpers – conversations
// ---------------------------------------------------------------------------

/**
* Persists a single conversation message.
*/
export async function saveConversationMessage(
  userId: string,
  sessionId: string,
  role: ConversationRow['role'],
  content: string,
): Promise<void> {
  const now = new Date().toISOString();
  await conversationsCol.add({
    user_id: userId,
    session_id: sessionId,
    role,
    content,
    created_at: now,
  });
}

export async function getConversationHistory(
  userId: string,
): Promise<Pick<ConversationRow, 'session_id' | 'role' | 'content' | 'created_at'>[]> {
  const snap = await conversationsCol
    .where('user_id', '==', userId)
    .orderBy('created_at', 'asc')
    .get();

  return snap.docs.map((doc) => {
    const { session_id, role, content, created_at } = doc.data() as ConversationRow;
    return { session_id, role, content, created_at };
  });
}
