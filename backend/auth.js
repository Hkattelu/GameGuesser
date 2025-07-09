// backend/auth.js
// User registration and login utilities.

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import {
  getUserByUsername,
  addUser,
  getUserById,
} from './store.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const TOKEN_EXPIRY = '7d';

export async function register(req, res) {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  if (getUserByUsername(username)) {
    return res.status(409).json({ error: 'Username already exists' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const id = uuidv4();
    addUser({ id, username, passwordHash });
    const token = jwt.sign({ id, username }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
    return res.json({ token, user: { id, username } });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function login(req, res) {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const user = getUserByUsername(username);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
  return res.json({ token, user: { id: user.id, username: user.username } });
}

// Middleware to protect routes.
export function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = getUserById(payload.id);
    if (!user) {
      return res.status(401).json({ error: 'User no longer exists' });
    }
    req.user = { id: user.id, username: user.username };
    next();
  } catch (err) {
    console.error('JWT verification error:', err);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
