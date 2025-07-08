# AI Game Guesser

This is a simple web-based game where an AI tries to guess a video game you're thinking of by asking a series of yes/no questions.

## Setup

To run this project, you need to spin up an instance of a backend service which proxies requests to Gemini. I use pack CLI:

1. pack build gcr.io/${PROJECT_ID}/${SERVICE_ID} --path backend --publish

2. gcloud run deploy game-guesser-backend --image gcr.io/${PROJECT_ID}/${SERVICE_ID} --platform managed --region us-east1 --allow-unauthenticated --set-env-vars GEMINI_API_KEY=${YOUR_GEMINI_API_KEY}

3. Serve the FE using firebase or a simple webserver. 