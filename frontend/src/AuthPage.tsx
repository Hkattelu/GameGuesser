import React, { useEffect } from 'react';
import { GoogleAuthProvider, signInWithPopup, signInAnonymously } from 'firebase/auth';
import { auth } from './firebase';
import { useAuth } from './AuthContext';
import SettingsButton from './components/SettingsButton';

function AuthPage() {
  const { currentUser } = useAuth();

  const handleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error(error);
    }
  };

  const handleGuestSignIn = async () => {
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error("Error signing in anonymously:", error);
    }
  };

  return (
    <>
      <SettingsButton />
      <div className="max-w-md mx-auto bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-8 rounded-xl flex items-center flex-col shadow-lg border-gray-200 dark:border-gray-700 mt-12">
        <h2 className="text-3xl font-bold text-center mb-6">Welcome to Quiz Bot's Arcade!</h2>
        <button type="button"  onClick={handleSignIn} className="google-sign-in-button dark:border-2 dark:border-white">
          Sign in with Google
        </button>
        <button
          type="button"
          onClick={handleGuestSignIn}
          className="cursor-pointer mt-4 px-6 py-3 text-white font-bold rounded-lg shadow-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-75 transition duration-200 transform hover:scale-105"
        >
          Play as Guest
        </button>
      </div>
    </>
  );
}

export default AuthPage;
