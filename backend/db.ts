import Database from 'better-sqlite3';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
}

export interface ConversationRow {
  id: number;
  user_id: number;
  session_id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Database initialisation
// ---------------------------------------------------------------------------

// The SQLite file lives in the project root so data persists across restarts.
const db = new Database('./database.sqlite');

// Enable foreign-key constraints (disabled by default in SQLite < 3.42)
db.exec('PRAGMA foreign_keys = ON');

// Idempotent schema setup – runs on every process start.
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER      PRIMARY KEY AUTOINCREMENT,
    username      TEXT         NOT NULL UNIQUE,
    password_hash TEXT         NOT NULL,
    created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id          INTEGER      PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER      NOT NULL,
    session_id  TEXT         NOT NULL,
    role        TEXT         NOT NULL,
    content     TEXT         NOT NULL,
    created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// ---------------------------------------------------------------------------
// Prepared statements – helps performance & guards against SQL injection.
// ---------------------------------------------------------------------------

const insertUserStmt = db.prepare<[
  string,
  string,
]>('INSERT INTO users (username, password_hash) VALUES (?, ?)');

const findUserByUsernameStmt = db.prepare<[
  string,
], UserRow>('SELECT id, username, password_hash, created_at FROM users WHERE username = ?');

const insertConversationStmt = db.prepare<[
  number,
  string,
  string,
  string,
]>('INSERT INTO conversations (user_id, session_id, role, content) VALUES (?, ?, ?, ?)');

const selectConversationByUserStmt = db.prepare<[
  number,
], ConversationRow>('SELECT session_id, role, content, created_at FROM conversations WHERE user_id = ? ORDER BY id ASC');

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

export function createUser(username: string, passwordHash: string): number {
  const info = insertUserStmt.run(username, passwordHash);
  return Number(info.lastInsertRowid);
}

export function findUserByUsername(username: string): UserRow | undefined {
  return findUserByUsernameStmt.get(username);
}

export function saveConversationMessage(
  userId: number,
  sessionId: string,
  role: ConversationRow['role'],
  content: string,
): void {
  insertConversationStmt.run(userId, sessionId, role, content);
}

export function getConversationHistory(userId: number): Pick<ConversationRow, 'session_id' | 'role' | 'content' | 'created_at'>[] {
  return selectConversationByUserStmt.all(userId);
}

export default db;
