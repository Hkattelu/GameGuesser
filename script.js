import { dom, gameState, updateUI } from './utils.js';
import { startGameAI, handleAnswer } from './aiGuessesGame.js';
import { startGamePlayerGuesses, handlePlayerGuess } from './playerGuessesGame.js';

/**
 * Switches the game mode and resets the game.
 * @param {string} mode - The game mode to switch to ('ai-guesses' or 'player-guesses').
 */
function switchGameMode(mode) {
    gameState.gameMode = mode;
    resetGame();
}

/**
 * Resets the game state to its initial values.
 */
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
