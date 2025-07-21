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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="relative bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg text-gray-900 dark:text-white max-w-sm w-full mx-4">
        <button 
          className="absolute top-2 right-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white" 
          onClick={onClose}
        >
          ✖
        </button>
        <h2 className="text-xl mb-4 font-semibold">Settings</h2>
        <div className="flex justify-between items-center mb-4">
          <span>Dark Mode</span>
          <input 
            type="checkbox" 
            className="ml-2" 
            checked={isDarkMode}
            onChange={toggleDarkMode}
          />
        </div>
        <div>
          <h3 className="text-lg mb-2 font-medium">Credits</h3>
          <p className="text-sm">
            Made by <a href="https://hkattelu.com" target="_blank" className="text-blue-600 hover:underline">Himanshu</a><br />
            Icons by <a target="_blank" href="https://icons8.com" className="text-blue-600 hover:underline">Icons8</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default SettingsDialog;
