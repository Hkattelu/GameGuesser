import React, { useState, useEffect } from 'react';
import AIGuessesGame from './AIGuessesGame';
import PlayerGuessesGame from './PlayerGuessesGame';
import MascotImage from './components/MascotImage';

const apiUrl = 'http://localhost:8080'; // This will be updated to Cloud Run URL for deployment

function App() {
  const [gameMode, setGameMode] = useState('ai-guesses'); // 'ai-guesses' or 'player-guesses'
  const [preGame, setPreGame] = useState(true);
  const [started, setStarted] = useState(false);
  const [victory, setVictory] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [maxQuestions] = useState(20);
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [highlightedResponse, setHighlightedResponse] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [gameMessage, setGameMessage] = useState("");
  const [aiQuestion, setAiQuestion] = useState("");

  // Mascot image state
  const getMascotImage = () => {
    if (loading) {
      return '/public/bot_boy/thinking.png';
    } else if (preGame) {
      return '/public/bot_boy/guy.png';
    } else if (!started) {
      return `/public/bot_boy/${victory ? 'guy' : 'sadge'}.png`;
    } else {
      return '/public/bot_boy/guy.png';
    }
  };

  // Function to clear highlights
  const clearHighlights = () => {
    setHighlightedResponse(null);
  };

  // Function to reset game state
  const resetGame = () => {
    setPreGame(true);
    setStarted(false);
    setVictory(false);
    setQuestionCount(0);
    setChatHistory([]);
    setLoading(false);
    setHighlightedResponse(null);
    setSessionId(null);
    setGameMessage(
      gameMode === 'ai-guesses'
        ? "Let's play! Think of a video game, and I'll try to guess it. Click \"Start Game\" when you're ready!"
        : "I'm thinking of a game. You have 20 questions to guess it. Click \"Start Game\" to begin!"
    );
    setAiQuestion("");
    clearHighlights();
  };

  // Initialize game message on mode switch or initial load
  useEffect(() => {
    resetGame();
  }, [gameMode]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="game-container bg-white p-8 rounded-xl shadow-lg border border-gray-200 text-center">
      <h1 className="text-4xl font-extrabold text-gray-800 mb-6">Game Boy's Game Guesser</h1>
      <div className="tabs flex justify-center border-b mb-4">
        <button
          id="tab-ai-guesses"
          className={`tab-btn ${gameMode === 'ai-guesses' ? 'active' : ''}`}
          onClick={() => setGameMode('ai-guesses')}
        >
          Game boy guesses
        </button>
        <button
          id="tab-player-guesses"
          className={`tab-btn ${gameMode === 'player-guesses' ? 'active' : ''}`}
          onClick={() => setGameMode('player-guesses')}
        >
          You guess
        </button>
      </div>
      <MascotImage imageSrc={getMascotImage()} />

      <p id="game-message" className="text-lg text-gray-600 mb-4">{gameMessage}</p>

      {gameMode === 'ai-guesses' && (
        <AIGuessesGame
          gameMode={gameMode}
          preGame={preGame}
          started={started}
          loading={loading}
          questionCount={questionCount}
          maxQuestions={maxQuestions}
          chatHistory={chatHistory}
          highlightedResponse={highlightedResponse}
          sessionId={sessionId}
          setPreGame={setPreGame}
          setStarted={setStarted}
          setQuestionCount={setQuestionCount}
          setChatHistory={setChatHistory}
          setLoading={setLoading}
          setHighlightedResponse={setHighlightedResponse}
          setSessionId={setSessionId}
          setGameMessage={setGameMessage}
          setAiQuestion={setAiQuestion}
          setVictory={setVictory}
        />
      )}

      {gameMode === 'player-guesses' && (
        <PlayerGuessesGame
          gameMode={gameMode}
          preGame={preGame}
          started={started}
          loading={loading}
          questionCount={questionCount}
          maxQuestions={maxQuestions}
          chatHistory={chatHistory}
          highlightedResponse={highlightedResponse}
          sessionId={sessionId}
          setPreGame={setPreGame}
          setStarted={setStarted}
          setQuestionCount={setQuestionCount}
          setChatHistory={setChatHistory}
          setLoading={setLoading}
          setHighlightedResponse={setHighlightedResponse}
          setSessionId={setSessionId}
          setGameMessage={setGameMessage}
          setVictory={setVictory}
        />
      )}
    </div>
  );
}

export default App;
