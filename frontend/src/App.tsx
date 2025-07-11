import { useState, useEffect } from 'react';

// The existing AuthPage is now presented via the new StartingScreen so we can
// remove its direct usage from the main application shell.

import StartingScreen from './screens/StartingScreen';
import AIGuessesGame from './AIGuessesGame';
import PlayerGuessesGame from './PlayerGuessesGame';
import MascotImage from './components/MascotImage';

import { ChatMessage, GameMode } from './types';
import { MAX_QUESTIONS } from './constants';

interface AuthPayload {
  token: string;
  username: string;
}

function App() {
  // --------------------------- App-level state -----------------------------
  // Authentication state – persisted in `localStorage` to survive refreshes.
  const [token, setToken] = useState<string | null>(
    typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null,
  );
  const [username, setUsername] = useState<string | null>(
    typeof localStorage !== 'undefined' ? localStorage.getItem('username') : null,
  );

  // `null` means the player is still on the starting screen choosing a game.
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
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

  // ----------------------------- Helpers -------------------------------
  // Save auth credentials, then let the starting screen proceed to mode
  // selection.
  const handleAuth = ({ token: newToken, username: newUsername }: AuthPayload) => {
    setToken(newToken);
    setUsername(newUsername);
  };

  // Called by the starting screen when the player picks which game to play.
  const handleSelectGame = (mode: GameMode) => {
    setGameMode(mode);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setToken(null);
    setUsername(null);
    // Return to lobby.
    setGameMode(null);
    resetGame();
  };

  // ---------------- Utility helpers ----------------
  /**
   * Returns the mascot image URL appropriate for the current UI state.
   *
   * Uses a static `import.meta.url` based construction so that Vite (and
   * Parcel in dev‐server mode) can statically analyse the asset paths.
   */
  const getMascotImage = () => {
    if (loading) return new URL('bot_boy/thinking.png', import.meta.url);
    if (preGame) return new URL('bot_boy/guy.png', import.meta.url);
    if (!started) {
      if (victory) return new URL('bot_boy/sadge.png', import.meta.url);
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
    clearHighlights();
    setSessionId(null);
    setGameMessage(
      gameMode === 'ai-guesses'
        ? "Let's play! Think of a video game, and I'll try to guess it. Click \"Start Game\" when you're ready!"
        : "I'm thinking of a game. You have 20 questions to guess it. Click \"Start Game\" to begin!",
    );
    setAiQuestion('');
  };

  // Reset all game-specific state whenever the chosen mode changes.
  useEffect(() => {
    if (gameMode) resetGame();
  }, [gameMode]);

  // Load conversation history when the user logs-in
  useEffect(() => {
    if (!token) return;

    const fetchHistory = async () => {
      try {
        const response = await fetch('http://localhost:8080/conversations/history', {
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

  // --------------------------- Render ----------------------------
  // 1. The initial lobby / auth page.
  if (gameMode === null) {
    return (
      <StartingScreen
        token={token}
        username={username}
        onAuth={handleAuth}
        onSelectGame={handleSelectGame}
      />
    );
  }

  // 2. The active game session (either AI guesses or player guesses).
  return (
    <div className="game-container bg-white p-8 rounded-xl shadow-lg border border-gray-200 text-center">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Hello, {username}!</h2>
        <button className="text-sm text-blue-600 hover:underline" onClick={handleLogout}>
          Logout
        </button>
      </div>

      <h1 className="text-4xl font-extrabold text-gray-800 mb-6">Game Boy's Game Guesser</h1>

      {/* The original two–tab selector is now handled via the dedicated
          starting screen. We keep the semantic container here in case future
          designs re-introduce mode switching mid-game, but it's hidden to
          avoid confusing players. */}
      <div className="hidden" />

      <MascotImage imageSrc={getMascotImage()} />

      <p id="game-message" className="text-lg text-gray-600 mb-4">
        {gameMessage}
      </p>

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
