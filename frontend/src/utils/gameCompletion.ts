import type { GameMode, ChatMessage } from '../types';

/**
* Determine whether a game session has been completed based on the provided
* chat history, current question count and the maximum allowed questions.
*
* The logic differs slightly between the two supported game modes:
*
* - **player-guesses**: The game is over once the model sends a
*   `guessResult` payload (indicating the player's final answer has been
*   judged) **or** the player has used up all their questions.
* - **ai-guesses**: The game is over once the model sends a successful
*   `guess` payload (`{ type: 'guess', content: true }`) **or** the AI has
*   exhausted the question limit.
*
* The helper intentionally stays tolerant of malformed JSON in model
* messages—any parsing failures fall back to a simple "not completed"
* result so that the UI doesn't crash due to bad data.
*/
export function isGameCompleted(
  gameMode: GameMode,
  chatHistory: ChatMessage[],
  questionCount: number,
  maxQuestions: number,
): boolean {
  if (!chatHistory || chatHistory.length === 0) return false;

  console.log(chatHistory);
  if (gameMode === 'player-guesses') {
    // Look for the latest model message signalling the end of the round.
    const lastModelMsg = [...chatHistory].reverse().find((m) => m.role === 'model');
    if (lastModelMsg) {
      try {
        const parsed = JSON.parse(lastModelMsg.parts[0]?.text || '');
        if (parsed.type === 'guessResult') {
          // If the model's last message indicates a correct guess, the game is over
          return parsed.content.correct;
        }
      } catch {
        /* swallow JSON parse errors – not game-ending */
      }
    }

    // The user ran out of questions
    if (questionCount >= maxQuestions) {
      return true;
    }
  }

  if (gameMode === 'ai-guesses') {
    const lastModelMsg = [...chatHistory].reverse().find((m) => m.role === 'model');
    if (lastModelMsg) {
      try {
        const parsed = JSON.parse(lastModelMsg.parts[0]?.text || '');
        if (parsed.type === 'guess' && parsed.content === true) {
          return true;
        }
      } catch {
        /* ignore parse errors */
      }
    }

    // The user ran out of questions
    if (questionCount >= maxQuestions) {
      return true;
    }
  }

  return false;
}
