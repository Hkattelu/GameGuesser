import { useState } from 'react';
import SuggestionChips from './components/SuggestionChips';
import ConversationHistory from './components/ConversationHistory';
import { getApiUrl } from './env_utils';
import { ChatMessage, GameMode } from './types';

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
}: PlayerGuessesGameProps) {
  const [playerGuessInput, setPlayerGuessInput] = useState('');
  const [modelResponseText, setModelResponseText] = useState('');

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

      if (type === 'answer') {
        setModelResponseText(`My answer: ${content}`);
        setHighlightedResponse(content); // 'Yes', 'No', or 'I don't know'
        setChatHistory((prevHistory) => [
          ...prevHistory,
          { role: "model", parts: [{ text: content }] },
        ]);

        if (newQuestionCount >= maxQuestions) {
          endGame(`You're out of questions! The game was ${content}.`, false); // Backend will provide the game title in the final answer
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

  const endGame = (finalMessage: string, victoryStatus: boolean) => {
    setStarted(false);
    setLoading(false);
    setVictory(victoryStatus);
    setGameMessage(finalMessage);
    setModelResponseText('');
  };

  const handleSelectSuggestion = (question: string) => {
    setPlayerGuessInput(question);
  };

  return (
    <div id="player-guesses-game">
      {started && !loading && (
        <div id="response-buttons" className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4 mt-3 mb-3">
          <div id="btn-yes" className={`response-yes px-6 py-3 font-bold rounded-lg shadow-md ${highlightedResponse === 'Yes' ? 'highlight-yes' : ''}`}>Yes</div>
          <div id="btn-unsure" className={`response-unsure px-6 py-3 font-bold rounded-lg shadow-md ${highlightedResponse === 'Unsure' ? 'highlight-unsure' : ''}`}>Unsure</div>
          <div id="btn-no" className={`response-no px-6 py-3 font-bold rounded-lg shadow-md ${highlightedResponse === 'No' ? 'highlight-no' : ''}`}>No</div>
        </div>
      )}

      <ConversationHistory chatHistory={chatHistory} gameMode={gameMode} />

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
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handlePlayerQuestion();
              }
            }}
          />
        </div>
      )}

      {started && !loading && (
        <SuggestionChips onSelectSuggestion={handleSelectSuggestion} />
      )}

      {started && !loading && modelResponseText && (
        <div id="model-response" className="text-lg font-semibold p-4 rounded-lg my-4">
          {modelResponseText}
        </div>
      )}

      {started && !loading && (
        <button
          id="btn-submit-guess"
          className="px-8 py-4 bg-blue-600 text-white font-bold text-xl rounded-lg shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition duration-200 transform hover:scale-105"
          onClick={handlePlayerQuestion}
        >
          Submit
        </button>
      )}

      {!started && (
        <button
          id="btn-start-player-game"
          className="mt-2 px-8 py-4 bg-blue-600 text-white font-bold text-xl rounded-lg shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition duration-200 transform hover:scale-105"
          onClick={startGamePlayerGuesses}
        >
          Start Game
        </button>
      )}
    </div>
  );
}

export default PlayerGuessesGame;
