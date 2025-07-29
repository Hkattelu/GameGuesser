import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import SuggestionChips from './components/SuggestionChips';
import ConversationHistory from './components/ConversationHistory';
import { getApiUrl } from './env_utils';
import { MAX_SUGGESTIONS, SUGGESTIONS, MAX_QUESTIONS } from './constants';
import { ChatMessage, PlayerQuestionResponse, PlayerGuessResponse } from './types';
import HintIcon from './components/HintIcon';
import HintDialog from './components/HintDialog';
import ErrorBanner from './components/ErrorBanner';
import MascotImage from './components/MascotImage';
import { isGameCompleted } from './utils/gameCompletion';
import { useAuth } from './AuthContext';
import RulesIcon from './components/RulesIcon';
import RulesDialog from './components/RulesDialog';
import GameResultsDialog from './components/GameResultsDialog';
import GameHistoryCalendar from './components/GameHistoryCalendar';
import ConfettiExplosion from 'react-confetti-explosion';

/** Shuffle an array of elements randomly. */
function shuffle(arr: string[]) {
  const sortedArr = structuredClone(arr);
  for (let i = sortedArr.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [sortedArr[i], sortedArr[j]] = [sortedArr[j], sortedArr[i]];
  }
  return sortedArr;
}

const DEFAULT_MESSAGE = "I'm thinking of a game. Ask me a yes/no question, or try to guess the game!";

function PlayerGuessesGame() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [playerGuessInput, setPlayerGuessInput] = useState('');
  const [modelResponseText, setModelResponseText] = useState('');
  const [suggestions, setSuggestions] = useState(shuffle([...SUGGESTIONS]).slice(0, MAX_SUGGESTIONS));
  const [isHintDialogOpen, setIsHintDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [started, setStarted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [questionCount, setQuestionCount] = useState<number>(0);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [gameMessage, setGameMessage] = useState<string>(DEFAULT_MESSAGE);
  const [victory, setVictory] = useState<boolean | 'guess'>(false);
  const [error, setError] = useState<boolean>(false);
  const [showResults, setShowResults] = useState<boolean>(false);
  const [confidence, setConfidence] = useState<number | undefined>(undefined);
  const [playerGuessesCompletedToday, setPlayerGuessesCompletedToday] = useState<boolean>(false);
  const [score, setScore] = useState<number | undefined>(undefined);
  const [usedHint, setUsedHint] = useState<boolean | undefined>(undefined);
  const [firebaseToken, setFirebaseToken] = useState<string | null>(null);
  const [rawgGameDetails, setRawgGameDetails] = useState<any>(null);
  const [maxQuestions] = useState<number>(MAX_QUESTIONS);
  const [isRulesDialogOpen, setIsRulesDialogOpen] = useState(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);

  const openRulesDialog = () => setIsRulesDialogOpen(true);
  const closeRulesDialog = () => setIsRulesDialogOpen(false);
  const openHistoryDialog = () => setShowHistory(true);
  const openHintDialog = () => setIsHintDialogOpen(true);
  const closeHintDialog = () => setIsHintDialogOpen(false);

  const renderRawgDetails = () => {
    fetch(`${getApiUrl()}/game-details?sessionId=${sessionId}`, {
      headers: {
        Authorization: `Bearer ${firebaseToken}`,
      },
    })
      .then(response => response.json())
      .then(data => {
        if (data) {
          setRawgGameDetails(data);
        }
      })
      .catch(error => console.error('Error fetching RAWG details:', error));
  };

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

  // If the game is already over and we reloaded, just the rawgDetails again
  useEffect(() => {
    if (!rawgGameDetails && playerGuessesCompletedToday) {
      renderRawgDetails();
    }

  }, [playerGuessesCompletedToday, rawgGameDetails]);

  useEffect(() => {
    if (!currentUser) {
      setChatHistory([]);
      setSessionId(null);
      setQuestionCount(0);
      setStarted(false);
      setPlayerGuessesCompletedToday(false);
      return;
    }

    const fetchGameState = async () => {
      setLoading(true);
      try {
        const token = await currentUser.getIdToken();
        const response = await fetch(`${getApiUrl()}/game-state?gameMode=player-guesses&date=${new Date().toISOString().slice(0, 10)}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (response.status === 401) {
          setErrorMessage('Your login credentials are stale. Refreshing the page...');
          setTimeout(() => navigate('/'), 500);
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

          const completed = isGameCompleted('player-guesses', history, gameState.questionCount, maxQuestions);
          setPlayerGuessesCompletedToday(completed);
        } else {
          setChatHistory([]);
          setSessionId(null);
          setQuestionCount(0);
          setStarted(false);
          setPlayerGuessesCompletedToday(false);
        }
      } catch (err) {
        console.error('Error fetching game state', err);
        setChatHistory([]);
        setSessionId(null);
        setQuestionCount(0);
        setStarted(false);
        setPlayerGuessesCompletedToday(false);
      } finally {
        setLoading(false);
      }
    };

    fetchGameState();
  }, [currentUser]);

  const getMascotMood = () => {
    if (error) return 'error';
    if (loading) return 'thinking';
    if (started) {
      if (victory) return 'victory';
      else return 'sad';
    }
    return 'default';
  };

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
    setErrorMessage(null);
    setError(false);
    setLoading(true);

    try {
      const response = await fetch(`${getApiUrl()}/player-guesses/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(firebaseToken ? { Authorization: `Bearer ${firebaseToken}` } : {}),
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start game on backend.');
      }

      const data = await response.json();

      // Only clear previous score/hint once a new session is successfully established.
      if (setScore) setScore(undefined);
      if (setUsedHint) setUsedHint(undefined);

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
    setChatHistory((prevHistory) => [
      ...prevHistory,
      { role: "user", parts: [{ text: playerGuessInput }] },
    ]);

    try {
      const response = await fetch(`${getApiUrl()}/player-guesses/question`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(firebaseToken ? { Authorization: `Bearer ${firebaseToken}` } : {}),
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
        const finalMessage = `${response} (${score} pts)${usedHint ? ' - Hint used' : ''}`;
        // Propagate score and hint usage to parent component for results dialog.
        if (setScore) setScore(score);
        if (setUsedHint) setUsedHint(!!usedHint);
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
    }
  };


  const endGame = (finalMessage: string, victoryStatus: boolean) => {
    setStarted(false);
    setLoading(false);
    setVictory(victoryStatus);
    setGameMessage(finalMessage);
    setModelResponseText('');
    setPlayerGuessesCompletedToday(true);
    renderRawgDetails();

    setTimeout(() => setShowResults(true), 1500);
  };

  const handleSelectSuggestion = (question: string) => {
    setPlayerGuessInput(question);
    setSuggestions(suggestions.filter(suggestion => suggestion !== question));
  };


  return (
    <div id="player-guesses-game">
      <RulesIcon gameMode="player-guesses" onClick={openRulesDialog} />
      <RulesDialog
        isOpen={isRulesDialogOpen}
        onClose={closeRulesDialog}
        gameMode="player-guesses"
      />
      <div className="flex justify-center items-center ml-4 mr-4">
        <MascotImage mood={getMascotMood()} confidence={confidence} error={error} loading={loading} />
        <p id="game-message" className="text-lg text-gray-600 dark:text-gray-300 mb-4">{gameMessage}</p>
      </div>
      <HintDialog
        isOpen={isHintDialogOpen}
        onClose={closeHintDialog}
        sessionId={sessionId}
        token={firebaseToken}
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

      <ConversationHistory chatHistory={chatHistory} gameMode={'player-guesses'} loading={loading} isGameCompleted={playerGuessesCompletedToday}/>

      {started && !playerGuessesCompletedToday && (
        <div id="player-question-count" className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">
          Questions left: {maxQuestions - questionCount}/{maxQuestions}
        </div>
      )}

      {started && !loading && !playerGuessesCompletedToday && (
        <div className="mb-6">
          <label htmlFor="player-guess-input" className="block text-gray-700 text-sm font-semibold mb-2" aria-hidden="true"></label>
          <input
            type="text"
            id="player-guess-input"
            placeholder="e.g., Is the game a first-person shooter? 🤔"
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

      {started && !loading && !playerGuessesCompletedToday && (
        <SuggestionChips suggestions={suggestions} onSelectSuggestion={handleSelectSuggestion} />
      )}

      {started && !loading && !playerGuessesCompletedToday && (
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

      {!started && !loading && !playerGuessesCompletedToday && (
        <button
          id="btn-start-player-game"
          className="cursor-pointer mt-2 px-8 py-4 bg-blue-600 text-white font-bold text-xl rounded-lg shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition duration-200 transform hover:scale-105"
          onClick={startGamePlayerGuesses}
        >
          Start Game
        </button>
      )}

      {rawgGameDetails && (
        
        <div className="mt-6 text-left">
          <h4 className="text-xl font-bold mb-2">Game Details from <a target="_blank" href="https://rawg.io/" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline">RAWG</a></h4>
          {rawgGameDetails.background_image && (
            <img src={rawgGameDetails.background_image} alt={rawgGameDetails.name} className="w-full h-48 object-contain rounded-md mb-4" />
          )}
          <p className="text-lg font-semibold">{rawgGameDetails.name}</p>
          {rawgGameDetails.metacritic && (
            <p className="text-sm text-gray-600 dark:text-gray-300">Metacritic: {rawgGameDetails.metacritic}</p>
          )}
          {rawgGameDetails.metacritic_url && (
            <a className="text-sm" href={rawgGameDetails.metacritic_url}>Metacritic link</a>
          )}
          {rawgGameDetails.description && (<div className="mt-2 mb-2 max-h-50 overflow-y-auto" dangerouslySetInnerHTML={{ __html: rawgGameDetails.description }}></div>)}
          {rawgGameDetails.platforms && rawgGameDetails.platforms.length > 0 && (
            <div className="mt-2">
              <p className="text-sm font-semibold">Available on:</p>
              <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-300">
                {rawgGameDetails.platforms.filter((platform: any) => platform.platform.name).map((platform: any) => (
                  <li key={platform.platform.id}>{platform.platform.name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {playerGuessesCompletedToday && (
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
          gameMode="player-guesses"
          victory={victory}
          maxQuestions={maxQuestions}
          score={score}
          usedHint={usedHint}
        />
      )}

      {showHistory && (
        <GameHistoryCalendar
          token={firebaseToken}
          gameMode="player-guesses"
          isOpen={showHistory}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  );
}

export default PlayerGuessesGame;
