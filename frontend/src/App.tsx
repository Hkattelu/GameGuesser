import { useNavigate, useLocation, Outlet } from 'react-router';
import { wrapNavigate } from './utils/transition-utils';
import { useAuth } from './AuthContext';
import SettingsButton from './components/SettingsButton';
import { auth } from './firebase'; // Import auth for signOut

function App() {
  const { currentUser } = useAuth();
  const navigate = wrapNavigate(useNavigate());
  const location = useLocation();
  const direction =  location.pathname.includes('player-guesses') ? 'left' : 'right';

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/');
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

  return (
    <>
      <SettingsButton />
      <div
        className="game-container bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 text-center text-gray-900 dark:text-white"
      >
      <div className="flex justify-between items-center mb-4">
        <button 
          onClick={() => navigate('/', direction)}
          className="cursor-pointer flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
        >
          <svg 
            className="w-5 h-5 mr-2" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M15 19l-7-7 7-7" 
            />
          </svg>
          Back to Games
        </button>
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setShowHistory(true)}
            className="cursor-pointer text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
          >
            📊 History
          </button>
          <button className="cursor-pointer text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
      <Outlet />
      </div>
      </>
  );
}

export default App;
