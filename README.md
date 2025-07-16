# Quiz Bot 9000's Arcade!

This is a simple web-based game where an AI tries to guess a video game you're thinking of by asking a series of yes/no questions.

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

