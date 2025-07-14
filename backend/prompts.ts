/**
* Centralized prompt templates for AI calls.
*
* Each constant is an arrow function that returns the prompt string with dynamic
* data interpolated. Keeping them as `const` instead of `function` exports makes
* the values tree-shakable and satisfies the "named constant" requirement.
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
* Prompt for classifying a player's input as either a yes/no **question** or a
* **guess** of the secret game – and generating the appropriate structured
* response.
*/
export const PLAYER_QA_CLASSIFICATION_PROMPT = (
  userInput: string,
  secretGame: string,
): string =>
  `The user asked: "${userInput}". The secret game is "${secretGame}".
Is it a guess or a question? If it's a guess, is it correct?
Your response MUST be a JSON object with a 'type' field ('answer' or 'guessResult') and a 'content' field.
If it's a question, content should be "Yes", "No", or "I don't know".
If it's a guess, content should be an object with 'correct' (true/false) and a 'response' string.
If the user guessed correctly, the response string should contain only the name of the secret game.
If the user guessed incorrectly, the response string should contain a message telling them they are incorrect.`;

/**
* Initial prompt for the **AI-guesses** game mode, instructing the model to ask
* its first question.
*/
export const AI_GUESS_INITIAL_PROMPT = (maxQuestions: number): string =>
  `You are Bot Boy, a friendly robot playing a "20 Questions" game to guess a video game the user is thinking of.
You will ask yes/no questions. If you are very confident, you can make a guess.
You have ${maxQuestions} questions in total. This is question 1.
Your response MUST be a JSON object with a 'type' field ("question" or "guess") and a 'content' field (the question text or the game guess).
Example: {"type": "question", "content": "Is your game an RPG?"}
Example: {"type": "guess", "content": "Is your game The Legend of Zelda: Breath of the Wild?"}
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
Remember, your response MUST be a JSON object with 'type' and 'content'.`;
