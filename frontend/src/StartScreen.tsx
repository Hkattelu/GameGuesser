import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router';

import SettingsButton from './components/SettingsButton';
import LoadingIndicator from './components/LoadingIndicator';

import { AI_NAME } from './constants';
import { wrapNavigate } from './utils/transition-utils';
import './styles/startScreen.css';
import { getApiUrl } from './env_utils';
import { isGameCompleted } from './utils/gameCompletion';

import { useAuth } from './AuthContext';
import { auth } from './firebase';

/**
 * The StartScreen is shown when a user first visits `/`.
 *
 * 1. If the user is **not** authenticated, the `AuthPage` component is rendered.
 * 2. Once authenticated, the user can choose one of the two available games.
 *
 * Selecting a game triggers a short fade/scale transition defined in
 * `startScreen.css` before navigating to the corresponding protected route
 * handled by the router.
 */
function StartScreen() {
  const { currentUser } = useAuth();
  const mouseWatchArea = useRef(null);
  const leftEye = useRef(null);
  const rightEye = useRef(null);
  const [aiGuessesCompletedToday, setAIGuessesCompletedToday] = useState<boolean>(false);
  const [playerGuessesCompletedToday, setPlayerGuessesCompletedToday] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [transitionDirection, setTransitionDirection] = useState<'left' | 'right' | null>(null);

  const navigate = wrapNavigate(useNavigate());

  const handleLogout = async () => {
    try {
      await auth.signOut();
      // No need to navigate here, AuthWrapper will handle it
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

  const handleSelectGame = (path: '/ai-guesses' | '/player-guesses') => {
    const direction = path === '/ai-guesses' ? 'left' : 'right';
    setTransitionDirection(direction);
    navigate(path, direction);
  };

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    const maxQuestions = 20;
    const fetchCompletion = async (gameType: 'ai-guesses' | 'player-guesses', setter: (b: boolean) => void) => {
      try {
        const token = await currentUser.getIdToken();
        const response = await fetch(`${getApiUrl()}/game-state?gameMode=${gameType}&date=${today}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to load game state');
        const gameState = await response.json();
        if (gameState) {
          const chatHistory = gameState.chatHistory.map((r) => ({
            role: r.role,
            parts: [{ text: r.content }],
            gameType: r.game_type,
          }));
          const completed = isGameCompleted(gameType, chatHistory, gameState.questionCount, maxQuestions);
          setter(completed);
        } else {
          setter(false);
        }
      } catch {
        setter(false);
      }
    };
    Promise.all([
      fetchCompletion('ai-guesses', setAIGuessesCompletedToday),
      fetchCompletion('player-guesses', setPlayerGuessesCompletedToday),
    ]).finally(() => setLoading(false));
  }, [currentUser]);

  useEffect(() => {
    const moveEye = (eye: HTMLElement, event: MouseEvent) => {
      if (mouseWatchArea.current) {
        const moveX = 30*(event.clientX - mouseWatchArea.current.offsetLeft)/mouseWatchArea.current.clientWidth - 20;
        const moveY = 15*(event.clientY - mouseWatchArea.current.offsetTop)/mouseWatchArea.current.clientHeight - 5;
        eye.style.transform = `translate(${moveX}px, ${moveY}px)`;
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      moveEye(leftEye.current, event);
      moveEye(rightEye.current, event);
    };

    if (mouseWatchArea.current) {
     document.addEventListener('mousemove', handleMouseMove);
    }

    // Clean up the event listener when the component unmounts or the ref changes
    return () => {
      if (mouseWatchArea.current) {
        document.removeEventListener('mousemove', handleMouseMove);
      }
    };
  });

  if (loading) {
    return <LoadingIndicator />;
  }

  const bothCompleted = aiGuessesCompletedToday && playerGuessesCompletedToday;

  return (
    <>
      <div className="absolute top-4 left-4 flex gap-2">
        <button
          onClick={handleLogout}
          className="cursor-pointer px-4 py-2 bg-white dark:bg-gray-600 dark:text-white rounded-md shadow-md hover:bg-gray-700 transition-colors"
        >
          Logout
        </button>
      </div>
      <SettingsButton />
      <div
        className={`start-screen flex flex-col items-center justify-center px-4 text-center mb-4`}
        ref={mouseWatchArea}
      >
      <div className="quiz-bot-head">
        <div className="eye ml-14" ref={leftEye}><div className="pupil"></div></div>
        <div className="eye mr-14" ref={rightEye}><div className="pupil"></div></div>
        <img src="/bot_boy/quiz-bot-head.png" alt="Quiz bot head" />
      </div>
      <div className="p-6 bg-white border-2 border-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl drop-shadow mb-6 pt-12">
        <h1 className="text-5xl sm:text-6xl font-extrabold drop-shadow mb-4">
          {AI_NAME}'s Arcade
        </h1>
        <p className="text-lg mb-8">Welcome, {currentUser?.displayName || currentUser?.email || 'Guest'}! Choose a game to play!</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-6 items-center justify-center w-full max-w-3xl">
        <div className="bg-white dark:bg-gray-800 drop-shadow border-1 border-white rounded-sm">
          <button
            type="button"
            onClick={() => handleSelectGame('/ai-guesses')}
            className="w-100 game-option-card hover-anim cursor-pointer text-gray-900 dark:text-white p-6 sm:p-8 shadow-lg transition transform w-full sm:w-1/2"
            >
            <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">{AI_NAME} guesses</h2>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Think of any video game and let {AI_NAME} try to guess it by asking you questions.
            </p>
            {aiGuessesCompletedToday && <div className="mt-2 text-red-500 font-semibold">Already played today</div>}
          </button>
        </div>
        <div className="bg-white dark:bg-gray-800 drop-shadow border-1 border-white rounded-sm">
          <button
            type="button"
            onClick={() => handleSelectGame('/player-guesses')}
            className="game-option-card hover-anim cursor-pointer bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-6 sm:p-8 shadow-lg transition transform w-full sm:w-1/2"
            >
            <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">You guess</h2>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              {AI_NAME} is thinking of a game — can you figure it out within twenty questions?
            </p>
            {playerGuessesCompletedToday && <div className="mt-2 text-red-500 font-semibold">Already played today</div>}
          </button>
        </div>
      </div>
      {bothCompleted && <div className="mt-8 text-lg text-gray-500 dark:text-gray-300 font-semibold">You have played both games today. Come back tomorrow!</div>}
      </div>
    </>
  );
}

export default StartScreen;
