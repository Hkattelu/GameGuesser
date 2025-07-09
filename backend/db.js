import Database from 'better-sqlite3';

// Initialize (or open existing) SQLite database. The file is created in the
// project root so that it is persisted between server restarts and even new
// Docker/image builds, as long as the volume is preserved.
//
// NOTE: The synchronous `better-sqlite3` API keeps the implementation simple
// and avoids callback/Promise hell while still being plenty fast for our tiny
// workload.

const db = new Database('./database.sqlite');

// Enable foreign-key constraints (disabled by default in SQLite until 3.42).
db.exec('PRAGMA foreign_keys = ON');

// Create the required tables if they do not already exist. We run this every
// start-up; it is effectively an idempotent migration.
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id           INTEGER      PRIMARY KEY AUTOINCREMENT,
    username     TEXT         NOT NULL UNIQUE,
    password_hash TEXT        NOT NULL,
    created_at   DATETIME     DEFAULT CURRENT_TIMESTAMP
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

// Simple helper prepared statements for common operations. Reusing prepared
// statements is faster and avoids SQL-injection mistakes.

const insertUserStmt = db.prepare(
  'INSERT INTO users (username, password_hash) VALUES (?, ?)' 
);

const findUserByUsernameStmt = db.prepare(
  'SELECT id, username, password_hash FROM users WHERE username = ?'
);

const insertConversationStmt = db.prepare(
  'INSERT INTO conversations (user_id, session_id, role, content) VALUES (?, ?, ?, ?)'
);

const selectConversationByUserStmt = db.prepare(
  'SELECT session_id, role, content, created_at FROM conversations WHERE user_id = ? ORDER BY id ASC'
);

export function createUser(username, passwordHash) {
  const info = insertUserStmt.run(username, passwordHash);
  return info.lastInsertRowid;
}

export function findUserByUsername(username) {
  return findUserByUsernameStmt.get(username);
}

export function saveConversationMessage(userId, sessionId, role, content) {
  insertConversationStmt.run(userId, sessionId, role, content);
}

export function getConversationHistory(userId) {
  return selectConversationByUserStmt.all(userId);
}

export default db;
