// backend/server.js
// Express application entry with authentication and persistence.

import express from 'express';
import cors from 'cors';

import {
  startPlayerGuessesGame,
  handlePlayerQuestion,
  startAIGuessesGame,
  handleAIAnswer,
} from './game.js';

import { register, login, authenticate } from './auth.js';
import { getConversations } from './store.js';

const app = express();
const port = process.env.PORT || 8080;

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

app.use(express.json());

// Allow CORS from any origin in development – replace with your frontend URL
app.use(
  cors({
    origin: true,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// ---------------------------------------------------------------------------
// Auth routes
// ---------------------------------------------------------------------------

app.post('/auth/register', register);
app.post('/auth/login', login);

// ---------------------------------------------------------------------------
// Conversation history (protected)
// ---------------------------------------------------------------------------

app.get('/conversations', authenticate, (req, res) => {
  const userId = req.user.id;
  const convos = getConversations(userId);
  res.json(convos);
});

// ---------------------------------------------------------------------------
// Game routes (protected)
// ---------------------------------------------------------------------------

// Player guesses game
app.post('/player-guesses/start', authenticate, async (req, res) => {
  try {
    const result = await startPlayerGuessesGame(req.user.id);
    res.json(result);
  } catch (err) {
    console.error('Error starting player guesses game:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/player-guesses/question', authenticate, async (req, res) => {
  const { sessionId, userInput } = req.body;
  try {
    const result = await handlePlayerQuestion(sessionId, userInput, req.user.id);
    res.json(result);
  } catch (err) {
    console.error('Error handling player question:', err);
    if (err.message === 'Session not found.' || err.message === 'Session not found') {
      return res.status(404).json({ error: err.message });
    }
    res.status(400).json({ error: err.message });
  }
});

// AI guesses game
app.post('/ai-guesses/start', authenticate, async (req, res) => {
  try {
    const result = await startAIGuessesGame(req.user.id);
    res.json(result);
  } catch (err) {
    console.error('Error starting AI guesses game:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/ai-guesses/answer', authenticate, async (req, res) => {
  const { sessionId, userAnswer } = req.body;
  try {
    const result = await handleAIAnswer(sessionId, userAnswer, req.user.id);
    res.json(result);
  } catch (err) {
    console.error('Error handling AI answer:', err);
    if (err.message === 'Session not found.' || err.message === 'Session not found') {
      return res.status(404).json({ error: err.message });
    }
    res.status(400).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Fallback
// ---------------------------------------------------------------------------

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

app.listen(port, () => {
  console.log(`Backend server listening on port ${port}`);
});

export default app;
