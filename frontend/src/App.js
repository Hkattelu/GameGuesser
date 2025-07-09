import { useState, useEffect } from 'react';
import Auth from './Auth';
import AIGuessesGame from './AIGuessesGame';
import PlayerGuessesGame from './PlayerGuessesGame';
import MascotImage from './components/MascotImage';

const API_URL = 'http://localhost:8080';

function App() {
  // Auth state
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(null);

  const handleAuthSuccess = (token, user) => {
    setAuthToken(token);
    setUser(user);
    localStorage.setItem('token', token);
  };

  const handleLogout = () => {
    setAuthToken(null);
    setUser(null);
    localStorage.removeItem('token');
  };

  // Conversations fetched after login (not fully used yet)
  const [storedConversations, setStoredConversations] = useState({});

  useEffect(() => {
    async function fetchConversations() {
      if (!authToken) return;
      try {
        const resp = await fetch(`${API_URL}/conversations`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (resp.ok) {
          const data = await resp.json();
          setStoredConversations(data);
        }
      } catch (err) {
        console.error('Failed to load conversations', err);
      }
    }
    fetchConversations();
  }, [authToken]);

  // Game UI state (moved from old App)
  const [gameMode, setGameMode] = useState('ai-guesses');
  const [preGame, setPreGame] = useState(true);
  const [started, setStarted] = useState(false);
  const [victory, setVictory] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [maxQuestions] = useState(20);
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [highlightedResponse, setHighlightedResponse] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [gameMessage, setGameMessage] = useState('');
  const [aiQuestion, setAiQuestion] = useState('');

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
        : "I'm thinking of a game. You have 20 questions to guess it. Click \"Start Game\" to begin!",
    );
    setAiQuestion('');
  };

  useEffect(() => {
    resetGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameMode]);

  if (!authToken) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="game-container bg-white p-6 rounded shadow max-w-3xl mx-auto mt-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">Game Boy's Game Guesser</h1>
        <button className="text-sm text-red-600" onClick={handleLogout}>
          Logout
        </button>
      </div>

      <div className="tabs flex justify-center border-b mb-4">
        <button
          className={`px-4 py-2 ${gameMode === 'ai-guesses' ? 'border-b-2 border-blue-600' : ''}`}
          onClick={() => setGameMode('ai-guesses')}
        >
          Bot guesses
        </button>
        <button
          className={`px-4 py-2 ${gameMode === 'player-guesses' ? 'border-b-2 border-blue-600' : ''}`}
          onClick={() => setGameMode('player-guesses')}
        >
          You guess
        </button>
      </div>

      <MascotImage imageSrc={getMascotImage()} />

      <p className="text-center my-4">{gameMessage}</p>

      {gameMode === 'ai-guesses' && (
        <AIGuessesGame
          authToken={authToken}
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
          authToken={authToken}
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
