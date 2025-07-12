# Quiz Bot 9000's Video game games!

This is a simple web-based game where an AI tries to guess a video game you're thinking of by asking a series of yes/no questions.

![Quizbot](./frontend/public/bot_boy/guy.png)

## Setup

The backend and frontne servers can easily be built with `npm run build`, but you'll need to specify some environment variables on startup.

### Backend

GEMINI_API_KEY: Your Gemini API key
FRONTEND_ORIGIN: URL to the host of the frontend server
JWT_SECRET: Your JWT secret used to auth the server

### Frontend

VITE_BACKEND_URL: URL to the host of the backend server

## Daily Game system (Wordle-style)

Starting **July 9 2025** the *Player-Guesses* mode no longer chooses a random title for every session. Instead, the first request of each calendar day (UTC) triggers **one** call to Gemini asking for a random, well-known video-game title. That title is stored in `backend/daily-games.json` and is reused for every subsequent session that day so players around the world share the same challenge.

The feature is implemented in `backend/dailyGameStore.ts` and requires **no changes** to the public API. If you deploy to an environment where the filesystem is ephemeral, set the `DAILY_GAME_FILE_PATH` environment variable to an external volume or object-store path.
