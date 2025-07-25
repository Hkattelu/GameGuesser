import dotenv from 'dotenv';
dotenv.config({ path: '.development.env' });
import express from 'express';
import cors from 'cors';
import type { Express, Request, Response } from 'express';
import { getDailyGame } from './dailyGameStore.js';
import {
  startPlayerGuessesGame,
  handlePlayerQuestion,
  startAIGuessesGame,
  handleAIAnswer,
  getPlayerGuessHint,
  HintType,
} from './game.js';
import { authenticateToken } from './auth.js';
import { fetchGameDetailsByName } from './rawg.js';
import {
  saveConversationMessage,
  getConversationHistory,
  getConversationsBySession,
  getGameHistory,
  getLatestSession,
} from './db.js';

// Centralised game type helpers
import { isValidGameType, type GameType } from './gameType.js';
import './types.js';

const app: Express = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;

// Restrict cross-origin requests to the trusted frontend URL. Default to the
// local dev Vite server when the env var is not provided.
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

app.use(express.json());

app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
    credentials: true,
  }),
);

app.get('/conversations/history', authenticateToken, async (req: Request, res: Response) => {
  try {
    const date = req.query.date as string | undefined;
    const rows = await getConversationHistory(req.user?.uid, date);
    return res.json(rows);
  } catch (err) {
    console.error('Error fetching history', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * Fetches the conversation history for the logged-in user. Can be filtered by
 * day by providing a `date=YYYY-MM-DD` query parameter.
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 */


/**
 * Fetches the conversation history for a specific session.
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 */
app.get('/conversations/session/:sessionId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { gameType } = req.query as { gameType?: string };

    if (!gameType || !isValidGameType(gameType)) {
      return res.status(400).json({ error: 'Missing or invalid `gameType` query parameter' });
    }

    // `isValidGameType` refines the type at runtime, letting the compiler know
    // `gameType` is a valid `GameType` here.
    const rows = await getConversationsBySession(sessionId, gameType as GameType);
    return res.json(rows);
  } catch (err) {
    console.error('Error fetching session history', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * Fetches game history for the logged-in user filtered by the requested
 * `gameType` path parameter. Optional `startDate` and `endDate` query string
 * parameters (YYYY-MM-DD) further constrain the time range.
 *
 *  GET /games/history/:gameType
 *  e.g. /games/history/player-guesses?startDate=2025-07-01&endDate=2025-07-31
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
*/
app.get('/games/history/:gameType', authenticateToken, async (req: Request, res: Response) => {
  const { gameType } = req.params as { gameType: string };

  if (!isValidGameType(gameType)) {
    return res.status(400).json({ error: `Invalid gameType: ${gameType}` });
  }

  try {
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

    // Delegate heavy lifting to the existing helper and then filter locally –
    // avoids touching the DB layer for what is essentially a simple predicate.
    const allHistory = await getGameHistory(req.user?.uid, startDate, endDate);
    const filtered = allHistory.filter((h) => h.game_mode === gameType);

    return res.json(filtered);
  } catch (err) {
    console.error('Error fetching game history', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/game-state', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { gameMode, date } = req.query as { gameMode?: GameType; date?: string };

    if (!gameMode || !isValidGameType(gameMode) || !date) {
      return res.status(400).json({ error: 'Missing or invalid `gameMode` or `date` query parameter' });
    }

    const gameState = await getLatestSession(req.user?.uid, gameMode, date);

    if (!gameState) {
      return res.json(null);
    }

    return res.json(gameState);
  } catch (err) {
    console.error('Error fetching game state', err);
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
      req.user?.uid,
      result.sessionId,
      'player-guesses',
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
    await saveConversationMessage(
      req.user?.uid,
      sessionId,
      'player-guesses',
      'user',
      userInput,
    );

    const result = await handlePlayerQuestion(sessionId, userInput);

    // Persist model response as raw JSON string for readability
    await saveConversationMessage(
      req.user?.uid,
      sessionId,
      'player-guesses',
      'model',
      JSON.stringify(result),
    );

    res.json(result);
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message === 'Session not found.') return res.status(401).json({ error: err.message });
    if (err.message === 'Session ID and user input are required.')
      return res.status(400).json({ error: err.message });
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

/**
 * Gives the player a hint.
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 */
app.get('/player-guesses/:sessionId/hint/:hintType', authenticateToken, async (req: Request, res: Response) => {
  const { sessionId, hintType } = req.params as { sessionId: string, hintType: HintType };
  try {
    const hint = await getPlayerGuessHint(sessionId, hintType);
    await saveConversationMessage(
      req.user?.uid,
      sessionId,
      'player-guesses',
      'system',
      hint.hintText,
    );
    return res.json({ hint });
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message === 'Session not found.' || err.message === 'No hint data available') {
      return res.status(404).json({ error: err.message });
    }
    console.error('Error fetching hint:', err);
    return res.status(500).json({ error: 'Internal Server Error', details: err.message });
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
      req.user?.uid,
      result.sessionId,
      'ai-guesses',
      'system',
      'AI-guesses game started',
    );
    await saveConversationMessage(
      req.user?.uid,
      result.sessionId,
      'ai-guesses',
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
    await saveConversationMessage(
      req.user?.uid,
      sessionId,
      'ai-guesses',
      'user',
      userAnswer,
    );

    const result = await handleAIAnswer(sessionId, userAnswer);

    // Persist model response
    await saveConversationMessage(
      req.user?.uid,
      sessionId,
      'ai-guesses',
      'model',
      JSON.stringify(result.aiResponse),
    );

    res.json(result);
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message === 'Session not found.') return res.status(401).json({ error: err.message });
    if (err.message === 'Session ID and user answer are required.')
      return res.status(400).json({ error: err.message });
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

app.get('/game-details', authenticateToken, async (req: Request, res: Response) => {
  try {
    const secretGame = await getDailyGame();
    const gameDetails = await fetchGameDetailsByName(secretGame);
    if (gameDetails) {
      res.json(gameDetails);
    } else {
      res.status(404).json({ error: 'Game details not found.' });
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error fetching game details:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Backend server listening on port ${PORT}`);
  });
}

export default app;
