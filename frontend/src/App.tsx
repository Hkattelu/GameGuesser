import { useState, useEffect } from 'react';
import AIGuessesGame from './AIGuessesGame';
import PlayerGuessesGame from './PlayerGuessesGame';
import MascotImage from './components/MascotImage';
import { ChatMessage, GameMode } from './types';
import { MAX_QUESTIONS } from './constants';

function App() {
  const [gameMode, setGameMode] = useState<GameMode>('ai-guesses');
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

  // Derive mascot image based on current state
  const getMascotImage = () => {
    if (loading) {
      return new URL('bot_boy/thinking.png', import.meta.url);
    } else if (preGame) {
      return new URL('bot_boy/guy.png', import.meta.url);
    } else if (!started) {
      if (victory) {
        return new URL('bot_boy/sadge.png', import.meta.url);
      }
      return new URL('bot_boy/guy.png', import.meta.url);
    }
    return new URL('bot_boy/guy.png', import.meta.url);
  };

  const clearHighlights = () => setHighlightedResponse(null);

  const resetGame = () => {
    setPreGame(true);
    setStarted(false);
    setVictory(false);
    setQuestionCount(0);
    setChatHistory([]);
    setLoading(false);
    setHighlightedResponse(null);
    setSessionId(null);
    setGameMessage(
      gameMode === 'ai-guesses'
        ? "Let's play! Think of a video game, and I'll try to guess it. Click \"Start Game\" when you're ready!"
        : "I'm thinking of a game. You have 20 questions to guess it. Click \"Start Game\" to begin!",
    );
    setAiQuestion('');
    clearHighlights();
  };

  // Reset whenever the mode changes
  useEffect(resetGame, [gameMode]);

  return (
    <div className="game-container bg-white p-8 rounded-xl shadow-lg border border-gray-200 text-center">
      <h1 className="text-4xl font-extrabold text-gray-800 mb-6">Game Boy's Game Guesser</h1>

      <div className="tabs flex justify-center border-b mb-4">
        <button
          id="tab-ai-guesses"
          className={`tab-btn ${gameMode === 'ai-guesses' ? 'active' : ''}`}
          onClick={() => setGameMode('ai-guesses')}
        >
          Game boy guesses
        </button>
        <button
          id="tab-player-guesses"
          className={`tab-btn ${gameMode === 'player-guesses' ? 'active' : ''}`}
          onClick={() => setGameMode('player-guesses')}
        >
          You guess
        </button>
      </div>

      <MascotImage imageSrc={getMascotImage()} />

      <p id="game-message" className="text-lg text-gray-600 mb-4">
        {gameMessage}
      </p>

      {gameMode === 'ai-guesses' && (
        <AIGuessesGame
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
