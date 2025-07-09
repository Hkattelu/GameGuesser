import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createUser, findUserByUsername } from './db.js';

// A real application would configure this via an environment variable. We fall
// back to a hard-coded value for local dev to keep the demo simple.
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-game-boy-key';

export function register(username, password) {
  const existing = findUserByUsername(username);
  if (existing) {
    throw new Error('Username already taken');
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const userId = createUser(username, passwordHash);
  return generateToken({ id: userId, username });
}

export function login(username, password) {
  const user = findUserByUsername(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    throw new Error('Invalid credentials');
  }
  return generateToken({ id: user.id, username: user.username });
}

function generateToken(payload) {
  // Token valid for 7 days, plenty for a casual web game.
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Missing token' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(401).json({ error: 'Invalid token' });
    req.user = user; // attach {id, username}
    next();
  });
}
