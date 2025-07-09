import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

import { createUser, findUserByUsername } from './db.js';

// ---------------------------------------------------------------------------
// Types & interfaces
// ---------------------------------------------------------------------------

export interface JWTPayload {
  id: number;
  username: string;
}

// Express augments the Request object with `user` once authentication succeeds.
declare module 'express-serve-static-core' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Request {
    user?: JWTPayload;
  }
}

// ---------------------------------------------------------------------------
// Config – ensure secret exists in production.
// ---------------------------------------------------------------------------

const isProd = process.env.NODE_ENV === 'production';

if (!process.env.JWT_SECRET && isProd) {
  throw new Error('JWT_SECRET must be configured in production');
}

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-game-boy-key';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function register(username: string, password: string): string {
  if (!username || !password) throw new Error('Username and password required');

  const existing = findUserByUsername(username);
  if (existing) throw new Error('Username already taken');

  const passwordHash = bcrypt.hashSync(password, 10);
  const userId = createUser(username, passwordHash);
  return generateToken({ id: userId, username });
}

export function login(username: string, password: string): string {
  const user = findUserByUsername(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    throw new Error('Invalid credentials');
  }
  return generateToken({ id: user.id, username: user.username });
}

function generateToken(payload: JWTPayload): string {
  // Token valid for 7 days, plenty for a casual web game.
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

// Express-style middleware – validates the Bearer token and populates req.user.
import type { Request, Response, NextFunction } from 'express';

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Missing token' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err || !user) return res.status(401).json({ error: 'Invalid token' });
    req.user = user as JWTPayload;
    next();
  });
}
