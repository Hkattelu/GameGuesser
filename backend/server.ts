import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import {
  startPlayerGuessesGame,
  handlePlayerQuestion,
  startAIGuessesGame,
  handleAIAnswer,
} from './game.ts';
import { authenticateToken, register, login } from './auth.ts';
import { saveConversationMessage, getConversationHistory } from './db.ts';

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;

// Restrict cross-origin requests to the trusted frontend URL. Default to the
// local dev Vite server when the env var is not provided.
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

app.use(express.json());

// Apply CORS headers early, before any route handlers run. We deliberately
// avoid `*` here because the backend sends credentials (Authorization header)
// and we only want the first-party SPA to be able to read the responses.
app.use((_: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', FRONTEND_ORIGIN);
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization',
  );
  next();
});

// Handle CORS preflight requests for **any** route in one place.
app.options('*', (_, res) => res.sendStatus(200));

/**
 * Registers a new user and returns a JWT token.
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 */
app.post('/auth/register', async (req: Request, res: Response) => {
  const { username, password } = req.body as { username: string; password: string };
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  try {
    const token = await register(username, password);
    return res.json({ token });
  } catch (err) {
    return res.status(400).json({ error: (err as Error).message });
  }
});

/**
 * Logs in an existing user and returns a JWT token.
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 */
app.post('/auth/login', async (req: Request, res: Response) => {
  const { username, password } = req.body as { username: string; password: string };
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  try {
    const token = await login(username, password);
    return res.json({ token });
  } catch (err) {
    return res.status(401).json({ error: (err as Error).message });
  }
});

/**
 * Fetches the full conversation history for the logged-in user.
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 */
app.get('/conversations/history', authenticateToken, async (req: Request, res: Response) => {
  try {
    const rows = await getConversationHistory(req.user!.id);
    return res.json(rows);
  } catch (err) {
    console.error('Error fetching history', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * Starts a new game of 20 Questions where the player thinks of an object and
 * the AI tries to guess what it is.
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 */
app.post('/player-guesses/start', authenticateToken, async (req: Request, res: Response) => {
  try {
    const result = await startPlayerGuessesGame();
    await saveConversationMessage(
      req.user!.id,
      result.sessionId,
      'system',
      'Player-guesses game started',
    );
    res.json(result);
  } catch (error: unknown) {
    const err = error as Error;
     
    console.error('Error starting player guesses game:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

/**
 * Handles a player's question in a game of 20 Questions.
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 */
app.post('/player-guesses/question', authenticateToken, async (req: Request, res: Response) => {
  const { sessionId, userInput } = req.body as { sessionId: string; userInput: string };
  try {
    // Persist user question
    await saveConversationMessage(req.user!.id, sessionId, 'user', userInput);

    const result = await handlePlayerQuestion(sessionId, userInput);

    // Persist model response as raw JSON string for readability
    await saveConversationMessage(
      req.user!.id,
      sessionId,
      'model',
      JSON.stringify(result),
    );

    res.json(result);
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message === 'Session not found.') return res.status(404).json({ error: err.message });
    if (err.message === 'Session ID and user input are required.')
      return res.status(400).json({ error: err.message });
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

/**
 * Starts a new game of 20 Questions where the AI thinks of an object and the
 * player tries to guess what it is.
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 */
app.post('/ai-guesses/start', authenticateToken, async (req: Request, res: Response) => {
  try {
    const result = await startAIGuessesGame();

    // Persist system message and first AI question
    await saveConversationMessage(
      req.user!.id,
      result.sessionId,
      'system',
      'AI-guesses game started',
    );
    await saveConversationMessage(
      req.user!.id,
      result.sessionId,
      'model',
      JSON.stringify(result.aiResponse),
    );

    res.json(result);
  } catch (error: unknown) {
    const err = error as Error;
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

/**
 * Handles a player's answer in a game of 20 Questions.
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 */
app.post('/ai-guesses/answer', authenticateToken, async (req: Request, res: Response) => {
  const { sessionId, userAnswer } = req.body as { sessionId: string; userAnswer: string };
  try {
    // Persist user answer
    await saveConversationMessage(req.user!.id, sessionId, 'user', userAnswer);

    const result = await handleAIAnswer(sessionId, userAnswer);

    // Persist model response
    await saveConversationMessage(
      req.user!.id,
      sessionId,
      'model',
      JSON.stringify(result.aiResponse),
    );

    res.json(result);
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message === 'Session not found.') return res.status(404).json({ error: err.message });
    if (err.message === 'Session ID and user answer are required.')
      return res.status(400).json({ error: err.message });
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

app.listen(PORT, () =>
  console.log(`Backend server listening on port ${PORT}`),
);

export default app;
