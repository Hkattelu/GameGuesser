import { useState } from 'react';
import SuggestionChips from './components/SuggestionChips';
import ConversationHistory from './components/ConversationHistory';
import { getApiUrl } from './env_utils';
import { MAX_SUGGESTIONS, SUGGESTIONS } from './constants';
import { ChatMessage, GameMode, PlayerQuestionResponse, PlayerGuessResponse } from './types';
import HintIcon from './components/HintIcon';
import HintDialog from './components/HintDialog';
import ErrorBanner from './components/ErrorBanner';

export interface PlayerGuessesGameProps {
  gameMode: GameMode;
  preGame: boolean;
  started: boolean;
  loading: boolean;
  questionCount: number;
  maxQuestions: number;
  chatHistory: ChatMessage[];
  sessionId: string | null;
  setStarted: React.Dispatch<React.SetStateAction<boolean>>;
  setQuestionCount: React.Dispatch<React.SetStateAction<number>>;
  setChatHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setSessionId: React.Dispatch<React.SetStateAction<string | null>>;
  setGameMessage: React.Dispatch<React.SetStateAction<string>>;
  setVictory: React.Dispatch<React.SetStateAction<boolean | 'guess'>>;
  setShowResults: React.Dispatch<React.SetStateAction<boolean>>;
  setConfidence: React.Dispatch<React.SetStateAction<number | undefined>>;
  setError: React.Dispatch<React.SetStateAction<boolean>>;
  token?: string | null;
  gameCompletedToday?: boolean;
  onGameCompleted?: () => void;

  /**
   * Optional setters that allow this component to propagate the player's final
   * score and whether a hint was used up to the parent component. These values
   * are displayed in the GameResultsDialog.
   */
  setUsedHint?: React.Dispatch<React.SetStateAction<boolean | undefined>>;
  setScore?: React.Dispatch<React.SetStateAction<number | undefined>>;
}

/** Shuffle an array of elements randomly. */
function shuffle(arr: string[]) {
  const sortedArr = structuredClone(arr);
  for (let i = sortedArr.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [sortedArr[i], sortedArr[j]] = [sortedArr[j], sortedArr[i]];
  }
  return sortedArr;
}

function PlayerGuessesGame({
  gameMode,
  preGame,
  started,
  loading,
  questionCount,
  maxQuestions,
  chatHistory,
  sessionId,
  token,
  setStarted,
  setQuestionCount,
  setChatHistory,
  setLoading,
  setSessionId,
  setGameMessage,
  setVictory,
  setShowResults,
  setConfidence,
  setError,
  gameCompletedToday = false,
  onGameCompleted,
  setUsedHint,
  setScore,
}: PlayerGuessesGameProps) {
  const [playerGuessInput, setPlayerGuessInput] = useState('');
  const [modelResponseText, setModelResponseText] = useState('');
  const [suggestions, setSuggestions] = useState(shuffle([...SUGGESTIONS]).slice(0, MAX_SUGGESTIONS));
  const [isHintDialogOpen, setIsHintDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /**
   * Starts a new game of 20 Questions where the AI thinks of a game
   * and the player tries to guess what it is.
   * @return {Promise<void>} - A promise resolving when the game has
   *   started.
   */
  const startGamePlayerGuesses = async () => {
    // Clear any previous error so the banner disappears, then show a loading
    // state while we contact the backend.
    setSessionId(null);
    // Clear previous score / hint usage when starting a fresh game.
    setUsedHint?.(undefined);
    setScore?.(undefined);
    setErrorMessage(null);
    setError(false);
    setLoading(true);

    try {
      const response = await fetch(`${getApiUrl()}/player-guesses/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start game on backend.');
      }

      const data = await response.json();

      setStarted(true);
      setQuestionCount(0);
      setChatHistory([]);

      setSessionId(data.sessionId);
      setGameMessage("I'm thinking of a game. Ask me a yes/no question, or try to guess the game!");
    } catch (error: unknown) {
      const err = error as Error;
      setErrorMessage(`Error starting the game: ${err.message}`);
      setError(true);
      // Ensure the user can try again if the backend call fails.
      setStarted(false);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayerQuestion = async () => {
    if (!playerGuessInput || !sessionId) return;

    setErrorMessage(null);
    setLoading(true);
    setChatHistory((prevHistory) => [
      ...prevHistory,
      { role: "user", parts: [{ text: playerGuessInput }] },
    ]);

    try {
      const response = await fetch(`${getApiUrl()}/player-guesses/question`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ sessionId: sessionId, userInput: playerGuessInput }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get AI response from backend.');
      }

      const data = await response.json();
      const { type, content, questionCount: newQuestionCount } = data;

      setQuestionCount(newQuestionCount);
      if (content && typeof content === 'object') {
        setConfidence((content as PlayerQuestionResponse).confidence);
      }

      if (type === 'question' || type === 'answer') {
        let answerText = '';
        let answerLiteral: string = '';

        if (typeof content === 'string') {
          answerText = content;
          answerLiteral = content;
        } else if (content && typeof content === 'object') {
          const playerQuestionResponse = content as PlayerQuestionResponse;
          answerLiteral = playerQuestionResponse.answer;
          answerText = playerQuestionResponse.answer + (playerQuestionResponse.clarification ? ` - ${playerQuestionResponse.clarification}` : '');
        }

        setChatHistory((prevHistory) => [
          ...prevHistory,
          { role: "model", parts: [{ text: answerText }] },
        ]);
        const previousQuestions = chatHistory.filter(message => message.role === 'user')
            .map(message => message.parts[0].text);
        const notAskedSuggestions = SUGGESTIONS.filter(suggestion => !previousQuestions.includes(suggestion));
        setSuggestions(shuffle(notAskedSuggestions).slice(0, MAX_SUGGESTIONS));

        if (newQuestionCount >= maxQuestions) {
          endGame(`You're out of questions! The game was ${answerText}.`, false);
        }
      } else if (type === 'guessResult') {
        const { correct, response, score, usedHint } = content as PlayerGuessResponse;

        // Bubble the results up to the parent so the GameResultsDialog can
        // display them. Only update when the corresponding setter exists.
        if (typeof usedHint !== 'undefined') {
          setUsedHint?.(usedHint);
        }
        if (typeof score !== 'undefined') {
          setScore?.(score);
        }

        const finalMessage = `${response} (${score} pts)${usedHint ? ' - Hint used' : ''}`;
        if (correct) {
          endGame(finalMessage, true);
          setChatHistory((prevHistory) => [
            ...prevHistory,
            { role: 'model', parts: [{ text: response }] },
          ]);
        } else {
          setGameMessage(response);
          setChatHistory((prevHistory) => [
            ...prevHistory,
            { role: 'model', parts: [{ text: response }] },
          ]);
        }
      }
    } catch (error: unknown) {
      const err = error as Error;
      // Handle "Session not found" error by resetting the game state
      if (err.message === 'Session not found.') {
        setErrorMessage('Your game session has expired. Starting a new game...');
        setError(true);
        // Reset session and start a new game after a short delay
        setSessionId(null);
        setTimeout(() => {
          setErrorMessage(null);
          setError(false);
          startGamePlayerGuesses();
        }, 2000);
      } else {
        // Surface a user-friendly error banner instead of splicing raw error
        // strings into the main game feed.
        setErrorMessage(`Error processing your question: ${err.message}`);
        setError(true);
      }
    } finally {
      setPlayerGuessInput('');
      setLoading(false);
    }
  };

  const endGame = (finalMessage: string, victoryStatus: boolean) => {
    setStarted(false);
    setLoading(false);
    setVictory(victoryStatus);
    setGameMessage(finalMessage);
    setModelResponseText('');
    if (onGameCompleted) {
      onGameCompleted();
    }
    setTimeout(() => setShowResults(true), 1500);
  };

  const handleSelectSuggestion = (question: string) => {
    setPlayerGuessInput(question);
    setSuggestions(suggestions.filter(suggestion => suggestion !== question));
  };

  const openHintDialog = () => setIsHintDialogOpen(true);
  const closeHintDialog = () => setIsHintDialogOpen(false);

  return (
    <div id="player-guesses-game">
      <HintDialog
        isOpen={isHintDialogOpen}
        onClose={closeHintDialog}
        sessionId={sessionId}
        token={token}
      />
      {started && !loading && modelResponseText && (
        <div id="model-response" className="text-lg font-semibold p-4 rounded-lg my-4" data-testid="model-response">
          {modelResponseText}
        </div>
      )}

      {errorMessage && (
        <ErrorBanner
          message={errorMessage}
          onClose={() => {
            // Clear the error banner. The user can simply try the action again.
            setErrorMessage(null);
          }}
        />
      )}

      <ConversationHistory chatHistory={chatHistory} gameMode={gameMode} loading={loading} />

      {started && !gameCompletedToday && (
        <div id="player-question-count" className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">
          Questions left: {maxQuestions - questionCount}/{maxQuestions}
        </div>
      )}

      {started && !loading && !gameCompletedToday && (
        <div className="mb-6">
          <label htmlFor="player-guess-input" className="block text-gray-700 text-sm font-semibold mb-2" aria-hidden="true"></label>
          <input
            type="text"
            id="player-guess-input"
            placeholder="e.g., Is the game a first-person shooter?"
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
            value={playerGuessInput}
            onChange={(e) => setPlayerGuessInput(e.target.value)}
            onKeyUp={(e) => {
              if (e.key === 'Enter') {
                handlePlayerQuestion();
              }
            }}
          />
        </div>
      )}

      {started && !loading && !gameCompletedToday && (
        <SuggestionChips suggestions={suggestions} onSelectSuggestion={handleSelectSuggestion} />
      )}

      {started && !loading && !gameCompletedToday && (
        <div className="flex justify-center gap-6 mt-4">
          <button
            id="btn-submit-guess"
            type="button"
            className="cursor-pointer px-8 py-4 bg-blue-600 text-white font-bold text-xl rounded-lg shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition duration-200 transform hover:scale-105"
            onClick={handlePlayerQuestion}
          >
            Submit
          </button>
          <HintIcon onClick={openHintDialog} />
        </div>
      )}

      {!started && !gameCompletedToday && (
        <button
          id="btn-start-player-game"
          className="cursor-pointer mt-2 px-8 py-4 bg-blue-600 text-white font-bold text-xl rounded-lg shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition duration-200 transform hover:scale-105"
          onClick={startGamePlayerGuesses}
        >
          Start Game
        </button>
      )}
      {gameCompletedToday && (
        <div className="mt-8 text-lg text-gray-700 dark:text-gray-200 font-semibold">You have already played today. Come back tomorrow!</div>
      )}
    </div>
  );
}

export default PlayerGuessesGame;
