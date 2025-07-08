export const dom = {
  gameMessage: document.getElementById('game-message'),
  userGameInputSection: document.getElementById('user-game-input-section'),
  questionDisplay: document.getElementById('question-display'),
  aiQuestion: document.getElementById('ai-question'),
  responseButtons: document.getElementById('response-buttons'),
  btnYes: document.getElementById('btn-yes'),
  btnNo: document.getElementById('btn-no'),
  btnUnsure: document.getElementById('btn-unsure'),
  btnStartGame: document.getElementById('btn-start-game'),
  loadingIndicator: document.getElementById('loading-indicator'),
  mascotImage: document.getElementById('mascot-image'),
  tabAiGuesses: document.getElementById('tab-ai-guesses'),
  tabPlayerGuesses: document.getElementById('tab-player-guesses'),
  aiGuessesGame: document.getElementById('ai-guesses-game'),
  playerGuessesGame: document.getElementById('player-guesses-game'),
  playerGuessInput: document.getElementById('player-guess-input'),
  btnSubmitGuess: document.getElementById('btn-submit-guess'),
  suggestionChips: document.getElementById('suggestion-chips'),
  btnStartPlayerGame: document.getElementById('btn-start-player-game'),
  modelResponse: document.getElementById('model-response'),
  playerQuestionCount: document.getElementById('player-question-count'),
  conversationHistory: document.getElementById('conversation-history'),
  conversationHistoryPlayer: document.getElementById('conversation-history-player'),
};

export let gameState = {
  gameMode: 'ai-guesses', // 'ai-guesses' or 'player-guesses'
  preGame: true,
  started: false,
  victory: false,
  questionCount: 0,
  maxQuestions: 20,
  chatHistory: [],
  loading: false,
  highlightedResponse: null, // 'Yes', 'No', or 'Unsure'
};

// The GEMINI_API_KEY is loaded from config.js, which is not checked into git.
// export const apiUrl = `https://game-guesser-backend-772569913717.us-east1.run.app/gemini-proxy`;
export const apiUrl = `http://127.0.0.1:8080`;

/**
 * Updates the UI based on the current game state.
 * Toggles the visibility of various elements and updates text content.
 */
export function updateUI() {
  dom.loadingIndicator.classList.toggle('hidden', !gameState.loading);

  const isAiGuesses = gameState.gameMode === 'ai-guesses';
  const isPlayerGuesses = gameState.gameMode === 'player-guesses';

  // AI Guesses Mode UI
  dom.responseButtons.classList.toggle('hidden', !gameState.started || gameState.loading || isAiGuesses);
  dom.questionDisplay.classList.toggle('hidden', !gameState.started || !isAiGuesses);

  // Handle highlighting of response buttons
  clearHighlights();
  if (gameState.highlightedResponse) {
    if (gameState.highlightedResponse === 'Yes') {
      dom.btnYes.classList.add('highlight-yes');
    } else if (gameState.highlightedResponse === 'No') {
      dom.btnNo.classList.add('highlight-no');
    } else if (gameState.highlightedResponse === 'Unsure') {
      dom.btnUnsure.classList.add('highlight-unsure');
    }
  }

  // Player Guesses Mode UI
  dom.playerGuessesGame.classList.toggle('hidden', !isPlayerGuesses);
  dom.playerGuessInput.classList.toggle('hidden', gameState.loading || !gameState.started || !isPlayerGuesses);
  dom.btnSubmitGuess.classList.toggle('hidden', gameState.loading || !gameState.started || !isPlayerGuesses);
  dom.playerQuestionCount.classList.toggle('hidden', !gameState.started || !isPlayerGuesses);
  if (isPlayerGuesses && gameState.started) {
    dom.playerQuestionCount.textContent = `Questions left: ${gameState.maxQuestions - gameState.questionCount}/${gameState.maxQuestions}`;
  }

  // General UI
  dom.userGameInputSection.classList.toggle('hidden', gameState.started && gameState.gameMode === 'ai-guesses');
  dom.btnStartGame.classList.toggle('hidden', gameState.gameMode !== 'ai-guesses');
  dom.btnStartPlayerGame.classList.toggle('hidden', gameState.started || gameState.gameMode !== 'player-guesses');

  if (gameState.loading) {
    dom.mascotImage.src = 'bot_boy/thinking.png';
  } else if (gameState.preGame) {
    dom.mascotImage.src = 'bot_boy/guy.png';
    dom.btnStartGame.textContent = "Start Game";
    if (isAiGuesses) {
      dom.gameMessage.textContent = "Let's play! Think of a video game, and I'll try to guess it. Click \"Start Game\" when you're ready!";
    } else {
      dom.gameMessage.textContent = "I'm thinking of a game. You have 20 questions to guess it. Click \"Start Game\" to begin!";
    }
  } else if (!gameState.started) {
    dom.mascotImage.src = `bot_boy/${gameState.victory ? 'guy' : 'sadge'}.png`;
    dom.btnStartPlayerGame.textContent = "Play Again?";
    dom.gameMessage.textContent = gameState.victory ? "You Win!" : "Game Over!";
  } else {
    dom.mascotImage.src = 'bot_boy/guy.png';
  }

  // Tab switching
  dom.aiGuessesGame.classList.toggle('hidden', !isAiGuesses);
  dom.playerGuessesGame.classList.toggle('hidden', !isPlayerGuesses);
  dom.tabAiGuesses.classList.toggle('active', isAiGuesses);
  dom.tabPlayerGuesses.classList.toggle('active', isPlayerGuesses);

  // Render conversation history
  dom.conversationHistory.innerHTML = '';
  dom.conversationHistoryPlayer.innerHTML = '';

  if (gameState.chatHistory && gameState.chatHistory.length > 0) {
    gameState.chatHistory.forEach(entry => {
      const p = document.createElement('p');
      p.classList.add('mb-1');
      if (entry.role === 'user') {
        p.classList.add('text-blue-800', 'font-semibold');
        p.textContent = `You: ${entry.parts[0].text}`;
      } else if (entry.role === 'model') {
        p.classList.add('text-green-800');
        try {
          const jsonContent = JSON.parse(entry.parts[0].text);
          if (jsonContent.type === 'question') {
            p.textContent = `Bot Boy: ${jsonContent.content}`;
          } else if (jsonContent.type === 'guess') {
            p.textContent = `Bot Boy (Guess): ${jsonContent.content}`;
          } else if (jsonContent.type === 'answer') {
            p.textContent = `Bot Boy: ${jsonContent.content}`;
          } else if (jsonContent.type === 'guessResult') {
            p.textContent = `Bot Boy: ${jsonContent.content.response}`;
          }
        } catch (e) {
          p.textContent = `Bot Boy: ${entry.parts[0].text}`;
        }
      }
      if (isAiGuesses) {
        dom.conversationHistory.appendChild(p);
      } else if (isPlayerGuesses) {
        dom.conversationHistoryPlayer.appendChild(p);
      }
    });
    // Scroll to bottom of history
    if (isAiGuesses) {
      dom.conversationHistory.scrollTop = dom.conversationHistory.scrollHeight;
    } else if (isPlayerGuesses) {
      dom.conversationHistoryPlayer.scrollTop = dom.conversationHistoryPlayer.scrollHeight;
    }
  }
}

/**
 * Removes all highlighting from the response buttons.
 */
export function clearHighlights() {
  dom.btnYes.classList.remove('highlight-yes');
  dom.btnNo.classList.remove('highlight-no');
  dom.btnUnsure.classList.remove('highlight-unsure');
}

/**
 * Calls the Gemini API with the provided prompt or the current chat history.
 * @param {string|object[]} [prompt] - An optional prompt or chat history to send to the API.
 * @returns {Promise<object|null>} A promise that resolves to the JSON response from the API, or null if an error occurs.
 */
export async function callGeminiAPI(prompt) {
  try {
    const payload = {
      prompt,
      generationConfig: {
        responseMimeType: "application/json",
      }
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return await response.json();

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    dom.aiQuestion.textContent = "Error: Could not connect to AI. Check your API key and network.";
    dom.gameMessage.textContent = "Please try again.";
    return null;
  }
}