import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router';

import AuthPage from './AuthPage';

import { AI_NAME } from './constants';
import { wrapNavigate } from './transition-utils';
import './styles/startScreen.css';

interface AuthPayload {
  token: string;
  username: string;
}

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
  // Pull any previously stored credentials so page refreshes stay logged-in.
  const [token, setToken] = useState<string | null>(
    typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null,
  );
  const [username, setUsername] = useState<string | null>(
    typeof localStorage !== 'undefined' ? localStorage.getItem('username') : null,
  );
  const mouseWatchArea = useRef(null);
  const leftEye = useRef(null);
  const rightEye = useRef(null);

  const navigate = wrapNavigate(useNavigate());

  const handleAuth = ({ token: newToken, username: newUsername }: AuthPayload) => {
    setToken(newToken);
    setUsername(newUsername);
  };

  const handleSelectGame = (path: '/ai-guesses' | '/player-guesses') => {
    navigate(path);
  };

  if (!token) {
    return <AuthPage onAuth={handleAuth} />;
  }

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

  return (
    <div
      className={`start-screen flex flex-col items-center justify-center px-4 text-center`}
      ref={mouseWatchArea}
    >
      <div className="quiz-bot-head">
        <div className="eye ml-12" ref={leftEye}><div className="pupil"></div></div>
        <div className="eye mr-12" ref={rightEye}><div className="pupil"></div></div>
        <img src="/bot_boy/quiz-bot-head.png" alt="Quiz bot head" />
      </div>
      <div className="p-6 bg-white rounded-xl drop-shadow mb-6 pt-12">
        <h1 className="text-5xl sm:text-6xl font-extrabold drop-shadow mb-4">
          {AI_NAME} 9000's Arcade
        </h1>
        <p className="text-lg mb-8">Welcome, {username}! Choose a game to play!</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-6 items-center justify-center w-full max-w-3xl">
        <button
          type="button"
          onClick={() => handleSelectGame('/ai-guesses')}
          className="game-option-card hover-anim cursor-pointer bg-white p-6 sm:p-8 shadow-lg hover:scale-105 active:scale-100 transition transform w-full sm:w-1/2"
          style={{ viewTransitionName: 'ai-guesses-card' }}
        >
          <h2 className="text-2xl font-bold mb-2 text-gray-800">{AI_NAME} guesses</h2>
          <p className="text-gray-600 text-sm">
            Think of any video game and let {AI_NAME} try to guess it by asking you questions.
          </p>
        </button>

        <button
          type="button"
          onClick={() => handleSelectGame('/player-guesses')}
          className="game-option-card hover-anim cursor-pointer bg-white p-6 sm:p-8 shadow-lg hover:scale-105 active:scale-100 transition transform w-full sm:w-1/2"
          style={{ viewTransitionName: 'player-guesses-card' }}
        >
          <h2 className="text-2xl font-bold mb-2 text-gray-800">You guess</h2>
          <p className="text-gray-600 text-sm">
            {AI_NAME} is thinking of a game — can you figure it out within twenty questions?
          </p>
        </button>
      </div>
    </div>
  );
}

export default StartScreen;
