// C:\Users\himan\code\game-guessr\backend\server.js
import express from 'express';
import {
    startPlayerGuessesGame,
    handlePlayerQuestion,
    startAIGuessesGame,
    handleAIAnswer
} from './game.js';

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

/**
 * @route POST /player-guesses/start
 * @description Starts a new "Player Guesses" game session.
 * @returns {object} 200 - JSON object containing the new session ID.
 * @returns {object} 500 - Internal Server Error.
 */
app.post('/player-guesses/start', async (req, res) => {
    try {
        const result = await startPlayerGuessesGame();
        res.json(result);
    } catch (error) {
        console.error('Error starting player guesses game:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

/**
 * @route POST /player-guesses/question
 * @description Submits a player's question or guess for the secret game.
 * @param {object} req.body - JSON object containing the session ID and user input.
 * @param {string} req.body.sessionId - The ID of the game session.
 * @param {string} req.body.userInput - The player's question or guess.
 * @returns {object} 200 - JSON object with the AI's response.
 * @returns {object} 400 - If session ID or user input is missing.
 * @returns {object} 404 - If the session is not found.
 * @returns {object} 500 - Internal Server Error.
 */
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

/**
 * @route POST /ai-guesses/start
 * @description Starts a new "AI Guesses" game session.
 * @returns {object} 200 - JSON object containing the new session ID and the AI's first question.
 * @returns {object} 500 - Internal Server Error.
 */
app.post('/ai-guesses/start', async (req, res) => {
    try {
        const result = await startAIGuessesGame();
        res.json(result);
    } catch (error) {
        console.error('Error starting AI guesses game:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

/**
 * @route POST /ai-guesses/answer
 * @description Submits a user's answer to the AI's question.
 * @param {object} req.body - JSON object containing the session ID and user's answer.
 * @param {string} req.body.sessionId - The ID of the game session.
 * @param {string} req.body.userAnswer - The user's answer ("Yes", "No", etc.).
 * @returns {object} 200 - JSON object with the AI's next question or guess.
 * @returns {object} 400 - If session ID or user answer is missing.
 * @returns {object} 404 - If the session is not found.
 * @returns {object} 500 - Internal Server Error.
 */
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