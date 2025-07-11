import { useState } from 'react';

import AuthPage, { AuthPageProps } from '../AuthPage';
import MascotImage from '../components/MascotImage';
import { GameMode } from '../types';

export interface StartingScreenProps extends Pick<AuthPageProps, 'onAuth'> {
  /**
   * Authentication token – `null` until the user signs-in / registers.
   * Supplied by the parent so the starting screen can switch its UI once the
   * user is authenticated.
   */
  token: string | null;
  /** Username of the authenticated user (if any). */
  username: string | null;
  /**
   * Callback fired when the player chooses which game mode to play. The parent
   * should navigate/render the selected game screen.
   */
  onSelectGame: (mode: GameMode) => void;
}

/**
* A minimal splash / lobby screen shown on application launch.
*
* 1. When the player is not authenticated it renders the existing `AuthPage`
*    (login/register).
* 2. After auth succeeds it greets the player and displays the list of
*    available game modes. Selecting a game triggers a subtle fade-out
*    animation followed by a callback so the parent component can mount the
*    chosen game.
*/
function StartingScreen({ token, username, onAuth, onSelectGame }: StartingScreenProps) {
  // A small flag used to apply a fade/slide animation before we hand control
  // over to the main game screen. Tailwind's utility classes keep this simple
  // and dependency-free.
  const [exiting, setExiting] = useState(false);

  /* --------------------------- Render: Auth stage ------------------------- */
  if (!token) {
    return (
      <div className="game-container bg-white p-8 rounded-xl shadow-lg border border-gray-200 text-center">
        <h1 className="text-4xl font-extrabold text-gray-800 mb-6">Game Boy's Game Guesser</h1>
        <AuthPage onAuth={onAuth} />
      </div>
    );
  }

  /* --------------------- Render: Game-selection stage --------------------- */
  const handleGameClick = (mode: GameMode) => {
    // Trigger CSS transition then notify parent after it completes.
    setExiting(true);
    // Match the CSS duration (300 ms) to keep UI crisp.
    setTimeout(() => onSelectGame(mode), 300);
  };

  return (
    <div
      className={`game-container bg-white p-8 rounded-xl shadow-lg border border-gray-200 text-center transition-transform duration-300 ease-out ${exiting ? '-translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Welcome, {username}!</h2>
      </div>

      <h1 className="text-4xl font-extrabold text-gray-800 mb-6">Choose Your Game</h1>

      <MascotImage imageSrc={new URL('../bot_boy/guy.png', import.meta.url)} />

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Game Boy Guesses */}
        <button
          onClick={() => handleGameClick('ai-guesses')}
          className="flex flex-col items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-6 px-4 focus:outline-none focus:ring-2 focus:ring-blue-400 transition duration-200"
        >
          <span className="text-5xl mb-3">🤖</span>
          <span className="text-lg font-semibold">Game Boy guesses</span>
        </button>

        {/* Player Guesses */}
        <button
          onClick={() => handleGameClick('player-guesses')}
          className="flex flex-col items-center justify-center bg-green-600 hover:bg-green-700 text-white rounded-lg py-6 px-4 focus:outline-none focus:ring-2 focus:ring-green-400 transition duration-200"
        >
          <span className="text-5xl mb-3">🎮</span>
          <span className="text-lg font-semibold">You guess</span>
        </button>
      </div>
    </div>
  );
}

export default StartingScreen;
