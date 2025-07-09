// C:\Users\himan\code\game-guessr\backend\server.js
import express from 'express';
import {
    startPlayerGuessesGame,
    handlePlayerQuestion,
    startAIGuessesGame,
    handleAIAnswer,
    getSession
} from './game.js';

// Auth & persistence helpers
import { authenticateToken, register, login } from './auth.js';
import { saveConversationMessage, getConversationHistory } from './db.js';

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());

// ---------- Auth routes ----------
app.post('/auth/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }
    try {
        const token = register(username, password);
        res.json({ token });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.post('/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }
    try {
        const token = login(username, password);
        res.json({ token });
    } catch (err) {
        res.status(401).json({ error: err.message });
    }
});

// Protected route to fetch full conversation history for the authenticated user.
app.get('/conversations/history', authenticateToken, (req, res) => {
    try {
        const rows = getConversationHistory(req.user.id);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching history', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Allow CORS from your frontend origin
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*'); // Replace with your frontend URL in production
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    next();
});

// Handle preflight requests for all routes
app.options('*', (req, res) => {
    res.sendStatus(200);
});

// New endpoint for Player Guesses Game: Start a new game
app.post('/player-guesses/start', authenticateToken, async (req, res) => {
    try {
        const result = await startPlayerGuessesGame();
        // Persist system message indicating new session creation
        saveConversationMessage(req.user.id, result.sessionId, 'system', 'Player-guesses game started');
        res.json(result);
    } catch (error) {
        console.error('Error starting player guesses game:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

// New endpoint for Player Guesses Game: Handle player questions
app.post('/player-guesses/question', authenticateToken, async (req, res) => {
    const { sessionId, userInput } = req.body;
    try {
        // Persist user question
        saveConversationMessage(req.user.id, sessionId, 'user', userInput);

        const result = await handlePlayerQuestion(sessionId, userInput);

        // Persist model response (stringify to keep same format as frontend displays)
        saveConversationMessage(req.user.id, sessionId, 'model', JSON.stringify(result));

        res.json(result);
    } catch (error) {
        console.error('Error handling player question:', error);
        if (error.message === 'Session not found.') {
            return res.status(404).json({ error: error.message });
        }
        if (error.message === 'Session ID and user input are required.') {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

// New endpoint for AI Guesses Game: Start a new game
app.post('/ai-guesses/start', authenticateToken, async (req, res) => {
    try {
        const result = await startAIGuessesGame();

        // Persist a system message and the first AI question
        saveConversationMessage(req.user.id, result.sessionId, 'system', 'AI-guesses game started');
        saveConversationMessage(req.user.id, result.sessionId, 'model', JSON.stringify(result.aiResponse));

        res.json(result);
    } catch (error) {
        console.error('Error starting AI guesses game:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

// New endpoint for AI Guesses Game: Handle user answers
app.post('/ai-guesses/answer', authenticateToken, async (req, res) => {
    const { sessionId, userAnswer } = req.body;
    try {
        // Persist user answer
        saveConversationMessage(req.user.id, sessionId, 'user', userAnswer);

        const result = await handleAIAnswer(sessionId, userAnswer);

        // Persist model response
        saveConversationMessage(req.user.id, sessionId, 'model', JSON.stringify(result.aiResponse));

        res.json(result);
    } catch (error) {
        console.error('Error handling AI answer:', error);
        if (error.message === 'Session not found.') {
            return res.status(404).json({ error: error.message });
        }
        if (error.message === 'Session ID and user answer are required.') {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

app.listen(port, () => {
    console.log(`Backend server listening on port ${port}`);
});

export default app;
