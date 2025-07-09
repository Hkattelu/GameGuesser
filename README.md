# AI Game Guesser

This is a simple web-based game where an AI tries to guess a video game you're thinking of by asking a series of yes/no questions.

## Setup

To run this project, you need to spin up an instance of a backend service which proxies requests to Gemini. I use pack CLI:

1. pack build gcr.io/${PROJECT_ID}/${SERVICE_ID} --path backend --publish

2. gcloud run deploy game-guesser-backend --image gcr.io/${PROJECT_ID}/${SERVICE_ID} --platform managed --region us-east1 --allow-unauthenticated --set-env-vars GEMINI_API_KEY=${YOUR_GEMINI_API_KEY}

3. Serve the FE using firebase or a simple webserver.

## Daily Game system (Wordle-style)

Starting **July 9 2025** the *Player-Guesses* mode no longer chooses a random title for every session. Instead, the first request of each calendar day (UTC) triggers **one** call to Gemini asking for a random, well-known video-game title. That title is stored in `backend/daily-games.json` and is reused for every subsequent session that day so players around the world share the same challenge.

The feature is implemented in `backend/dailyGameStore.js` and requires **no changes** to the public API. If you deploy to an environment where the filesystem is ephemeral, set the `DAILY_GAME_FILE_PATH` environment variable to an external volume or object-store path.
