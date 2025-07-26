import { useState, useEffect } from 'react';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(
    typeof localStorage !== 'undefined' ? localStorage.getItem('darkMode') === 'true' : false
  );

  // Set up dark mode on initial load
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Handle dark mode toggle
  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="relative bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg text-gray-900 dark:text-white max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <button 
          className="cursor-pointer absolute top-2 right-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white" 
          onClick={onClose}
        >
          ✖
        </button>
        <h2 className="text-xl mb-4 font-semibold">Settings</h2>
        <form className="flex justify-between items-center p-3 mb-4 border rounded-md border-gray-900 dark:border-white dark:text-white">
          <label className="toggle-label" htmlFor="dark-mode-toggle">Dark mode</label>
          <input 
            id="dark-mode-toggle"
            type="checkbox" 
            className="toggle-checkbox" 
            checked={isDarkMode}
            onChange={toggleDarkMode}
          />
          <div className="toggle-switch"></div>
        </form>
        <div>
          <h3 className="text-lg mb-2 font-medium">Credits</h3>
          <p className="text-sm">
            Made by <a href="https://hkattelu.com" target="_blank" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline">Himanshu</a><br />
            Icons by <a target="_blank" href="https://icons8.com" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline">Icons8</a><br />
            Arcade loader by <a target="_blank" href="https://css-loaders.com/arcade/" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline">Temani Afif</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default SettingsDialog;
