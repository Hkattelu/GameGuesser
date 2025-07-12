import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';

import AuthPage from './AuthPage';
import AIGuessesGame from './AIGuessesGame';
import PlayerGuessesGame from './PlayerGuessesGame';
import MascotImage from './components/MascotImage';

import { ChatMessage, GameMode } from './types';
import { MAX_QUESTIONS } from './constants';

interface AuthPayload {
  token: string;
  username: string;
}

interface AppProps {
  /**
   * Which game mode should be pre-selected when this component mounts.
   * If omitted, defaults to `'ai-guesses'`.
   */
  initialMode?: GameMode;
  /**
   * Optional callback to navigate back to the home / start screen. When
   * provided the component will call this callback on logout instead of
   * using React-Router's `useNavigate` to push `/`. This lets the component
   * be rendered in isolation (e.g. in unit tests or Storybook) without
   * requiring a Router context.
   */
  onNavigateHome?: () => void;
}

function App({
  initialMode = 'ai-guesses',
  onNavigateHome,
}: AppProps) {
  // Authentication state
  const [token, setToken] = useState<string | null>(
    typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null,
  );
  const [username, setUsername] = useState<string | null>(
    typeof localStorage !== 'undefined' ? localStorage.getItem('username') : null,
  );

  // Game-specific state
  const [gameMode, setGameMode] = useState<GameMode>(initialMode);
  const [preGame, setPreGame] = useState<boolean>(true);
  const [started, setStarted] = useState<boolean>(false);
  const [victory, setVictory] = useState<boolean | 'guess'>(false);
  const [questionCount, setQuestionCount] = useState<number>(0);
  const [maxQuestions] = useState<number>(MAX_QUESTIONS);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [highlightedResponse, setHighlightedResponse] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [gameMessage, setGameMessage] = useState<string>('');
  const [aiQuestion, setAiQuestion] = useState<string>('');

  // ---------------- Authentication helpers ----------------
  const handleAuth = ({ token: newToken, username: newUsername }: AuthPayload) => {
    setToken(newToken);
    setUsername(newUsername);
  };

  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setToken(null);
    setUsername(null);
    resetGame();
    // Navigate back to the StartScreen once the user logs out.
    if (onNavigateHome) {
      onNavigateHome();
    } else {
      navigate('/');
    }
  };

  /** Returns the mascot image URL appropriate for the current UI state. */
  const getMascotImage = () => {
    const base = '/bot_boy/';
    if (loading) return `${base}thinking.png`;
    if (preGame) return `${base}guy.png`;
    if (!started) {
      if (victory) return `${base}sadge.png`;
      return `${base}guy.png`;
    }
    return `${base}guy.png`;
  };

  const clearHighlights = () => setHighlightedResponse(null);

  const resetGame = () => {
    setPreGame(true);
    setStarted(false);
    setVictory(false);
    setQuestionCount(0);
    setChatHistory([]);
    setLoading(false);
    clearHighlights();
    setSessionId(null);
    setGameMessage(
      gameMode === 'ai-guesses'
        ? "Let's play! Think of a video game, and I'll try to guess it. Click \"Start Game\" when you're ready!"
        : "I'm thinking of a game. You have 20 questions to guess it. Click \"Start Game\" to begin!",
    );
    setAiQuestion('');
  };

  // Reset whenever the mode changes
  useEffect(resetGame, [gameMode]);

  // Load conversation history when the user logs-in
  useEffect(() => {
    if (!token) return;

    const fetchHistory = async () => {
      try {
        const response = await fetch('http://localhost:8080/conversations/history', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) throw new Error('Failed to load conversation history');

        type HistoryRow = { role: string; content: string };
        const rows: HistoryRow[] = await response.json();
        const history: ChatMessage[] = rows.map((r) => ({
          role: r.role as 'user' | 'model',
          parts: [{ text: r.content }],
        }));
        setChatHistory(history);
      } catch (err) {
        // eslint-disable-next-line no-console
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

      <h1 className="text-4xl font-extrabold text-gray-800 mb-6">Quiz Bot 9000's Arcade!</h1>
      <MascotImage imageSrc={getMascotImage()} />

      <p id="game-message" className="text-lg text-gray-600 mb-4">
        {gameMessage}
      </p>

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
