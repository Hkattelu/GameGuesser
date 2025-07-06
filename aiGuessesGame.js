import { dom, gameState, updateUI, callGeminiAPI } from './utils.js';

/**
 * Starts the AI guessing game.
 * Initializes the game state, displays the initial message, and makes the first API call to get the AI's first question.
 */
export async function startGameAI() {
  gameState.preGame = false;
  gameState.started = true;
  gameState.questionCount = 0;
  gameState.chatHistory = [];
  gameState.loading = true;
  dom.gameMessage.textContent = "Okay, let's begin! I'll ask my first question.";
  dom.questionDisplay.classList.remove('hidden'); // Ensure question display is visible
  updateUI();

  const initialPrompt = `You are Bot Boy, a friendly robot playing a "20 Questions" game to guess a video game the user is thinking of.
            You will ask yes/no questions. If you are very confident, you can make a guess.
            You have ${gameState.maxQuestions} questions in total. This is question 1.
            Your response MUST be a JSON object with a 'type' field ("question" or "guess") and a 'content' field (the question text or the game guess).
            Example: {"type": "question", "content": "Is your game an RPG?"}
            Example: {"type": "guess", "content": "Is your game The Legend of Zelda: Breath of the Wild?"}
            Start by asking your first question.`;

  gameState.chatHistory.push({ role: "user", parts: [{ text: initialPrompt }] });
  try {
    const result = await callGeminiAPI();
    handleApiResponse(result);
  } finally {
    gameState.loading = false;
    updateUI();
  }
}

/**
 * Handles the user's answer to the AI's question.
 * Sends the answer to the AI and gets the next question or guess.
 * @param {string} answer - The user's answer ("yes", "no", "maybe").
 */
export async function handleAnswer(answer) {
  if (!gameState.started) return;

  gameState.loading = true;
  dom.gameMessage.textContent = `You answered "${answer}". Thinking...`;
  updateUI();

  gameState.chatHistory.push({ role: "user", parts: [{ text: `User answered "${answer}".` }] });

  const nextTurnPrompt = `The user just answered "${answer}". You have ${gameState.maxQuestions - gameState.questionCount} questions left.
            Based on this, ask your next yes/no question or make a guess if you are confident.
            Remember, your response MUST be a JSON object with 'type' and 'content'.`;

  gameState.chatHistory.push({ role: "user", parts: [{ text: nextTurnPrompt }] });
  try {
    const result = await callGeminiAPI();
    handleApiResponse(result);
  } finally {
    gameState.loading = false;
    updateUI();
  }
}

/**
 * Handles the response from the Gemini API.
 * Parses the JSON response and updates the UI with the AI's question or guess.
 * @param {object} result - The response object from the Gemini API.
 */
function handleApiResponse(result) {
  if (result.candidates && result.candidates.length > 0 &&
        result.candidates[0].content && result.candidates[0].content.parts &&
        result.candidates[0].content.parts.length > 0) {

    const jsonResponse = JSON.parse(result.candidates[0].content.parts[0].text);
    const { type, content } = jsonResponse;

    gameState.chatHistory.push({ role: "model", parts: [{ text: JSON.stringify(jsonResponse) }] });

    if (type === "question") {
      gameState.questionCount++;
      if (gameState.questionCount > gameState.maxQuestions) {
        endGame("I couldn't guess your game in 20 questions! You win!");
        return;
      }
      dom.aiQuestion.textContent = `(${gameState.questionCount}/${gameState.maxQuestions}) ${content}`;
      dom.gameMessage.textContent = "Your turn to answer!";
    } else if (type === "guess") {
      endGame(`My guess is: ${content}. Am I right?`);
    } else {
      dom.aiQuestion.textContent = "Error: Unexpected response type from Bot Boy.";
      dom.gameMessage.textContent = "Please try again.";
    }
  } else {
    console.error("Unexpected API response structure:", result);
    dom.aiQuestion.textContent = "Bot Boy encountered an error. Please try again.";
    dom.gameMessage.textContent = "Error communicating with Bot Boy.";
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
