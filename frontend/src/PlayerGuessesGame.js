import { useState } from 'react';
import SuggestionChips from './components/SuggestionChips';
import ConversationHistory from './components/ConversationHistory';

const API_URL = 'http://localhost:8080';

function PlayerGuessesGame({
  authToken,
  gameMode,
  preGame,
  started,
  loading,
  questionCount,
  maxQuestions,
  chatHistory,
  highlightedResponse,
  sessionId,
  setPreGame,
  setStarted,
  setQuestionCount,
  setChatHistory,
  setLoading,
  setHighlightedResponse,
  setSessionId,
  setGameMessage,
  setVictory,
}) {
  const [playerGuessInput, setPlayerGuessInput] = useState('');

  const authHeaders = authToken ? { Authorization: `Bearer ${authToken}` } : {};

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
      const response = await fetch(`${API_URL}/player-guesses/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to start game');
      }

      const { sessionId: newSessionId } = await response.json();
      setSessionId(newSessionId);
      setGameMessage('Ask me a yes/no question, or try to guess the game!');
    } catch (error) {
      console.error(error);
      setGameMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayerQuestion = async () => {
    if (!playerGuessInput || !sessionId) return;
    setLoading(true);
    setHighlightedResponse(null);
    setChatHistory((prev) => [...prev, { role: 'user', parts: [{ text: playerGuessInput }] }]);

    try {
      const resp = await fetch(`${API_URL}/player-guesses/question`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({ sessionId, userInput: playerGuessInput }),
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || 'Failed');
      }

      const data = await resp.json();
      const { type, content, questionCount: newCount } = data;
      setQuestionCount(newCount);

      if (type === 'answer') {
        setHighlightedResponse(content);
        setChatHistory((prev) => [...prev, { role: 'model', parts: [{ text: content }] }]);
      } else if (type === 'guessResult') {
        if (content.correct) {
          endGame('You guessed it!', true);
        } else {
          setGameMessage(content.response);
          setChatHistory((prev) => [...prev, { role: 'model', parts: [{ text: content.response }] }]);
        }
      }
    } catch (error) {
      console.error(error);
      setGameMessage(`Error: ${error.message}`);
    } finally {
      setPlayerGuessInput('');
      setLoading(false);
    }
  };

  const endGame = (msg, victory) => {
    setStarted(false);
    setVictory(victory);
    setGameMessage(msg);
  };

  return (
    <div>
      <ConversationHistory chatHistory={chatHistory} gameMode={gameMode} />

      {started && !loading && (
        <input
          className="w-full p-3 border mb-3"
          value={playerGuessInput}
          onChange={(e) => setPlayerGuessInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handlePlayerQuestion()}
          placeholder="Ask a question or guess the game"
        />
      )}

      {started && !loading && (
        <SuggestionChips onSelectSuggestion={(q) => setPlayerGuessInput(q)} />
      )}

      {started && !loading && (
        <button className="px-6 py-2 bg-blue-600 text-white rounded" onClick={handlePlayerQuestion}>
          Submit
        </button>
      )}

      {!started && (
        <button className="px-6 py-2 bg-blue-600 text-white rounded" onClick={startGamePlayerGuesses}>
          Start Game
        </button>
      )}
    </div>
  );
}

export default PlayerGuessesGame;
