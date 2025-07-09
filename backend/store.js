// backend/store.js
// Simple JSON file-based persistent storage for users and conversations.
// NOTE: This is *not* intended for production-scale workloads; it is a quick
// persistence layer that survives restarts for demo purposes.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure the data directory exists next to this file: backend/data
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

const STORE_FILE = path.join(dataDir, 'store.json');

// Default structure of the JSON store.
const DEFAULT_STORE = {
  users: [], // Array<{ id: string, username: string, passwordHash: string }>
  conversations: {}, // Record<userId, Record<sessionId, any>>
};

function readStore() {
  try {
    if (!fs.existsSync(STORE_FILE)) {
      return { ...DEFAULT_STORE };
    }
    const raw = fs.readFileSync(STORE_FILE, 'utf8');
    return raw ? JSON.parse(raw) : { ...DEFAULT_STORE };
  } catch (err) {
    console.error('Failed to read persistent store, falling back to defaults:', err);
    return { ...DEFAULT_STORE };
  }
}

function writeStore(store) {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write persistent store:', err);
  }
}

// In-memory copy for fast reads/writes during runtime.
let cache = readStore();

function persist() {
  writeStore(cache);
}

// Exported API

export function getUserByUsername(username) {
  return cache.users.find((u) => u.username === username);
}

export function getUserById(userId) {
  return cache.users.find((u) => u.id === userId);
}

export function addUser(user) {
  cache.users.push(user);
  persist();
}

export function getConversations(userId) {
  return cache.conversations[userId] || {};
}

export function saveConversation(userId, sessionId, sessionData) {
  if (!cache.conversations[userId]) {
    cache.conversations[userId] = {};
  }
  cache.conversations[userId][sessionId] = sessionData;
  persist();
}

export function deleteConversationsForUser(userId) {
  delete cache.conversations[userId];
  persist();
}

export function clearAll() {
  cache = { ...DEFAULT_STORE };
  persist();
}
