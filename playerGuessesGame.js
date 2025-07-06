import { dom, gameState, updateUI, callGeminiAPI } from './utils.js';

/**
 * Starts the player guessing game.
 * The AI thinks of a secret video game and the user tries to guess it.
 */
export async function startGamePlayerGuesses() {
  gameState.preGame = false;
  gameState.started = true;
  gameState.loading = true;
  updateUI();

  const initialPrompt = `You are an AI thinking of a secret video game. The user will try to guess it.
            Your response MUST be a JSON object with a 'secretGame' field.
            Example: {"secretGame": "The Witcher 3: Wild Hunt"}`;

  try {
    const result = await callGeminiAPI(initialPrompt);
    const jsonResponse = JSON.parse(result.candidates[0].content.parts[0].text);
    gameState.secretGame = jsonResponse.secretGame;
    dom.gameMessage.textContent = "I'm thinking of a game. Can you guess it?";
  } catch (error) {
    console.error("Error starting player guesses game:", error);
    dom.gameMessage.textContent = "Error starting the game. Please try again.";
  } finally {
    gameState.loading = false;
    updateUI();
  }
}

/**
 * Handles the player's guess.
 * Sends the guess to the AI to check if it's correct and provides a hint if it's not.
 */
export async function handlePlayerGuess() {
  const guess = dom.playerGuessInput.value;
  if (!guess) return;

  gameState.loading = true;
  updateUI();

  const prompt = `The user guessed "${guess}". Is this correct? The secret game is "${gameState.secretGame}".
            Your response MUST be a JSON object with a 'correct' field (true or false) and a 'hint' field.
            Example: {"correct": false, "hint": "Your guess is incorrect. The game I'm thinking of is a role-playing game."`;

  try {
    const result = await callGeminiAPI(prompt);
    const jsonResponse = JSON.parse(result.candidates[0].content.parts[0].text);
    if (jsonResponse.correct) {
      endGame(`You guessed it! The game was ${gameState.secretGame}.`);
    } else {
      dom.gameMessage.textContent = jsonResponse.hint;
    }
  } catch (error) {
    console.error("Error handling player guess:", error);
    dom.gameMessage.textContent = "Error processing your guess. Please try again.";
  } finally {
    gameState.loading = false;
    updateUI();
  }
}

/**
 * Ends the game and displays a final message.
 * @param {string} finalMessage - The message to display at the end of the game.
 */
function endGame(finalMessage) {
  gameState.started = false;
  gameState.loading = false;
  dom.aiQuestion.textContent = finalMessage;
  updateUI();
}