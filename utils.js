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
};

export let gameState = {
    gameMode: 'ai-guesses', // 'ai-guesses' or 'player-guesses'
    preGame: true,
    started: false,
    questionCount: 0,
    maxQuestions: 20,
    chatHistory: [],
    loading: false,
};

// The API_KEY is loaded from config.js, which is not checked into git.
export const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

export function updateUI() {
    dom.loadingIndicator.classList.toggle('hidden', !gameState.loading);
    dom.responseButtons.classList.toggle('hidden', gameState.loading || !gameState.started || gameState.gameMode !== 'ai-guesses');
    dom.questionDisplay.classList.toggle('hidden', !gameState.started || gameState.gameMode !== 'ai-guesses');

    dom.userGameInputSection.classList.toggle('hidden', gameState.started);
    dom.btnStartGame.classList.toggle('hidden', gameState.started);

    if (gameState.loading) {
        dom.mascotImage.src = 'bot_boy/thinking.png';
    } else if (gameState.preGame) {
        dom.mascotImage.src = 'bot_boy/guy.png';
        dom.btnStartGame.textContent = "Start Game";
        dom.gameMessage.textContent = "Let's play! Think of a video game, and I'll try to guess it. Click \"Start Game\" when you're ready!";
    } else if (!gameState.started) {
        dom.mascotImage.src = 'bot_boy/sadge.png';
        dom.btnStartGame.textContent = "Play Again?";
        dom.gameMessage.textContent = "Game Over!";
    } else {
        dom.mascotImage.src = 'bot_boy/guy.png';
    }

    // Tab switching
    dom.aiGuessesGame.classList.toggle('hidden', gameState.gameMode !== 'ai-guesses');
    dom.playerGuessesGame.classList.toggle('hidden', gameState.gameMode !== 'player-guesses');
    dom.tabAiGuesses.classList.toggle('active', gameState.gameMode === 'ai-guesses');
    dom.tabPlayerGuesses.classList.toggle('active', gameState.gameMode === 'player-guesses');
}

export async function callGeminiAPI(prompt) {
    try {
        const payload = {
            contents: prompt ? [{ role: "user", parts: [{ text: prompt }] }] : gameState.chatHistory,
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
