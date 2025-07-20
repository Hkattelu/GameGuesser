import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import ConfettiExplosion from "react-confetti-explosion";

import AuthPage from './AuthPage';
import AIGuessesGame from './AIGuessesGame';
import PlayerGuessesGame from './PlayerGuessesGame';
import MascotImage from './components/MascotImage';
import RulesIcon from './components/RulesIcon'; // Import RulesIcon
import GameResultsDialog from './components/GameResultsDialog';
import GameHistoryCalendar from './components/GameHistoryCalendar';

import { ChatMessage, GameMode } from './types';
import { MAX_QUESTIONS } from './constants';
import { getApiUrl } from './env_utils';

interface AuthPayload {
  token: string;
  username: string;
}

interface AppProps {
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
  onNavigateHome,
}: AppProps) {
  // Authentication state
  const [token, setToken] = useState<string | null>(
    typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null,
  );
  const [username, setUsername] = useState<string | null>(
    typeof localStorage !== 'undefined' ? localStorage.getItem('username') : null,
  );

  const location = useLocation();
  const initialGameMode = location.pathname.includes('player-guesses') ? 'player-guesses' : 'ai-guesses';

  // Game-specific state
  const [gameMode, setGameMode] = useState<GameMode>(initialGameMode);
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
  const [showResults, setShowResults] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);

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
  const getMascotMood = () => {
    const base = '/bot_boy/';
    if (loading) return 'thinking';
    if (preGame) return 'default';
    if (!started) {
      if (victory) return 'sad';
      return 'default';
    }
    return 'default';
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
    setShowResults(false);
    setShowHistory(false);
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
        const response = await fetch(`${getApiUrl()}/conversations/history?date=${new Date().toISOString().slice(0, 10)}`, {
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
    <div
      className="game-container bg-white p-8 rounded-xl shadow-lg border border-gray-200 text-center"
      style={{ viewTransitionName: 'game-container' }}
    >
      {location.pathname !== '/' && <RulesIcon gameMode={gameMode} />}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Hello, {username}!</h2>
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setShowHistory(true)}
            className="cursor-pointer text-sm text-blue-600 hover:underline"
          >
            📊 History
          </button>
          <button className="cursor-pointer text-sm text-blue-600 hover:underline" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      <div className="flex justify-center items-center ml-4 mr-4">
        <MascotImage mood={getMascotMood()} />
        <p id="game-message" className="text-lg text-gray-600 mb-4">{gameMessage}</p>
      </div>

      {victory && (
        <ConfettiExplosion
          force={0.6}
          duration={2000}
          particleCount={100}
          floorheight={1600}
          floorwidth={1600}
        />
      )}
      
      {(victory !== false && !started && !preGame) && (
        <button
          onClick={() => setShowResults(true)}
          className="mt-4 px-6 py-3 bg-green-600 text-white font-bold rounded-lg shadow-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75 transition duration-200 transform hover:scale-105"
        >
          View Results
        </button>
      )}

      {showResults && (
        <GameResultsDialog
          isOpen={showResults}
          onClose={() => setShowResults(false)}
          chatHistory={chatHistory}
          gameMode={gameMode}
          victory={victory}
          maxQuestions={maxQuestions}
          sessionId={sessionId}
          username={username}
        />
      )}
      
      {showHistory && (
        <GameHistoryCalendar
          token={token}
          gameMode={gameMode}
          isOpen={showHistory}
          onClose={() => setShowHistory(false)}
        />
      )}

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
          setShowResults={setShowResults}
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
          sessionId={sessionId}
          setPreGame={setPreGame}
          setStarted={setStarted}
          setQuestionCount={setQuestionCount}
          setChatHistory={setChatHistory}
          setLoading={setLoading}
          setSessionId={setSessionId}
          setGameMessage={setGameMessage}
          setVictory={setVictory}
          setShowResults={setShowResults}
        />
      )}
    </div>
  );
}

export default App;
