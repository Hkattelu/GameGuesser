import React from 'react';
import ResponseButtons from './components/ResponseButtons';
import ConversationHistory from './components/ConversationHistory';
import { ChatMessage, GameMode } from './types';
import { getApiUrl } from './env_utils';
import ErrorBanner from './components/ErrorBanner';

export interface AIGuessesGameProps {
  gameMode: GameMode;
  preGame: boolean;
  started: boolean;
  loading: boolean;
  questionCount: number;
  maxQuestions: number;
  chatHistory: ChatMessage[];
  highlightedResponse: string | null;
  sessionId: string | null;
  setStarted: React.Dispatch<React.SetStateAction<boolean>>;
  setQuestionCount: React.Dispatch<React.SetStateAction<number>>;
  setChatHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setSessionId: React.Dispatch<React.SetStateAction<string | null>>;
  setGameMessage: React.Dispatch<React.SetStateAction<string>>;
  setVictory: React.Dispatch<React.SetStateAction<boolean>>;
  setShowResults: React.Dispatch<React.SetStateAction<boolean>>;
  setConfidence: React.Dispatch<React.SetStateAction<number | undefined>>;
  setError: React.Dispatch<React.SetStateAction<boolean>>;
  // Optional JWT token for authenticated API requests
  token?: string | null;
  gameCompletedToday?: boolean;
  onGameCompleted?: () => void;
}

function AIGuessesGame({
  gameMode,
  preGame,
  started,
  loading,
  questionCount,
  maxQuestions,
  chatHistory,
  highlightedResponse,
  sessionId,
  token,
  setStarted,
  setQuestionCount,
  setChatHistory,
  setLoading,
  setSessionId,
  setGameMessage,
  setVictory,
  setError,
  setShowResults,
  gameCompletedToday = false,
  onGameCompleted,
}: AIGuessesGameProps) {

  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const startGameAI = async () => {
    // Clear any previous error state so the banner disappears immediately.
    setErrorMessage(null);
    setError(false);
    // Show a pending state while we contact the backend.
    setLoading(true);

  try {
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

      // ✅ Only update the UI to *started* after a successful response.
      setStarted(true);
      setSessionId(newSessionId);
      setQuestionCount(newQuestionCount);

      // Reset chat history for the brand-new game session.
      setChatHistory([
        { role: "model", parts: [{ text: JSON.stringify(aiResponse) }] },
      ]);

      setGameMessage("Your turn to answer!");

    } catch (error: unknown) {
      const err = error as Error;
      setErrorMessage(`Error starting game: ${err.message}`);
      setError(true);
      // Roll back optimistic flag in case it was toggled previously.
      setStarted(false);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = async (answer: string) => {
    if (!started || !sessionId) return;

    setErrorMessage(null);
    setError(false);
    setLoading(true);
    setGameMessage(`You answered "${answer}". Thinking...`);
    setChatHistory((prevHistory) => [
      ...prevHistory,
      { role: "user", parts: [{ text: answer }] },
    ]);

    try {
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

      if (aiResponse.type === "question") {
        if (newQuestionCount > maxQuestions) {
          endGame("I couldn't guess your game in 20 questions! You win!", true);
          return;
        }
        setGameMessage("Your turn to answer!");
      } else if (aiResponse.type === "guess" && aiResponse.content === true) {
        endGame('Hooray, I win! That was fun! Let\'s play again!', false);
      } else {
        setGameMessage("Please try again.");
      }
    } catch (error: unknown) {
      const err = error as Error;
      setErrorMessage(`Error communicating with Quiz Bot: ${err.message}`);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const endGame = (finalMessage: string, victoryStatus: boolean) => {
    setStarted(false);
    setLoading(false);
    setVictory(victoryStatus);
    setGameMessage(victoryStatus ? 'Congratulations, you win!' : 'Victory!');
    if (onGameCompleted) {
      onGameCompleted();
    }
    // Show results dialog after a short delay
    setTimeout(() => setShowResults(true), 1000);
  };

  return (
    <div id="ai-guesses-game">
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

      {/* Conversation History */}
      <ConversationHistory chatHistory={chatHistory} gameMode={gameMode} loading={loading} />

      {/* User Response Buttons */}
      {started && !loading && (
        <ResponseButtons onAnswer={handleAnswer} highlightedResponse={null} />
      )}

      {/* Start Game Button */}
      {!started && !gameCompletedToday && (
        <button
          id="btn-start-game"
          className="cursor-pointer mt-8 px-8 py-4 bg-blue-600 text-white font-bold text-xl rounded-lg shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition duration-200 transform hover:scale-105"
          onClick={startGameAI}
        >
          Start Game
        </button>
      )}
      {!started && gameCompletedToday && (
        <div className="mt-8 text-lg text-gray-500 font-semibold">You have already played AI Guesses today. Come back tomorrow!</div>
      )}
    </div>
  );
}

export default AIGuessesGame;
