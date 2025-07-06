import { dom, gameState, updateUI } from './utils.js';
import { startGameAI, handleAnswer } from './aiGuessesGame.js';
import { startGamePlayerGuesses, handlePlayerGuess } from './playerGuessesGame.js';

function switchGameMode(mode) {
    gameState.gameMode = mode;
    resetGame();
}

function resetGame() {
    Object.assign(gameState, {
        gameMode: 'ai-guesses',
        preGame: true,
        started: false,
        questionCount: 0,
        chatHistory: [],
        loading: false,
    });
    updateUI();
}

document.addEventListener('DOMContentLoaded', () => {
    // --- Event Listeners ---
    dom.btnStartGame.addEventListener('click', startGameAI);
    dom.btnYes.addEventListener('click', () => handleAnswer('Yes'));
    dom.btnNo.addEventListener('click', () => handleAnswer('No'));
    dom.btnUnsure.addEventListener('click', () => handleAnswer('Unsure'));
    dom.tabAiGuesses.addEventListener('click', () => switchGameMode('ai-guesses'));
    dom.tabPlayerGuesses.addEventListener('click', () => switchGameMode('player-guesses'));
    dom.btnSubmitGuess.addEventListener('click', handlePlayerGuess);

    // --- Initial UI State ---
    resetGame();

    // Initial UI update
    updateUI();
});
