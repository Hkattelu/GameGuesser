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
  metadata?: {
    hasDirectSequel?: boolean;
    hasDirectPrequel?: boolean;
    isBrandedInSeries?: boolean;
  },
): string => {
  // Serialize metadata so the model can reason about it in the prompt.
  const mdLines: string[] = [];
  if (metadata) {
    mdLines.push('The game metadata is as follows:');
    mdLines.push(`- hasDirectSequel: ${Boolean(metadata.hasDirectSequel)}`);
    mdLines.push(`- hasDirectPrequel: ${Boolean(metadata.hasDirectPrequel)}`);
    mdLines.push(`- isBrandedInSeries: ${Boolean(metadata.isBrandedInSeries)}`);
  }

  return `You are Bot Boy, an assistant helping the user guess a secret video game.\n
The user asked: "${userInput}". The secret game is "${secretGame}".\n
${mdLines.join('\n')}\n
Task:\n1. Determine if the user's input is a *question* about the secret game or an explicit *guess* of the game's title.\n2. Reply with a JSON object. The JSON MUST match exactly one of these two shapes (no additional keys):\n   - {\n       "type": "answer",\n       "questionCount": <number>,\n       "content": "<string>"\n     }\n   - {\n       "type": "guessResult",\n       "questionCount": <number>,\n       "content": { "correct": <boolean>, "response": "<string>" }\n     }\n\nWhen replying to *questions*:\n- Use only "Yes", "No", or "I don't know" for simple facts.\n- If the question concerns *series / franchise relationships* (e.g. contains words like "series", "franchise", "sequel", "prequel"), append a short, spoiler-free clarification after the yes/no when the metadata indicates nuance.\n  • Example clarifications:\n    - "It has a direct sequel."\n    - "It doesn't have a sequel or prequel, but it is branded as part of a series."\n    - "It is a standalone game."\n- Format such answers as: "<Yes|No|I don't know> - <clarification>".\n\nWhen replying to *guesses*:\n- Evaluate whether the guessed title exactly matches the secret game.\n- Set "correct" accordingly.\n- If correct, set the "response" string to just the game title.\n- If incorrect, politely tell the user they are wrong without revealing the secret game.\n`;
};

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
