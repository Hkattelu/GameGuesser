// Get references to DOM elements
const gameMessage = document.getElementById('game-message');
const userGameInputSection = document.getElementById('user-game-input-section');
const questionDisplay = document.getElementById('question-display');
const aiQuestion = document.getElementById('ai-question');
const responseButtons = document.getElementById('response-buttons');
const btnYes = document.getElementById('btn-yes');
const btnNo = document.getElementById('btn-no');
const btnUnsure = document.getElementById('btn-unsure');
const btnStartGame = document.getElementById('btn-start-game');
const loadingIndicator = document.getElementById('loading-indicator');

// Game state variables
let gameStarted = false;
let questionCount = 0;
const maxQuestions = 20; // For a 20 Questions style game
let chatHistory = []; // To store conversation history for the LLM

// Gemini API configuration
// The API_KEY is loaded from config.js, which is not checked into git.
const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

// Function to show/hide loading indicator
function showLoading(show) {
  if (show) {
    loadingIndicator.classList.remove('hidden');
    responseButtons.classList.add('hidden'); // Hide buttons while thinking
  } else {
    loadingIndicator.classList.add('hidden');
    responseButtons.classList.remove('hidden'); // Show buttons after thinking
  }
}


// Function to start the game
async function startGame() {
  gameStarted = true;
  questionCount = 0;
  chatHistory = []; // Clear history for a new game

  gameMessage.textContent = "Okay, let's begin! I'll ask my first question.";
  userGameInputSection.classList.add('hidden'); // Hide input after starting
  btnStartGame.classList.add('hidden'); // Hide start button

  questionDisplay.classList.remove('hidden'); // Show question area
  // responseButtons will be shown by showLoading(false) after first question

  // Initial prompt for the LLM to start the game
  const initialPrompt = `You are an AI playing a "20 Questions" game to guess a video game the user is thinking of.
            You will ask yes/no questions. If you are very confident, you can make a guess.
            You have ${maxQuestions} questions in total. This is question 1.
            Your response MUST be a JSON object with a 'type' field ("question" or "guess") and a 'content' field (the question text or the game guess).
            Example: {"type": "question", "content": "Is your game an RPG?"}
            Example: {"type": "guess", "content": "Is your game The Legend of Zelda: Breath of the Wild?"}
            Start by asking your first question.`;

  chatHistory.push({ role: "user", parts: [{ text: initialPrompt }] });

  await callGeminiAPI();
}

// Function to simulate AI asking a question
function askQuestion(questionText) {
  questionCount++;
  if (questionCount > maxQuestions) {
    endGame("I couldn't guess your game in 20 questions! You win!");
    return;
  }
  aiQuestion.textContent = `(${questionCount}/${maxQuestions}) ${questionText}`;
}


async function callGeminiAPI() {
  showLoading(true); // Show loading indicator

  try {
    const payload = {
      contents: chatHistory,
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

    if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {

      const jsonResponse = JSON.parse(result.candidates[0].content.parts[0].text);
      const responseType = jsonResponse.type;
      const responseContent = jsonResponse.content;

      // Add AI's response to chat history
      chatHistory.push({ role: "model", parts: [{ text: JSON.stringify(jsonResponse) }] });

      if (responseType === "question") {
        questionCount++;
        if (questionCount > maxQuestions) {
          endGame("I couldn't guess your game in 20 questions! You win!");
          return;
        }
        aiQuestion.textContent = `(${questionCount}/${maxQuestions}) ${responseContent}`;
        gameMessage.textContent = "Your turn to answer!";
      } else if (responseType === "guess") {
        endGame(`My guess is: ${responseContent}. Am I right?`);
      } else {
        aiQuestion.textContent = "Error: Unexpected response type from AI.";
        gameMessage.textContent = "Please try again.";
      }
    } else {
      console.error("Unexpected API response structure:", result);
      aiQuestion.textContent = "AI encountered an error. Please try again.";
      gameMessage.textContent = "Error communicating with AI.";
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    aiQuestion.textContent = "Failed to get a response from AI. Please check console for errors.";
    gameMessage.textContent = "Network or API error.";
  } finally {
    showLoading(false); // Hide loading indicator
  }
}

// Function to handle user's answer
async function handleAnswer(answer) {
  if (!gameStarted) return;

  gameMessage.textContent = `You answered "${answer}". Thinking...`;

  // Add user's answer to chat history
  chatHistory.push({ role: "user", parts: [{ text: `User answered "${answer}".` }] });

  // Prompt the LLM for the next turn
  const nextTurnPrompt = `The user just answered "${answer}". You have ${maxQuestions - questionCount} questions left.
            Based on this, ask your next yes/no question or make a guess if you are confident.
            Remember, your response MUST be a JSON object with 'type' and 'content'.`;

  chatHistory.push({ role: "user", parts: [{ text: nextTurnPrompt }] });

  await callGeminiAPI();
}

// Function to end the game
function endGame(finalMessage) {
  gameStarted = false;
  aiQuestion.textContent = finalMessage;
  responseButtons.classList.add('hidden'); // Hide response buttons
  btnStartGame.textContent = "Play Again?";
  btnStartGame.classList.remove('hidden'); // Show play again button
  gameMessage.textContent = "Game Over!";
  userGameInputSection.classList.remove('hidden'); // Show input again for next round
}

// Event Listeners
btnStartGame.addEventListener('click', startGame);
btnYes.addEventListener('click', () => handleAnswer('Yes'));
btnNo.addEventListener('click', () => handleAnswer('No'));
btnUnsure.addEventListener('click', () => handleAnswer('Unsure'));

// Initially hide question and response buttons
questionDisplay.classList.add('hidden');
responseButtons.classList.add('hidden');