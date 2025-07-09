// C:\Users\himan\code\game-guessr\backend\server.js
import express from 'express';
import {
    startPlayerGuessesGame,
    handlePlayerQuestion,
    startAIGuessesGame,
    handleAIAnswer
} from './game.ts';

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());

// Allow CORS from your frontend origin
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*'); // Replace with your frontend URL in production
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// Handle preflight requests for all routes
app.options('*', (req, res) => {
    res.sendStatus(200);
});

// New endpoint for Player Guesses Game: Start a new game
app.post('/player-guesses/start', async (req, res) => {
    try {
        const result = await startPlayerGuessesGame();
        res.json(result);
    } catch (error) {
        console.error('Error starting player guesses game:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

// New endpoint for Player Guesses Game: Handle player questions
app.post('/player-guesses/question', async (req, res) => {
    const { sessionId, userInput } = req.body;
    try {
        const result = await handlePlayerQuestion(sessionId, userInput);
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
app.post('/ai-guesses/start', async (req, res) => {
    try {
        const result = await startAIGuessesGame();
        res.json(result);
    } catch (error) {
        console.error('Error starting AI guesses game:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

// New endpoint for AI Guesses Game: Handle user answers
app.post('/ai-guesses/answer', async (req, res) => {
    const { sessionId, userAnswer } = req.body;
    try {
        const result = await handleAIAnswer(sessionId, userAnswer);
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
