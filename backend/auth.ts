import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

import { createUser, findUserByUsername } from './db.js';

export interface JWTPayload {
  id: string; // Firestore doc ID (username)
  username: string;
}

const isProd = process.env.NODE_ENV === 'production';

if (!process.env.JWT_SECRET && isProd) {
  throw new Error('JWT_SECRET must be configured in production');
}

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-game-boy-key';

export async function register(username: string, password: string): Promise<string> {
  if (!username || !password) throw new Error('Username and password required');

  const existing = await findUserByUsername(username);
  if (existing) throw new Error('Username already taken');

  const passwordHash = bcrypt.hashSync(password, 10);
  const userId = await createUser(username, passwordHash);
  return generateToken({ id: userId, username });
}

export async function login(username: string, password: string): Promise<string> {
  const user = await findUserByUsername(username);
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

/**
 * Express middleware that authenticates a request using a JWT Bearer token.
 * 
 * Extracts the Bearer token from the Authorization header and verifies it
 * using the server's secret key. If the token is valid, the decoded payload
 * is attached to `req.user`. If the token is missing or invalid, a 401
 * Unauthorized response is sent.
 * 
 * @param {Request} req - The Express request object, expected to have an Authorization header.
 * @param {Response} res - The Express response object, used to send a response in case of error.
 * @param {NextFunction} next - The next middleware function in the stack.
 */
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
