import { useState } from 'react';

import SuggestionChips from './components/SuggestionChips';
import ConversationHistory from './components/ConversationHistory';
import HintIcon from './components/HintIcon';
import HintDialog from './components/HintDialog';
import ErrorBanner from './components/ErrorBanner';

import { getApiUrl } from './env_utils';
import { MAX_SUGGESTIONS, SUGGESTIONS } from './constants';
import type { ChatMessage, GameMode, PlayerGuessResponse, PlayerQuestionResponse } from './types';

/**
* A collection of callbacks the parent component (`App`) provides to
* `PlayerGuessesGame` so it can inform the outer UI about changes in
* long-lived game state (question count, chat history, etc.).  Grouping the
* callbacks into a single object drastically reduces prop-drilling noise and
* makes the ownership boundary explicit: the parent *owns* the state, while
* the child merely signals mutations.
*/
export interface PlayerGuessesGameCallbacks {
  setStarted: React.Dispatch<React.SetStateAction<boolean>>;
  setQuestionCount: React.Dispatch<React.SetStateAction<number>>;
  setChatHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setSessionId: React.Dispatch<React.SetStateAction<string | null>>;
  setGameMessage: React.Dispatch<React.SetStateAction<string>>;
  setConfidence: React.Dispatch<React.SetStateAction<number | undefined>>;
  setVictory: React.Dispatch<React.SetStateAction<boolean | 'guess'>>;
  setShowResults: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<boolean>>;
  // Track whether the player used a hint & their final score.
  setScore?: React.Dispatch<React.SetStateAction<number | undefined>>;
  setUsedHint?: React.Dispatch<React.SetStateAction<boolean | undefined>>;
  // Invoked once the daily game is completed so the parent can update global
  // completion flags.
  onGameCompleted?: () => void;
}

export interface PlayerGuessesGameProps {
  gameMode: GameMode;
  /** The current “started” flag and other *read-only* pieces of game state. */
  started: boolean;
  loading: boolean;
  questionCount: number;
  maxQuestions: number;
  chatHistory: ChatMessage[];
  sessionId: string | null;
  /** Whether the user has already finished today’s round. */
  gameCompletedToday?: boolean;

  /**
   * Optional JWT token. If present, authenticated endpoints will be called –
   * otherwise the component falls back to unauthenticated routes so it can be
   * exercised in Storybook / tests without a backend.
   */
  token?: string | null;

  /**
   * A bag of setters / event callbacks supplied by the parent.  See
   * `PlayerGuessesGameCallbacks` above.
   */
  callbacks: PlayerGuessesGameCallbacks;
}

/** Utility: mutate array in-place to randomise order. */
function shuffleStrings(arr: string[]) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
* A "20 Questions" style mini-game where the *player* asks yes/no questions to
* guess the secret game the AI is thinking of.
*/
function PlayerGuessesGame({
  gameMode,
  started,
  loading,
  questionCount,
  maxQuestions,
  chatHistory,
  sessionId,
  token,
  gameCompletedToday = false,
  callbacks,
}: PlayerGuessesGameProps) {
  // --- Local, UI-only state -------------------------------------------------
  const [playerGuessInput, setPlayerGuessInput] = useState('');
  const [suggestions, setSuggestions] = useState(
    shuffleStrings(SUGGESTIONS).slice(0, MAX_SUGGESTIONS),
  );
  const [isHintDialogOpen, setIsHintDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Quickly pluck callbacks so we don’t have to prefix every usage with
  // `callbacks.`
  const {
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
    onGameCompleted,
  } = callbacks;

  // -----------------------------------------------------------------------
  // Helper functions
  // -----------------------------------------------------------------------

  /** Kick off a fresh session (POST /player-guesses/start). */
  const startGame = async () => {
    // Reset backend-tracked error state so the banner hides immediately.
    setErrorMessage(null);
    setError(false);
    setLoading(true);

    try {
      const res = await fetch(`${getApiUrl()}/player-guesses/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || 'Failed to start game on backend');
      }

      const { sessionId: newSessionId } = await res.json();

      // Only *now* that the backend succeeded do we reset hint/score.
      setScore?.(undefined);
      setUsedHint?.(undefined);

      // And mark the game as started.
      setStarted(true);
      setQuestionCount(0);
      setChatHistory([]);
      setSessionId(newSessionId);
      setGameMessage("I'm thinking of a game. Ask me a yes/no question, or try to guess the game!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Error starting the game: ${message}`);
      setError(true);
      // Ensure users can attempt again.
      setStarted(false);
    } finally {
      setLoading(false);
    }
  };

  /** Submit a yes/no *question* **or** a direct *guess* to the backend. */
  const handlePlayerQuestion = async () => {
    if (!playerGuessInput || !sessionId) return;

    setErrorMessage(null);
    setLoading(true);

    // Optimistically append the player's message to the feed.
    setChatHistory((prev) => [
      ...prev,
      { role: 'user', parts: [{ text: playerGuessInput }] },
    ]);

    try {
      const res = await fetch(`${getApiUrl()}/player-guesses/question`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ sessionId, userInput: playerGuessInput }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || 'Failed to get AI response from backend');
      }

      const data = await res.json();
      const { type, content, questionCount: newCount } = data;

      // Keep parent in-sync.
      setQuestionCount(newCount);

      // Extract confidence if present (answer payload variant).
      if (content && typeof content === 'object') {
        setConfidence((content as PlayerQuestionResponse).confidence);
      }

      if (type === 'question' || type === 'answer') {
        // Normal answer flow.
        const answerText = typeof content === 'string'
          ? content
          : (content as PlayerQuestionResponse).answer + ((content as PlayerQuestionResponse).clarification ? ` - ${(content as PlayerQuestionResponse).clarification}` : '');

        setChatHistory((prev) => [
          ...prev,
          { role: 'model', parts: [{ text: answerText }] },
        ]);

        // Repopulate suggestion chips with questions the player *has not* asked yet.
        const asked = chatHistory.filter((m) => m.role === 'user').map((m) => m.parts[0].text);
        const notAsked = SUGGESTIONS.filter((q) => !asked.includes(q));
        setSuggestions(shuffleStrings(notAsked).slice(0, MAX_SUGGESTIONS));

        if (newCount >= maxQuestions) {
          endGame(`You're out of questions! The game was ${answerText}.`, false);
        }
      } else if (type === 'guessResult') {
        // The player made a final GUESS.
        const { correct, response, score, usedHint } = content as PlayerGuessResponse;

        // Propagate meta info upward so the Results dialog can show extras.
        setScore?.(score);
        setUsedHint?.(!!usedHint);

        if (correct) {
          endGame(`${response} (${score} pts)${usedHint ? ' - Hint used' : ''}`, true);
        } else {
          setGameMessage(response);
          setChatHistory((prev) => [...prev, { role: 'model', parts: [{ text: response }] }]);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);

      if (message === 'Session not found.') {
        // Edge-case: backend forgot the session.  Surface banner then auto-retry.
        setErrorMessage('Your game session expired. Starting a new game...');
        setError(true);
        setSessionId(null);
        setTimeout(() => {
          setError(false);
          setErrorMessage(null);
          startGame();
        }, 2000);
      } else {
        setErrorMessage(`Error processing your question: ${message}`);
        setError(true);
      }
    } finally {
      setPlayerGuessInput('');
      setLoading(false);
    }
  };

  /** Transition to the post-game state and surface the results dialog. */
  const endGame = (finalMessage: string, didWin: boolean) => {
    setStarted(false);
    setLoading(false);
    setVictory(didWin);
    setGameMessage(finalMessage);

    // Tell the parent we finished so it can mark the daily completion flag.
    onGameCompleted?.();

    // Pop the results modal after a short celebratory delay.
    setTimeout(() => setShowResults(true), 1500);
  };

  // -----------------------------------------------------------------------
  // JSX
  // -----------------------------------------------------------------------

  return (
    <div id="player-guesses-game">
      {/* Hint modal -------------------------------------------------------- */}
      <HintDialog
        isOpen={isHintDialogOpen}
        onClose={() => setIsHintDialogOpen(false)}
        sessionId={sessionId}
        token={token}
      />

      {/* Error banner ------------------------------------------------------ */}
      {errorMessage && (
        <ErrorBanner
          message={errorMessage}
          onClose={() => setErrorMessage(null)}
        />
      )}

      {/* Conversation feed -------------------------------------------------- */}
      <ConversationHistory
        chatHistory={chatHistory}
        gameMode={gameMode}
        loading={loading}
      />

      {/* Question counter --------------------------------------------------- */}
      {started && !loading && !gameCompletedToday && (
        <div
          id="player-question-count"
          className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4"
        >
          Questions left: {maxQuestions - questionCount}/{maxQuestions}
        </div>
      )}

      {/* Input + suggestion chips ------------------------------------------ */}
      {started && !loading && !gameCompletedToday && (
        <>
          <div className="mb-6">
            <label htmlFor="player-guess-input" className="sr-only">
              Enter question or guess
            </label>
            <input
              id="player-guess-input"
              type="text"
              placeholder="e.g., Is the game a first-person shooter?"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
              value={playerGuessInput}
              onChange={(e) => setPlayerGuessInput(e.target.value)}
              onKeyUp={(e) => {
                if (e.key === 'Enter') handlePlayerQuestion();
              }}
            />
          </div>

          <SuggestionChips
            suggestions={suggestions}
            onSelectSuggestion={(q) => {
              setPlayerGuessInput(q);
              setSuggestions(suggestions.filter((s) => s !== q));
            }}
          />

          <div className="flex justify-center gap-6 mt-4">
            <button
              id="btn-submit-guess"
              type="button"
              className="cursor-pointer px-8 py-4 bg-blue-600 text-white font-bold text-xl rounded-lg shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition duration-200 transform hover:scale-105"
              onClick={handlePlayerQuestion}
            >
              Submit
            </button>
            <HintIcon onClick={() => setIsHintDialogOpen(true)} />
          </div>
        </>
      )}

      {/* Pregame state ------------------------------------------------------ */}
      {!started && !loading && !gameCompletedToday && (
        <button
          type="button"
          className="cursor-pointer px-8 py-4 bg-green-600 text-white font-bold text-xl rounded-lg shadow-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75 transition duration-200 transform hover:scale-105"
          onClick={startGame}
        >
          Start Game
        </button>
      )}
    </div>
  );
}

export default PlayerGuessesGame;
