# Quiz Bot's Arcade!

This is a simple web-based game portal to play with an AI character who knows a lot about video games. You can challenge him to one of two yes/no style guessing games.

![Quizbot](./frontend/public/bot_boy/guy.png)

## Setup

The backend and frontend servers can easily be built with `npm run build`, but you'll need to specify some environment variables on startup.

#### Backend

* `GEMINI_API_KEY`: Your Gemini API key
* `RAWG_API_KEY`: Your RAWG API key
* `FRONTEND_ORIGIN`: URL to the host of the frontend server. Used for auth.
* `JWT_SECRET`: Your JWT secret used to auth the server

#### Frontend

* `VITE_BACKEND_URL`: URL to the host of the backend server

#### Database

The current backend assumes that you are using firestore for a document database.