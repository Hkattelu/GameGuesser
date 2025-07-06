const dom = {
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

// --- Game State ---
const gameState = {
    gameMode: 'ai-guesses', // 'ai-guesses' or 'player-guesses'
    preGame: true,
    started: false,
    questionCount: 0,
    maxQuestions: 20,
    chatHistory: [],
    loading: false,
};

// --- API Configuration ---
// The API_KEY is loaded from config.js, which is not checked into git.
const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

// --- UI Update Function ---
function updateUI() {
    dom.loadingIndicator.classList.toggle('hidden', !gameState.loading);
    dom.responseButtons.classList.toggle('hidden', gameState.loading || !gameState.started);
    dom.questionDisplay.classList.toggle('hidden', !gameState.started);
    dom.userGameInputSection.classList.toggle('hidden', gameState.started || gameState.preGame);
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

// --- Game Mode Switching ---
function switchGameMode(mode) {
    gameState.gameMode = mode;
    resetGame();
}

function resetGame() {
    gameState.preGame = true;
    gameState.started = false;
    gameState.questionCount = 0;
    gameState.chatHistory = [];
    gameState.loading = false;
    updateUI();
}

// --- Game Logic (AI Guesses) ---
async function startGame() {
    gameState.preGame = false;
    gameState.started = true;
    gameState.questionCount = 0;
    gameState.chatHistory = [];
    gameState.loading = true;

    dom.gameMessage.textContent = "Okay, let's begin! I'll ask my first question.";
    updateUI();

    const initialPrompt = `You are an AI playing a "20 Questions" game to guess a video game the user is thinking of.
            You will ask yes/no questions. If you are very confident, you can make a guess.
            You have ${gameState.maxQuestions} questions in total. This is question 1.
            Your response MUST be a JSON object with a 'type' field ("question" or "guess") and a 'content' field (the question text or the game guess).
            Example: {"type": "question", "content": "Is your game an RPG?"}
            Example: {"type": "guess", "content": "Is your game The Legend of Zelda: Breath of the Wild?"}
            Start by asking your first question.`;

    gameState.chatHistory.push({ role: "user", parts: [{ text: initialPrompt }] });
    await callGeminiAPI();
}

async function handleAnswer(answer) {
    if (!gameState.started) return;

    gameState.loading = true;
    dom.gameMessage.textContent = `You answered "${answer}". Thinking...`;
    updateUI();

    gameState.chatHistory.push({ role: "user", parts: [{ text: `User answered "${answer}".` }] });

    const nextTurnPrompt = `The user just answered "${answer}". You have ${gameState.maxQuestions - gameState.questionCount} questions left.
            Based on this, ask your next yes/no question or make a guess if you are confident.
            Remember, your response MUST be a JSON object with 'type' and 'content'.`;

    gameState.chatHistory.push({ role: "user", parts: [{ text: nextTurnPrompt }] });
    await callGeminiAPI();
}

function endGame(finalMessage) {
    gameState.started = false;
    gameState.loading = false;
    dom.aiQuestion.textContent = finalMessage;
    updateUI();
}

// --- Game Logic (Player Guesses) ---
async function startGamePlayerGuesses() {
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

async function handlePlayerGuess() {
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

// --- API Call ---
async function callGeminiAPI(prompt) {
    const payload = {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
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
}

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
            dom.aiQuestion.textContent = "Error: Unexpected response type from AI.";
            dom.gameMessage.textContent = "Please try again.";
        }
    } else {
        console.error("Unexpected API response structure:", result);
        dom.aiQuestion.textContent = "AI encountered an error. Please try again.";
        dom.gameMessage.textContent = "Error communicating with AI.";
    }
}

// --- Event Listeners ---
dom.btnStartGame.addEventListener('click', startGame);
dom.btnYes.addEventListener('click', () => handleAnswer('Yes'));
dom.btnNo.addEventListener('click', () => handleAnswer('No'));
dom.btnUnsure.addEventListener('click', () => handleAnswer('Unsure'));
dom.tabAiGuesses.addEventListener('click', () => switchGameMode('ai-guesses'));
dom.tabPlayerGuesses.addEventListener('click', () => switchGameMode('player-guesses'));
dom.btnSubmitGuess.addEventListener('click', handlePlayerGuess);

// --- Initial UI State ---
resetGame();