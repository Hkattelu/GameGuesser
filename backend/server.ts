import express, { Request, Response, NextFunction } from 'express';
import {
  startPlayerGuessesGame,
  handlePlayerQuestion,
  startAIGuessesGame,
  handleAIAnswer,
} from './game.js';

// Auth & persistence helpers
import { authenticateToken, register, login } from './auth.js';
import { saveConversationMessage, getConversationHistory } from './db.js';

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;

app.use(express.json());

// ---------------------------------------------------------------------------
// Auth routes
// ---------------------------------------------------------------------------

app.post('/auth/register', (req: Request, res: Response) => {
  const { username, password } = req.body as { username: string; password: string };
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  try {
    const token = register(username, password);
    return res.json({ token });
  } catch (err) {
    return res.status(400).json({ error: (err as Error).message });
  }
});

app.post('/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body as { username: string; password: string };
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  try {
    const token = login(username, password);
    return res.json({ token });
  } catch (err) {
    return res.status(401).json({ error: (err as Error).message });
  }
});

// Fetch full conversation history for the logged-in user.
app.get('/conversations/history', authenticateToken, (req: Request, res: Response) => {
  try {
    const rows = getConversationHistory(req.user!.id);
    return res.json(rows);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error fetching history', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Allow CORS from any origin (adjust for production)
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

app.options('*', (_, res) => res.sendStatus(200));

// Player-guesses endpoints
app.post('/player-guesses/start', authenticateToken, async (req: Request, res: Response) => {
    try {
        const result = await startPlayerGuessesGame();
        saveConversationMessage(req.user!.id, result.sessionId, 'system', 'Player-guesses game started');
        res.json(result);
    } catch (error: unknown) {
        const err = error as Error;
        // eslint-disable-next-line no-console
        console.error('Error starting player guesses game:', err);
        res.status(500).json({ error: 'Internal Server Error', details: err.message });
    }
});

app.post('/player-guesses/question', authenticateToken, async (req: Request, res: Response) => {
    const { sessionId, userInput } = req.body as { sessionId: string; userInput: string };
    try {
        // Persist user question
        saveConversationMessage(req.user!.id, sessionId, 'user', userInput);

        const result = await handlePlayerQuestion(sessionId, userInput);

        // Persist model response as raw JSON string for readability
        saveConversationMessage(req.user!.id, sessionId, 'model', JSON.stringify(result));

        res.json(result);
    } catch (error: unknown) {
        const err = error as Error;
        // eslint-disable-next-line no-console
        console.error('Error handling player question:', err);
        if (err.message === 'Session not found.') return res.status(404).json({ error: err.message });
        if (err.message === 'Session ID and user input are required.')
            return res.status(400).json({ error: err.message });
        res.status(500).json({ error: 'Internal Server Error', details: err.message });
    }
});

// AI-guesses endpoints
app.post('/ai-guesses/start', authenticateToken, async (req: Request, res: Response) => {
    try {
        const result = await startAIGuessesGame();

        // Persist system message and first AI question
        saveConversationMessage(req.user!.id, result.sessionId, 'system', 'AI-guesses game started');
        saveConversationMessage(req.user!.id, result.sessionId, 'model', JSON.stringify(result.aiResponse));

        res.json(result);
    } catch (error: unknown) {
        const err = error as Error;
        // eslint-disable-next-line no-console
        console.error('Error starting AI guesses game:', err);
        res.status(500).json({ error: 'Internal Server Error', details: err.message });
    }
});

app.post('/ai-guesses/answer', authenticateToken, async (req: Request, res: Response) => {
    const { sessionId, userAnswer } = req.body as { sessionId: string; userAnswer: string };
    try {
        // Persist user answer
        saveConversationMessage(req.user!.id, sessionId, 'user', userAnswer);

        const result = await handleAIAnswer(sessionId, userAnswer);

        // Persist model response
        saveConversationMessage(req.user!.id, sessionId, 'model', JSON.stringify(result.aiResponse));

        res.json(result);
    } catch (error: unknown) {
        const err = error as Error;
        // eslint-disable-next-line no-console
        console.error('Error handling AI answer:', err);
        if (err.message === 'Session not found.') return res.status(404).json({ error: err.message });
        if (err.message === 'Session ID and user answer are required.')
            return res.status(400).json({ error: err.message });
        res.status(500).json({ error: 'Internal Server Error', details: err.message });
    }
});

app.listen(PORT, () =>
  // eslint-disable-next-line no-console
  console.log(`Backend server listening on port ${PORT}`),
);

export default app;
