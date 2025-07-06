import { dom, gameState, updateUI, callGeminiAPI } from './utils.js';

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
  gameState.chatHistory = [];
  updateUI();
  createSuggestionChips();

  const initialPrompt = `You are Game Boy, a friendly robot thinking of a secret video game. The user will ask yes/no questions to guess it.
            Your response MUST be a JSON object with a 'secretGame' field.
            Example: {"secretGame": "The Witcher 3: Wild Hunt"}`;

  try {
    const result = await callGeminiAPI(initialPrompt);
    const jsonResponse = JSON.parse(result.candidates[0].content.parts[0].text);
    gameState.secretGame = jsonResponse.secretGame;
    gameState.chatHistory.push({ role: "user", parts: [{ text: `The secret game is ${gameState.secretGame}. The user will now ask questions.` }] });
    dom.gameMessage.textContent = "I'm thinking of a game. Ask me a yes/no question, or try to guess the game!";
  } catch (error) {
    console.error("Error starting player guesses game:", error);
    dom.gameMessage.textContent = "Error starting the game. Please try again.";
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
  if (!userInput) return;

  gameState.loading = true;
  gameState.questionCount++;
  gameState.highlightedResponse = null; // Clear previous highlight
  updateUI();

  const prompt = `The user asked: "${userInput}". The secret game is "${gameState.secretGame}".
            Is it a guess or a question? If it's a guess, is it correct?
            Your response MUST be a JSON object with a 'type' field ('answer' or 'guessResult') and a 'content' field.
            If it's a question, content should be "Yes", "No", or "I don't know".
            If it's a guess, content should be an object with 'correct' (true/false) and a 'response' string.
            Example (question): {"type": "answer", "content": "Yes"}
            Example (guess): {"type": "guessResult", "content": {"correct": false, "response": "That's not it. Keep trying!"}}`;

  gameState.chatHistory.push({ role: "user", parts: [{ text: prompt }] });

  try {
    const result = await callGeminiAPI(gameState.chatHistory);
    const jsonResponse = JSON.parse(result.candidates[0].content.parts[0].text);
    gameState.chatHistory.push({ role: "model", parts: [{ text: JSON.stringify(jsonResponse) }] });

    if (jsonResponse.type === 'answer') {
      dom.modelResponse.textContent = `My answer: ${jsonResponse.content}`;
      gameState.highlightedResponse = jsonResponse.content;

      if (gameState.questionCount >= gameState.maxQuestions) {
        endGame(`You're out of questions! The game was ${gameState.secretGame}.`, false);
      } else {
        createSuggestionChips();
      }
    } else if (jsonResponse.type === 'guessResult') {
      if (jsonResponse.content.correct) {
        endGame(`You guessed it! The game was ${gameState.secretGame}.`, true);
      } else {
        dom.gameMessage.textContent = jsonResponse.content.response;
      }
    }
  } catch (error) {
    console.error("Error handling player question:", error);
    dom.gameMessage.textContent = "Error processing your question. Please try again.";
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
