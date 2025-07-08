import express from 'express';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());

// In-memory store for game sessions (for a real app, use a database like Firestore or Redis)
const gameSessions = new Map();

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

// Endpoint for AI Guesses Game (existing functionality)
app.post('/gemini-proxy', async (req, res) => {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

  const contents = req.body.contents;

  if (!contents) {
    return res.status(400).json({ error: 'Contents are required in the request body.' });
  }

  const geminiRequestBody = {
    contents: contents,
    generationConfig: {
      responseMimeType: "application/json",
    }
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(geminiRequestBody),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error from Gemini API:', errorData);
      return res.status(response.status).json({ error: 'Gemini API Error', details: errorData });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error proxying to Gemini API:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// New endpoint for Player Guesses Game: Start a new game
app.post('/player-guesses/start', async (req, res) => {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

  const sessionId = uuidv4();
  let secretGame = null;

  // Prompt Gemini to think of a game
  const initialPrompt = `You are Game Boy, a friendly robot thinking of a secret video game. The user will ask yes/no questions to guess it.
            Your response MUST be a JSON object with a 'secretGame' field.
            Example: {"secretGame": "The Witcher 3: Wild Hunt"}`;

  const geminiRequestBody = {
    contents: [
      {
        role: "user",
        parts: [{text: initialPrompt}]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json",
    }
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(geminiRequestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error from Gemini API (secret game generation):', errorData);
      return res.status(response.status).json({ error: 'Gemini API Error', details: errorData });
    }

    const data = await response.json();
    const jsonResponse = JSON.parse(data.candidates[0].content.parts[0].text);
    secretGame = jsonResponse.secretGame;

    if (!secretGame) {
      throw new Error("Gemini did not return a secret game.");
    }

    gameSessions.set(sessionId, {
      secretGame: secretGame,
      chatHistory: [{ role: "user", parts: [{ text: `The secret game is ${secretGame}. The user will now ask questions.` }] }],
      questionCount: 0,
    });

    res.json({ sessionId: sessionId });

  } catch (error) {
    console.error('Error starting player guesses game:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

// New endpoint for Player Guesses Game: Handle player questions
app.post('/player-guesses/question', async (req, res) => {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

  const { sessionId, userInput } = req.body;

  if (!sessionId || !userInput) {
    return res.status(400).json({ error: 'Session ID and user input are required.' });
  }

  const session = gameSessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found.' });
  }

  session.questionCount++;

  const prompt = `The user asked: "${userInput}". The secret game is "${session.secretGame}".
            Is it a guess or a question? If it's a guess, is it correct?
            Your response MUST be a JSON object with a 'type' field ('answer' or 'guessResult') and a 'content' field.
            If it's a question, content should be "Yes", "No", or "I don't know".
            If it's a guess, content should be an object with 'correct' (true/false) and a 'response' string.
            Example (question): {"type": "answer", "content": "Yes"}
            Example (guess): {"type": "guessResult", "content": {"correct": false, "response": "That's not it. Keep trying!"}}`;

  session.chatHistory.push({ role: "user", parts: [{ text: prompt }] });

  const geminiRequestBody = {
    contents: session.chatHistory,
    generationConfig: {
      responseMimeType: "application/json",
    }
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(geminiRequestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error from Gemini API (player question):', errorData);
      return res.status(response.status).json({ error: 'Gemini API Error', details: errorData });
    }

    const data = await response.json();
    const jsonResponse = JSON.parse(data.candidates[0].content.parts[0].text);
    session.chatHistory.push({ role: "model", parts: [{ text: JSON.stringify(jsonResponse) }] });

    res.json({ type: jsonResponse.type, content: jsonResponse.content, questionCount: session.questionCount });

  } catch (error) {
    console.error('Error handling player question:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
});

app.listen(port, () => {
  console.log(`Backend server listening on port ${port}`);
});