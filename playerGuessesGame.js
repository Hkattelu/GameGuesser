import { dom, gameState, updateUI, callGeminiAPI, apiUrl } from './utils.js';

const suggestionQuestions = [
  "Does the game feature an open world?",
  "Is the game known for its strong narrative or story?",
  "Does the game belong to the RPG genre?",
  "Is it a first-person shooter (FPS)?",
  "Does the game involve building or crafting mechanics?",
  "Is the game set in a fantasy world?",
  "Does the game take place in space or involve sci-fi themes?",
  "Is it a platformer?",
  "Is the game primarily played from a top-down perspective?",
  "Does the game have a cartoonish or stylized art style?",
  "Is it a horror game?",
  "Does the game involve vehicles or racing?",
  "Is it a puzzle game?",
  "Does the game feature turn-based combat?",
  "Is the game known for its challenging difficulty?",
  "Is the game part of a well-known franchise?",
  "Was the game originally released on a PlayStation console?",
  "Was the game originally released on an Xbox console?",
  "Was the game originally released on a Nintendo console?",
  "Is the game available on PC?",
  "Does the game involve magic or supernatural elements?",
  "Is the game rated 'Mature' (17+) by ESRB or equivalent?",
  "Does the game have a post-apocalyptic setting?",
  "Is the game played from a third-person perspective?",
  "Does the game feature a silent protagonist?",
  "Is the game primarily focused on exploration?",
  "Does the game have a significant emphasis on stealth?",
  "Was the game released before the year 2000?",
  "Does the game involve a large number of unique characters?",
  "Is the game known for its emotional impact?"
];

/**
 * Creates and displays a random selection of 3 suggestion chips.
 */
function createSuggestionChips() {
  dom.suggestionChips.innerHTML = '';
  const shuffledQuestions = suggestionQuestions.sort(() => 0.5 - Math.random());
  const selectedQuestions = shuffledQuestions.slice(0, 3);

  selectedQuestions.forEach(question => {
    const chip = document.createElement('button');
    chip.textContent = question;
    chip.classList.add('suggestion-chip');
    chip.addEventListener('click', () => {
      dom.playerGuessInput.value = question;
    });
    dom.suggestionChips.appendChild(chip);
  });
}

/**
 * Starts the player guessing game.
 * The AI thinks of a secret video game and the user tries to guess it by asking up to 20 questions.
 */
export async function startGamePlayerGuesses() {
  gameState.preGame = false;
  gameState.started = true;
  gameState.loading = true;
  gameState.questionCount = 0;
  gameState.chatHistory = []; // Chat history will now be managed on the backend
  gameState.sessionId = null; // Store session ID from backend
  updateUI();
  createSuggestionChips();

  dom.gameMessage.textContent = "I'm thinking of a game. Please wait...";

  try {
    const response = await fetch(`${apiUrl}/player-guesses/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to start game on backend.');
    }

    const data = await response.json();
    gameState.sessionId = data.sessionId;
    dom.gameMessage.textContent = "I'm thinking of a game. Ask me a yes/no question, or try to guess the game!";
  } catch (error) {
    console.error("Error starting player guesses game:", error);
    dom.gameMessage.textContent = `Error starting the game: ${error.message}. Please try again.`;
  } finally {
    gameState.loading = false;
    updateUI();
  }
}

/**
 * Handles the player's question or guess.
 * Sends the user's input to the AI to get a response.
 */
export async function handlePlayerQuestion() {
  const userInput = dom.playerGuessInput.value;
  if (!userInput || !gameState.sessionId) return; // Ensure session ID exists

  gameState.loading = true;
  gameState.highlightedResponse = null; // Clear previous highlight
  gameState.chatHistory.push({ role: "user", parts: [{ text: userInput }] }); // Add user's question to history
  updateUI();

  try {
    const response = await fetch(`${apiUrl}/player-guesses/question`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId: gameState.sessionId, userInput: userInput }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get AI response from backend.');
    }

    const data = await response.json();
    const { type, content, questionCount } = data;

    gameState.questionCount = questionCount; // Update question count from backend

    if (type === 'answer') {
      dom.modelResponse.textContent = `My answer: ${content}`;
      gameState.highlightedResponse = content; // 'Yes', 'No', or 'I don't know'
      gameState.chatHistory.push({ role: "model", parts: [{ text: content }] }); // Add AI's answer to history

      if (gameState.questionCount >= gameState.maxQuestions) {
        endGame(`You're out of questions! The game was ${content}.`, false); // Backend will provide the game title in the final answer
      } else {
        createSuggestionChips();
      }
    } else if (type === 'guessResult') {
      if (content.correct) {
        endGame(content.response, true); // Backend provides the game title in content.response
        gameState.highlightedResponse = 'Yes';
        gameState.chatHistory.push({ role: "model", parts: [{ text: content.response }] }); // Add AI's guess result to history
      } else {
        dom.gameMessage.textContent = content.response;
        gameState.highlightedResponse = 'No';
        gameState.chatHistory.push({ role: "model", parts: [{ text: content.response }] }); // Add AI's guess result to history
      }
    }
  } catch (error) {
    console.error("Error handling player question:", error);
    dom.gameMessage.textContent = `Error processing your question: ${error.message}. Please try again.`;
  } finally {
    dom.playerGuessInput.value = '';
    gameState.loading = false;
    updateUI();
  }
}

/**
 * Ends the game and displays a final message.
 * @param {string} finalMessage - The message to display at the end of the game.
 * @param {boolean} victory - Whether the user won the game.
 */
function endGame(finalMessage, victory) {
  gameState.started = false;
  gameState.loading = false;
  gameState.victory = victory;
  dom.gameMessage.textContent = finalMessage;
  dom.suggestionChips.innerHTML = '';
  updateUI();
}