import { useState } from 'react';
import { useNavigate } from 'react-router';

import AuthPage from './AuthPage';

import {AI_NAME} from './constants';
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

  const [isTransitioning, setIsTransitioning] = useState(false);

  const navigate = useNavigate();

  const handleAuth = ({ token: newToken, username: newUsername }: AuthPayload) => {
    setToken(newToken);
    setUsername(newUsername);
  };

  const handleSelectGame = (path: '/ai-guesses' | '/player-guesses') => {
    setIsTransitioning(true);

    // Wait for the CSS transition to finish (matches 500 ms defined in CSS)
    setTimeout(() => {
      navigate(path);
    }, 500);
  };

  if (!token) {
    return <AuthPage onAuth={handleAuth} />;
  }

  return (
    <div
      className={`start-screen flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-200 to-indigo-400 px-4 text-center ${
        isTransitioning ? 'start-screen--transitioning' : ''
      }`}
    >
      <h1 className="text-5xl sm:text-6xl font-extrabold text-white drop-shadow mb-4">
        {AI_NAME} 9000's Arcade
      </h1>

      <p className="text-white text-lg mb-8">Welcome, {username}! Choose a game mode:</p>

      <div className="flex flex-col sm:flex-row gap-6 items-center justify-center w-full max-w-3xl">
        <button
          type="button"
          onClick={() => handleSelectGame('/ai-guesses')}
          className="game-option-card cursor-pointer bg-white rounded-xl p-6 sm:p-8 shadow-lg hover:scale-105 active:scale-100 transition transform w-full sm:w-1/2"
        >
          <h2 className="text-2xl font-bold mb-2 text-gray-800">{AI_NAME} guesses</h2>
          <p className="text-gray-600 text-sm">
            Think of any video game and let {AI_NAME} try to guess it by asking you questions.
          </p>
        </button>

        <button
          type="button"
          onClick={() => handleSelectGame('/player-guesses')}
          className="game-option-card cursor-pointer bg-white rounded-xl p-6 sm:p-8 shadow-lg hover:scale-105 active:scale-100 transition transform w-full sm:w-1/2"
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
