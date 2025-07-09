# AI Game Guesser

This is a simple web-based game where an AI tries to guess a video game you're thinking of by asking a series of yes/no questions.

## Setup

To run this project, you need to spin up an instance of a backend service which proxies requests to Gemini. I use pack CLI:

1. pack build gcr.io/${PROJECT_ID}/${SERVICE_ID} --path backend --publish

2. gcloud run deploy game-guesser-backend --image gcr.io/${PROJECT_ID}/${SERVICE_ID} --platform managed --region us-east1 --allow-unauthenticated --set-env-vars GEMINI_API_KEY=${YOUR_GEMINI_API_KEY}

3. Serve the FE using firebase or a simple webserver. 

## Daily "Player Guesses" game (Wordle-style)

Starting July 2025 the *Player Guesses* mode now works like Wordle: every
calendar day **all players around the world get the same secret game**.

- At the first request after 00:00 UTC a brand-new game is randomly selected
  by Gemini and persisted on disk (`backend/daily_game_store.json`).
- Subsequent sessions opened on the same day reuse the stored game so that
  everyone shares the same challenge.
- The store is extremely small (just today’s date → secret game) and is written
  atomically, surviving container restarts.

Environment variable `DAILY_GAME_STORE_FILE` can override the default store
location (useful for tests or serverless environments with read-only
filesystems).

No other changes are required—regular `POST /player-guesses/start` requests now
receive sessions that point to the daily game.
