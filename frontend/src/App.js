import { useState, useEffect } from 'react';
import AuthPage from './AuthPage';
import AIGuessesGame from './AIGuessesGame';
import PlayerGuessesGame from './PlayerGuessesGame';
import MascotImage from './components/MascotImage';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [username, setUsername] = useState(localStorage.getItem('username'));
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

  // Called when login/register completed successfully
  const handleAuth = (newToken, newUsername) => {
    setToken(newToken);
    setUsername(newUsername);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setToken(null);
    setUsername(null);
    // Clear game states on logout
    resetGame();
  };

  /**
   * Gets the mascot image for the current game state.
   * 
   * This must be constructed with a static string to work with parcel.
   * 
   * @returns a URL with the correct image source
   */
  const getMascotImage = () => {
    if (loading) {
      return new URL('bot_boy/thinking.png', import.meta.url);
    } else if (preGame) {
      return new URL('bot_boy/guy.png', import.meta.url);
    } else if (!started) {
      if (victory) {
        return new URL('bot_boy/sadge.png', import.meta.url);
      }
      return new URL('bot_boy/guy.png', import.meta.url);
    }
    return new URL('bot_boy/guy.png', import.meta.url);
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

  // Fetch conversation history once we have a token.
  useEffect(() => {
    if (!token) return;

    const fetchHistory = async () => {
      try {
        const response = await fetch('http://localhost:8080/conversations/history', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          throw new Error('Failed to load conversation history');
        }
        const rows = await response.json();
        // Convert rows to the chatHistory structure used by components
        const history = rows.map((r) => ({ role: r.role, parts: [{ text: r.content }] }));
        setChatHistory(history);
      } catch (err) {
        console.error('Error fetching conversation history', err);
      }
    };

    fetchHistory();
  }, [token]);

  if (!token) {
    return <AuthPage onAuth={handleAuth} />;
  }

  return (
    <div className="game-container bg-white p-8 rounded-xl shadow-lg border border-gray-200 text-center">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Hello, {username}!</h2>
        <button className="text-sm text-blue-600 hover:underline" onClick={handleLogout}>
          Logout
        </button>
      </div>
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
          token={token}
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
          token={token}
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
