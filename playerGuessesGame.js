import { dom, gameState, updateUI, callGeminiAPI, clearHighlights } from './utils.js';

const suggestionQuestions = [
  "Is the game a single-player game?",
  "Is the game a multi-player game?",
  "Is the game a console exclusive?",
  "Was the game released in the last 5 years?",
  "Is the main character male?",
  "Is the main character female?",
  "Is it an indie game?",
  "Is it a AAA game?",
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

  const initialPrompt = `You are Bot Boy, a friendly robot thinking of a secret video game. The user will ask yes/no questions to guess it.
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
      dom.modelResponse.classList.remove('hidden');
      gameState.highlightedResponse = jsonResponse.content;

      if (gameState.questionCount >= gameState.maxQuestions) {
        endGame(`You're out of questions! The game was ${gameState.secretGame}.`);
      } else {
        createSuggestionChips();
      }
    } else if (jsonResponse.type === 'guessResult') {
      if (jsonResponse.content.correct) {
        endGame(`You guessed it! The game was ${gameState.secretGame}.`);
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
 */
function endGame(finalMessage) {
  gameState.started = false;
  gameState.loading = false;
  dom.gameMessage.textContent = finalMessage;
  updateUI();
}
