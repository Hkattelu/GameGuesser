import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import ResponseButtons from './components/ResponseButtons';
import ConversationHistory from './components/ConversationHistory';
import { ChatMessage, GameMode } from './types';
import { getApiUrl } from './env_utils';
import ErrorBanner from './components/ErrorBanner';
import GameResultsDialog from './components/GameResultsDialog';
import { isGameCompleted } from './utils/gameCompletion';
import { MAX_QUESTIONS } from './constants';
import MascotImage from './components/MascotImage';
import ConfettiExplosion from "react-confetti-explosion";
import RulesIcon from './components/RulesIcon';
import RulesDialog from './components/RulesDialog';
import GameHistoryCalendar from './components/GameHistoryCalendar';

import { useAuth } from './AuthContext';

const DEFAULT_MESSAGE = "Let's play! Think of a video game, and I'll try to guess it. Click \"Start Game\" when you're ready!";

function AIGuessesGame() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [started, setStarted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [questionCount, setQuestionCount] = useState<number>(0);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [gameMessage, setGameMessage] = useState<string>(DEFAULT_MESSAGE);
  const [victory, setVictory] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);
  const [showResults, setShowResults] = useState<boolean>(false);
  const [confidence, setConfidence] = useState<number | undefined>(undefined);
  const [aiGuessesCompletedToday, setAIGuessesCompletedToday] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [firebaseToken, setFirebaseToken] = useState<string | null>(null);
  const [maxQuestions] = useState<number>(MAX_QUESTIONS);
  const [isRulesDialogOpen, setIsRulesDialogOpen] = useState(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);

  const openRulesDialog = () => setIsRulesDialogOpen(true);
  const closeRulesDialog = () => setIsRulesDialogOpen(false);
  const openHistoryDialog = () => setShowHistory(true);

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

  useEffect(() => {
    if (!currentUser) {
      setChatHistory([]);
      setSessionId(null);
      setQuestionCount(0);
      setStarted(false);
      setAIGuessesCompletedToday(false);
      return;
    }

    const fetchGameState = async () => {
      setLoading(true);
      try {
        const token = await currentUser.getIdToken();
        const response = await fetch(`${getApiUrl()}/game-state?gameMode=ai-guesses&date=${new Date().toISOString().slice(0, 10)}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (response.status === 401) {
          // Handle logout if token is invalid
          setErrorMessage('Your login credentials are stale. Refreshing the page...');
          navigate('/'); // Redirect to home/auth page
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

          const completed = isGameCompleted('ai-guesses', history, gameState.questionCount, maxQuestions);
          setAIGuessesCompletedToday(completed);
          if (completed) {
            // If this is the case, the player won.
            const victoryStatus = gameState.questionCount >= maxQuestions;
            endGame('Congratulations on playing today! Come back tomorrow!', victoryStatus);
            return;
          }
        } else {
          setChatHistory([]);
          setSessionId(null);
          setQuestionCount(0);
          setStarted(false);
          setAIGuessesCompletedToday(false);
        }
      } catch (err) {
        console.error('Error fetching game state', err);
        setChatHistory([]);
        setSessionId(null);
        setQuestionCount(0);
        setStarted(false);
        setAIGuessesCompletedToday(false);
      } finally {
        setLoading(false);
      }
    };

    fetchGameState();
  }, [currentUser]);

  const getMascotMood = () => {
    if (error) return 'error';
    if (loading) return 'thinking';
    if (victory) return 'sad';
    if (confidence <= 2) {
      return 'sad';
    } else if (confidence <= 4) {
      return 'nervous';
    } else if (confidence <= 6) {
      return 'smile';
    }
    return 'smug';
  };

  const startGameAI = async () => {
    setErrorMessage(null);
    setError(false);
    setLoading(true);

    try {
      const token = await currentUser?.getIdToken();
      const response = await fetch(`${getApiUrl()}/ai-guesses/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start AI game on backend.');
      }

      const data = await response.json();
      const { sessionId: newSessionId, aiResponse, questionCount: newQuestionCount } = data;

      setStarted(true);
      setSessionId(newSessionId);
      setQuestionCount(newQuestionCount);

      setChatHistory([
        { role: "model", parts: [{ text: JSON.stringify(aiResponse) }] },
      ]);

      setGameMessage("Your turn to answer!");

    } catch (error: unknown) {
      const err = error as Error;
      setErrorMessage(`Error starting game: ${err.message}`);
      setError(true);
      setStarted(false);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = async (answer: string) => {
    if (!started || !sessionId) return;

    setErrorMessage(null);
    setError(false);
    setGameMessage(`You answered "${answer}". Thinking...`);
    setChatHistory((prevHistory) => [
      ...prevHistory,
      { role: "user", parts: [{ text: answer }] },
    ]);

    try {
      const token = await currentUser?.getIdToken();
      const response = await fetch(`${getApiUrl()}/ai-guesses/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ sessionId: sessionId, userAnswer: answer }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get AI response from backend.');
      }

      const data = await response.json();
      const { aiResponse, questionCount: newQuestionCount } = data;

      setQuestionCount(newQuestionCount);
      setChatHistory((prevHistory) => [
        ...prevHistory,
        { role: "model", parts: [{ text: JSON.stringify(aiResponse) }] },
      ]);

      if (newQuestionCount > maxQuestions) {
        endGame("I can't believe it! You win! I'll get it next time!", true);
        return;
      } else if (aiResponse.type === "question") {
        setGameMessage("Your turn to answer!");
      } else if (aiResponse.type === "guess" && aiResponse.content === true) {
        endGame('Hooray, I win! That was fun! Let\'s play again!', false);
        return;
      }
    } catch (error: unknown) {
      const err = error as Error;
      if (err.message === 'Session not found.') {
        setErrorMessage('Your game session has expired. Starting a new game...');
        setError(true);
        setSessionId(null);
        setTimeout(() => {
          setErrorMessage(null);
          setError(false);
          startGameAI();
        }, 2000);
      } else {
        setErrorMessage(`Error communicating with Quiz Bot: ${err.message}`);
        setError(true);
      }
    } finally {
    }
  };

  const endGame = (finalMessage: string, victoryStatus: boolean) => {
    setStarted(false);
    setLoading(false);
    setVictory(victoryStatus);
    setGameMessage(finalMessage);
    setAIGuessesCompletedToday(true);
    setTimeout(() => setShowResults(true), 1000);
  };

  return (
    <div id="ai-guesses-game">
      <RulesIcon gameMode="ai-guesses" onClick={openRulesDialog} />
      <RulesDialog
        isOpen={isRulesDialogOpen}
        onClose={closeRulesDialog}
        gameMode="ai-guesses"
      />
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
      {started && (
        <div id="player-question-count" className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">
          Questions left: {maxQuestions - questionCount}/{maxQuestions}
        </div>
      )}

      {errorMessage && (
        <ErrorBanner
          message={errorMessage}
          onClose={() => setErrorMessage(null)}
        />
      )}

      <ConversationHistory chatHistory={chatHistory} gameMode="ai-guesses" loading={loading} isGameCompleted={aiGuessesCompletedToday} />

      {started && !loading && !aiGuessesCompletedToday  && (
        <ResponseButtons onAnswer={handleAnswer} highlightedResponse={null} />
      )}

      {!started && !aiGuessesCompletedToday && (
        <button
          id="btn-start-game"
          className="cursor-pointer mt-8 px-8 py-4 bg-blue-600 text-white font-bold text-xl rounded-lg shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition duration-200 transform hover:scale-105"
          onClick={startGameAI}
        >
          Start Game
        </button>
      )}
      {!started && aiGuessesCompletedToday && (
        <>
          <div className="mt-8 text-lg text-gray-700 dark:text-gray-200 font-semibold">You have already played today. Come back tomorrow!</div>
          <button 
            onClick={openHistoryDialog}
            className="cursor-pointer mt-4 px-6 py-3 bg-green-600 text-white font-bold rounded-lg shadow-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75 transition duration-200 transform hover:scale-105 mr-5"
          >
            📊 History
          </button>
          <button
            onClick={() => setShowResults(true)}
            className="cursor-pointer mt-4 px-6 py-3 bg-green-600 text-white font-bold rounded-lg shadow-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75 transition duration-200 transform hover:scale-105"
          >
            View Results
          </button>
        </>
      )}

      {showResults && (
        <GameResultsDialog
          isOpen={showResults}
          onClose={() => setShowResults(false)}
          chatHistory={chatHistory}
          gameMode="ai-guesses"
          victory={victory}
          maxQuestions={maxQuestions}
          score={undefined}
          usedHint={undefined}
        />
      )}

      {showHistory && (
        <GameHistoryCalendar
          token={firebaseToken}
          gameMode="ai-guesses"
          isOpen={showHistory}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  );
}

export default AIGuessesGame;
