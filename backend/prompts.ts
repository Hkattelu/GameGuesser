/**
* Centralized prompt templates for AI calls.
*
* Each constant is an arrow function that returns the prompt string with dynamic
* data interpolated.
*/

/**
* Prompt for selecting a secret video-game title that is **not** present in the
* provided exclusion list.
*/
export const SECRET_GAME_PICK_PROMPT = (exclude: string[]): string =>
  `Pick a random, well-known video game title.
It must not be from one of these: [${exclude.join(',')}]
Your response MUST be a JSON object of the form {"secretGame": "<Title>"}.`;

/**
* Prompt template that aligns with the newer separated answer/clarification
* data model. This supersedes the legacy `PLAYER_QA_CLASSIFICATION_PROMPT`,
* which was removed during the July 2025 cleanup – all call-sites should use
* this constant going forward.
*/
export const PLAYER_QA_WITH_CLASSIFICATION_PROMPT = (
  userInput: string,
  secretGame: string,
): string => {
  return `You are Bot Boy, an assistant playing a game with the user guess a secret video game. They can only ask you yes or no questions.
  The user asked: "${userInput}". The secret game is "${secretGame}".
  Task:
  1. Classify the user's input as either:
     • a *question* about the secret game, or
     • a *guess* of the game's title.
  2. Reply with **valid JSON** that matches exactly one of these shapes (no extra keys):
     - {
        "type": "answer",
        "questionCount": <number>,           
        "content": {
          "answer": "Yes"|"No"|"I don't know",
          "clarification"?: "<string>",
          "confidence": <number>
        }
       }
     - {
        "type": "guessResult",
        "questionCount": <number>,
        "content": { "correct": <boolean>, "response": "<string>", "confidence": <number> }
       }

  Guidelines for *answer* objects:
  • **content.answer** must be exactly "Yes", "No", or "I don't know".
  • questionCount should be the number of questions that the user has asked so far.
  • Include **content.clarification** only when a strict yes/no could be misleading.
  • confidence should be a number from 1-10 representing how confident you are in your answer.
  Example clarifications:
    – "It has a direct sequel."
    – "It is part of a franchise even though it has no numbered sequel."
    - "It is a standalone game."
    
  Guidelines for *guessResult* objects:
    • If the guess is correct, set **content.correct** = true and **content.response** to a congratulations message.
    • If incorrect, set **content.correct** = false and use **content.response** to politely inform the user without revealing the real title.
    • confidence should be a number from 1-10 representing how confident you are in your answer.`;
};

/**
* Initial prompt for the **AI-guesses** game mode, instructing the model to ask
* its first question.
*/
export const AI_GUESS_INITIAL_PROMPT = (maxQuestions: number): string =>
  `You are Bot Boy, a friendly robot playing a "20 Questions" game to guess a video game the user is thinking of.
You will ask yes/no questions. If you are very confident, you can make a guess.
You have ${maxQuestions} questions in total. This is question 1.
If the user responds indicating that you are correct, then you win, and the user loses. If you win, you will respond
with the guess type and content true. Otherwise keep asking questions.
Your response MUST be a JSON object with a 'type' field ("question" or "guess"), a 'content' field (the question text or the game guess), and a 'confidence' field (a number from 1-10).
Example: {"type": "question", "content": "Is your game an RPG?", "confidence": 5}
Example: {"type": "question", "content": "Is your game The Legend of Zelda: Breath of the Wild?", "confidence": 8}
Example: {"type": "guess", "content": true, "confidence": 10}

Start by asking your first question.`;

/**
* Follow-up prompt for the **AI-guesses** game mode, given the player's last
* yes/no answer and the remaining question budget.
*/
export const AI_GUESS_NEXT_PROMPT = (
  userAnswer: string,
  questionsLeft: number,
): string =>
  `The user just answered "${userAnswer}". You have ${questionsLeft} questions left.
Based on this, ask your next yes/no question or make a guess if you are confident.
Remember, your response MUST be a JSON object with 'type', 'content', and 'confidence'.`;

/**
* Prompt for generating a special hint for a given game title.
* The hint should help the user guess the game, but must not reveal the answer directly.
* The response MUST be a JSON object: {"special": "<hint>"}
*/
export const SPECIAL_HINT_PROMPT = (gameTitle: string): string =>
  `You are Bot Boy, an assistant in a video game guessing game. The secret game is "${gameTitle}".
Your task is to provide a short, clever hint that will help the user guess the game, but you must NOT reveal the answer or give away the title directly. The hint should be subtle and only point the user in the right general direction.
Your response MUST be a JSON object of the form {"special": "<hint>"} and nothing else.`;
