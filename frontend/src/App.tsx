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
import SettingsButton from './components/SettingsButton';
import LoadingIndicator from './components/LoadingIndicator';

import { ChatMessage, GameMode, Role } from './types';
import { isGameCompleted } from './utils/gameCompletion';
import { MAX_QUESTIONS } from './constants';
import { getApiUrl } from './env_utils';
import { wrapNavigate } from './utils/transition-utils';
import { useTokenInvalidation } from './utils/useTokenInvalidation';

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
  const [started, setStarted] = useState<boolean>(false);
  const [victory, setVictory] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);
  const [questionCount, setQuestionCount] = useState<number>(0);
  const [maxQuestions] = useState<number>(MAX_QUESTIONS);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [gameMessage, setGameMessage] = useState<string>('');
  const [showResults, setShowResults] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [aiGuessesCompletedToday, setAIGuessesCompletedToday] = useState<boolean>(false);
  const [playerGuessesCompletedToday, setPlayerGuessesCompletedToday] = useState<boolean>(false);
  const [confidence, setConfidence] = useState<number | undefined>(undefined);
  // Track whether the player used a hint and the final score (for player-guesses mode).
  const [usedHint, setUsedHint] = useState<boolean | undefined>(undefined);
  const [score, setScore] = useState<number | undefined>(undefined);

  const handleGameCompletion = (mode: GameMode) => {
    if (mode === 'ai-guesses') {
      setAIGuessesCompletedToday(true);
    } else {
      setPlayerGuessesCompletedToday(true);
    }
  };
  // ---------------- Authentication helpers ----------------
  const handleAuth = ({ token: newToken, username: newUsername }: AuthPayload) => {
    setToken(newToken);
    setUsername(newUsername);
  };

  const navigate = wrapNavigate(useNavigate());

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

  // Logout automatically when the backend returns HTTP 401 for any request.
  useTokenInvalidation(handleLogout);

  /** Returns the mascot image URL appropriate for the current UI state. */
  const getMascotMood = () => {
    if (error) return 'error';
    if (loading) return 'thinking';
    if (!started) {
      if (victory) return 'sad';
      return 'default';
    }
    return 'default';
  };


  const resetGame = () => {
    setStarted(false);
    setVictory(false);
    setQuestionCount(0);
    setChatHistory([]);
    setLoading(false);
    setSessionId(null);
    setShowResults(false);
    setShowHistory(false);
    setConfidence(undefined);
    setUsedHint(undefined);
    setScore(undefined);
    if (!started) {
      setGameMessage(
        gameMode === 'ai-guesses'
          ? "Let's play! Think of a video game, and I'll try to guess it. Click \"Start Game\" when you're ready!"
          : "I'm thinking of a game. You have 20 questions to guess it. Click \"Start Game\" to begin!",
      );
    }
  };

  // Reset whenever the mode changes
  useEffect(resetGame, [gameMode]);

  // Load conversation history and check completion when the user logs-in or game mode changes
  useEffect(() => {
    if (!token) return;

    const fetchGameState = async () => {
      try {
        const response = await fetch(`${getApiUrl()}/game-state?gameMode=${gameMode}&date=${new Date().toISOString().slice(0, 10)}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (response.status === 401) {
          handleLogout();
          return;
        }
        if (!response.ok) throw new Error('Failed to load game state');

        const gameState = await response.json();

        if (gameState) {
          const history = gameState.chatHistory.map((r) => ({
            role: r.role,
            parts: [{ text: r.content }],
            gameType: r.game_type,
          }));
          setChatHistory(history);
          setSessionId(gameState.sessionId);
          setQuestionCount(gameState.questionCount);
          setStarted(true);
          setConfidence(gameState.confidence);

          // Check completion for both game types
          const completed = isGameCompleted(gameMode, history, gameState.questionCount, maxQuestions);
          if (gameMode === 'ai-guesses') setAIGuessesCompletedToday(completed);
          if (gameMode === 'player-guesses') setPlayerGuessesCompletedToday(completed);
        } else {
          setChatHistory([]);
          setSessionId(null);
          setQuestionCount(0);
          setStarted(false);
          if (gameMode === 'ai-guesses') setAIGuessesCompletedToday(false);
          if (gameMode === 'player-guesses') setPlayerGuessesCompletedToday(false);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error fetching game state', err);
        setChatHistory([]);
        setSessionId(null);
        setQuestionCount(0);
        setStarted(false);
        if (gameMode === 'ai-guesses') setAIGuessesCompletedToday(false);
        if (gameMode === 'player-guesses') setPlayerGuessesCompletedToday(false);
      }
    };

    fetchGameState();
  }, [token, gameMode, maxQuestions]);

  if (!token) {
    return <AuthPage onAuth={handleAuth} />;
  }

  return (
    <>
      <SettingsButton />
      <div
        className="game-container bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 text-center text-gray-900 dark:text-white"
      >
      {location.pathname !== '/' && <RulesIcon gameMode={gameMode} />}
      <div className="flex justify-between items-center mb-4">
        <button 
          onClick={() => navigate('/', gameMode === 'ai-guesses' ? 'right' : 'left')}
          className="cursor-pointer flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
        >
          <svg 
            className="w-5 h-5 mr-2" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M15 19l-7-7 7-7" 
            />
          </svg>
          Back to Games
        </button>
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setShowHistory(true)}
            className="cursor-pointer text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
          >
            📊 History
          </button>
          <button className="cursor-pointer text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      <div className="flex justify-center items-center ml-4 mr-4">
        <MascotImage mood={getMascotMood()} confidence={confidence} error={error} loading={loading} />
        <p id="game-message" className="text-lg text-gray-600 dark:text-gray-300 mb-4">{gameMessage}</p>
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
          score={score}
          usedHint={usedHint}
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
          preGame={false}
          started={started}
          loading={loading}
          questionCount={questionCount}
          maxQuestions={maxQuestions}
          chatHistory={chatHistory}
          highlightedResponse={null}
          sessionId={sessionId}
          setStarted={setStarted}
          setQuestionCount={setQuestionCount}
          setChatHistory={setChatHistory}
          setLoading={setLoading}
          setSessionId={setSessionId}
          setGameMessage={setGameMessage}
          setVictory={setVictory}
          setShowResults={setShowResults}
          setConfidence={setConfidence}
          setError={setError}
          gameCompletedToday={aiGuessesCompletedToday}
          onGameCompleted={() => handleGameCompletion('ai-guesses')}
        />
      )}

      {gameMode === 'player-guesses' && (
        <PlayerGuessesGame
          token={token}
          gameMode={gameMode}
          started={started}
          loading={loading}
          questionCount={questionCount}
          maxQuestions={maxQuestions}
          chatHistory={chatHistory}
          sessionId={sessionId}
          callbacks={{
            setStarted,
            setQuestionCount,
            setChatHistory,
            setLoading,
            setSessionId,
            setGameMessage,
            setConfidence,
            setVictory,
            setShowResults,
            setError,
            setScore,
            setUsedHint,
            onGameCompleted: () => handleGameCompletion('player-guesses'),
          }}
          gameCompletedToday={playerGuessesCompletedToday}
        />
      )}
      
      {((gameMode === 'player-guesses' && playerGuessesCompletedToday) ||
       (gameMode === 'ai-guesses' && aiGuessesCompletedToday)) && (
        <button
          onClick={() => setShowResults(true)}
          className="cursor-pointer mt-4 px-6 py-3 bg-green-600 text-white font-bold rounded-lg shadow-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75 transition duration-200 transform hover:scale-105"
        >
          View Results
        </button>
      )}
      </div>
    </>
  );
}

export default App;
