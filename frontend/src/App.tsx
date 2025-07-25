import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import ConfettiExplosion from "react-confetti-explosion";

import AIGuessesGame from './AIGuessesGame';
import PlayerGuessesGame from './PlayerGuessesGame';
import MascotImage from './components/MascotImage';
import RulesIcon from './components/RulesIcon';
import GameResultsDialog from './components/GameResultsDialog';
import GameHistoryCalendar from './components/GameHistoryCalendar';
import SettingsButton from './components/SettingsButton';
import LoadingIndicator from './components/LoadingIndicator';

import { ChatMessage, GameMode, Role } from './types';
import { isGameCompleted } from './utils/gameCompletion';
import { MAX_QUESTIONS } from './constants';
import { getApiUrl } from './env_utils';
import { wrapNavigate } from './utils/transition-utils';

import { useAuth } from './AuthContext';
import { auth } from './firebase'; // Import auth for signOut

function App() {
  const { currentUser } = useAuth();

  const location = useLocation();
  const initialGameMode = location.pathname.includes('player-guesses') ? 'player-guesses' : 'ai-guesses';

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
  const [usedHint, setUsedHint] = useState<boolean | undefined>(undefined);
  const [score, setScore] = useState<number | undefined>(undefined);
  const [firebaseToken, setFirebaseToken] = useState<string | null>(null);

  useEffect(() => {
    const getToken = async () => {
      if (currentUser) {
        const token = await currentUser.getIdToken();
        setFirebaseToken(token);
      } else {
        setFirebaseToken(null);
      }
    };
    getToken();
  }, [currentUser]);

  const handleGameCompletion = (mode: GameMode) => {
    if (mode === 'ai-guesses') {
      setAIGuessesCompletedToday(true);
    } else {
      setPlayerGuessesCompletedToday(true);
    }
  };

  const navigate = wrapNavigate(useNavigate());

  const handleLogout = async () => {
    try {
      await auth.signOut();
      resetGame();
      navigate('/');
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

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
    if (!currentUser) {
      setChatHistory([]);
      setSessionId(null);
      setQuestionCount(0);
      setStarted(false);
      setAIGuessesCompletedToday(false);
      setPlayerGuessesCompletedToday(false);
      return;
    }

    const fetchGameState = async () => {
      try {
        const token = await currentUser.getIdToken();
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
          const history = gameState.chatHistory.map((r: any) => ({
            role: r.role,
            parts: [{ text: r.content }],
            gameType: r.game_type,
          }));
          setChatHistory(history);
          setSessionId(gameState.sessionId);
          setQuestionCount(gameState.questionCount);
          setStarted(true);
          setConfidence(gameState.confidence);

          const completed = isGameCompleted(gameMode, history, gameState.questionCount, maxQuestions);
          if (gameMode === 'ai-guesses') setAIGuessesCompletedToday(completed);
          if (gameMode === 'player-guesses') setPlayerGuessesCompletedToday(completed);
        } else {
          setChatHistory([]);
          setSessionId(null);
          setQuestionCount(0);
          setStarted(false);
          setAIGuessesCompletedToday(false);
          setPlayerGuessesCompletedToday(false);
        }
      } catch (err) {
        console.error('Error fetching game state', err);
        setChatHistory([]);
        setSessionId(null);
        setQuestionCount(0);
        setStarted(false);
        setAIGuessesCompletedToday(false);
        setPlayerGuessesCompletedToday(false);
      }
    };

    fetchGameState();
  }, [currentUser, gameMode, maxQuestions]);



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
          username={currentUser?.displayName || 'Guest'}
          score={score}
          usedHint={usedHint}
        />
      )}

      {showHistory && (
        <GameHistoryCalendar
          token={firebaseToken}
          gameMode={gameMode}
          isOpen={showHistory}
          onClose={() => setShowHistory(false)}
        />
      )}

      {gameMode === 'ai-guesses' && (
        <AIGuessesGame
          token={firebaseToken}
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
          token={firebaseToken}
          gameMode={gameMode}
          preGame={false}
          started={started}
          loading={loading}
          questionCount={questionCount}
          maxQuestions={maxQuestions}
          chatHistory={chatHistory}
          sessionId={sessionId}
          setStarted={setStarted}
          setQuestionCount={setQuestionCount}
          setChatHistory={setChatHistory}
          setLoading={setLoading}
          setSessionId={setSessionId}
          setGameMessage={setGameMessage}
          setConfidence={setConfidence}
          setVictory={setVictory}
          setShowResults={setShowResults}
          setError={setError}
          setScore={setScore}
          setUsedHint={setUsedHint}
          gameCompletedToday={playerGuessesCompletedToday}
          onGameCompleted={() => handleGameCompletion('player-guesses')}
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
