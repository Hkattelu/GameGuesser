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
};

// --- Game State ---
const gameState = {
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
  dom.userGameInputSection.classList.toggle('hidden', gameState.started);
  dom.btnStartGame.classList.toggle('hidden', gameState.started);

  if (!gameState.started) {
    dom.btnStartGame.textContent = "Play Again?";
    dom.gameMessage.textContent = "Game Over!";
  }
}

// --- Game Logic ---
async function startGame() {
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

// --- API Call ---
async function callGeminiAPI() {
  try {
    const payload = {
      contents: gameState.chatHistory,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            "type": { "type": "STRING", "enum": ["question", "guess"] },
            "content": { "type": "STRING" }
          },
          required: ["type", "content"]
        }
      }
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    handleApiResponse(result);

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    dom.aiQuestion.textContent = "Failed to get a response from AI. Please check console for errors.";
    dom.gameMessage.textContent = "Network or API error.";
  } finally {
    gameState.loading = false;
    updateUI();
  }
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

// --- Initial UI State ---
updateUI();