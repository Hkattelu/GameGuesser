import { useState } from 'react';
import SuggestionChips from './components/SuggestionChips';
import ConversationHistory from './components/ConversationHistory';
import { getApiUrl } from './env_utils';
import { MAX_SUGGESTIONS, SUGGESTIONS } from './constants';
import { ChatMessage, GameMode } from './types';

interface Hint {
  hintText: string;
}

export interface PlayerGuessesGameProps {
  gameMode: GameMode;
  preGame: boolean;
  started: boolean;
  loading: boolean;
  questionCount: number;
  maxQuestions: number;
  chatHistory: ChatMessage[];
  highlightedResponse: string | null;
  sessionId: string | null;
  setPreGame: React.Dispatch<React.SetStateAction<boolean>>;
  setStarted: React.Dispatch<React.SetStateAction<boolean>>;
  setQuestionCount: React.Dispatch<React.SetStateAction<number>>;
  setChatHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setHighlightedResponse: React.Dispatch<React.SetStateAction<string | null>>;
  setSessionId: React.Dispatch<React.SetStateAction<string | null>>;
  setGameMessage: React.Dispatch<React.SetStateAction<string>>;
  setVictory: React.Dispatch<React.SetStateAction<boolean | 'guess'>>;
  setShowResults: React.Dispatch<React.SetStateAction<boolean>>;
  // Optional JWT token for authenticated API requests
  token?: string | null;
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
  highlightedResponse,
  sessionId,
  token,
  setPreGame,
  setStarted,
  setQuestionCount,
  setChatHistory,
  setLoading,
  setHighlightedResponse,
  setSessionId,
  setGameMessage,
  setVictory,
  setShowResults,
}: PlayerGuessesGameProps) {
  const [playerGuessInput, setPlayerGuessInput] = useState('');
  const [modelResponseText, setModelResponseText] = useState('');
  const [suggestions, setSuggestions] = useState(shuffle([...SUGGESTIONS]).slice(0, MAX_SUGGESTIONS));

  const startGamePlayerGuesses = async () => {
    setPreGame(false);
    setStarted(true);
    setQuestionCount(0);
    setChatHistory([]);
    setLoading(true);
    setHighlightedResponse(null);
    setSessionId(null);
    setGameMessage("I'm thinking of a game. Please wait...");

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
      setSessionId(data.sessionId);
      setGameMessage("I'm thinking of a game. Ask me a yes/no question, or try to guess the game!");
    } catch (error: unknown) {
      const err = error as Error;
      setGameMessage(`Error starting the game: ${err.message}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayerQuestion = async () => {
    if (!playerGuessInput || !sessionId) return;

    setLoading(true);
    setHighlightedResponse(null);
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

      if (type === 'question' || type === 'answer') {
        // For the new schema, `content` is an object. For backward compatibility,
        // fall back to treating it as a plain string.
        let answerText = '';
        let answerLiteral: string = '';

        if (typeof content === 'string') {
          answerText = content;
          answerLiteral = content;
        } else if (content && typeof content === 'object') {
          answerLiteral = (content as any).answer;
          answerText = (content as any).answer + ((content as any).clarification ? ` - ${(content as any).clarification}` : '');
        }

        // Map "I don't know" -> "Unsure" to match button label.
        const normalizedHighlight = answerLiteral === "I don't know" ? 'Unsure' : answerLiteral;

        setModelResponseText(answerText);
        setHighlightedResponse(normalizedHighlight);
        setChatHistory((prevHistory) => [
          ...prevHistory,
          { role: "model", parts: [{ text: answerText }] },
        ]);
        setSuggestions(shuffle([...SUGGESTIONS]).slice(0, MAX_SUGGESTIONS));

        if (newQuestionCount >= maxQuestions) {
          endGame(`You're out of questions! The game was ${answerText}.`, false); // Backend will provide the game title in the final answer
        }
      } else if (type === 'guessResult') {
        if (content.correct) {
          endGame(`You guessed it! The game was ${content.response}.`, true);
          setChatHistory((prevHistory) => [
            ...prevHistory,
            { role: 'model', parts: [{ text: `You guessed it! The game was ${content.response}.` }] },
          ]);
        } else {
          setGameMessage(content.response);
          setChatHistory((prevHistory) => [
            ...prevHistory,
            { role: 'model', parts: [{ text: content.response }] },
          ]);
        }
      }
    } catch (error: unknown) {
      const err = error as Error;
      setGameMessage(`Error processing your question: ${err.message}. Please try again.`);
    } finally {
      setPlayerGuessInput('');
      setLoading(false);
    }
  };

  // Fetch a textual hint for the current secret game
  const handleGetHint = async () => {
    if (!sessionId) return;
    setLoading(true);

    try {
      const response = await fetch(`${getApiUrl()}/player-guesses/${sessionId}/hint`, {
        method: 'GET',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch hint.');
      }

      const data = (await response.json()) as Hint;
      setModelResponseText(data.hintText);
    } catch (error: unknown) {
      const err = error as Error;
      setGameMessage(`Error fetching hint: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const endGame = (finalMessage: string, victoryStatus: boolean) => {
    setStarted(false);
    setLoading(false);
    setVictory(victoryStatus);
    setGameMessage(finalMessage);
    setModelResponseText('');
    // Show results dialog after a short delay
    setTimeout(() => setShowResults(true), 1500);
  };

  const handleSelectSuggestion = (question: string) => {
    setPlayerGuessInput(question);
    setSuggestions(suggestions.filter(suggestion => suggestion !== question));
  };

  return (
    <div id="player-guesses-game">
      {started && !loading && modelResponseText && (
        <div id="model-response" className="text-lg font-semibold p-4 rounded-lg my-4" data-testid="model-response">
          {modelResponseText}
        </div>
      )}

      <ConversationHistory chatHistory={chatHistory} gameMode={gameMode} loading={loading} />

      {started && (
        <div id="player-question-count" className="text-lg font-semibold text-gray-700 mb-4">
          Questions left: {maxQuestions - questionCount}/{maxQuestions}
        </div>
      )}

      {started && !loading && (
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

      {started && !loading && (
        <SuggestionChips suggestions={suggestions} onSelectSuggestion={handleSelectSuggestion} />
      )}

      {started && !loading && (
        
          <div className="flex justify-center gap-6 mt-4">
            <button
              id="btn-hint"
              type="button"
              className="cursor-pointer px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75 transition duration-200"
              onClick={handleGetHint}
            >
              Hint
            </button>
            <button
              id="btn-submit-guess"
              type="button"
              className="cursor-pointer px-8 py-4 bg-blue-600 text-white font-bold text-xl rounded-lg shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition duration-200 transform hover:scale-105"
              onClick={handlePlayerQuestion}
            >
              Submit
            </button>
          </div>
      )}

      {!started && (
        <button
          id="btn-start-player-game"
          className="cursor-pointer mt-2 px-8 py-4 bg-blue-600 text-white font-bold text-xl rounded-lg shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition duration-200 transform hover:scale-105"
          onClick={startGamePlayerGuesses}
        >
          Start Game
        </button>
      )}
    </div>
  );
}

export default PlayerGuessesGame;
