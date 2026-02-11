import { useState, useEffect, useRef } from 'react';
import { GoogleAuthProvider, signInWithPopup, signInAnonymously } from 'firebase/auth';
import { auth } from './firebase';
import { useAuth } from './AuthContext';
import SettingsButton from './components/SettingsButton';

function AuthPage() {
  const { currentUser: _currentUser } = useAuth();
  const mouseWatchArea = useRef(null);
  const leftEye = useRef(null);
  const rightEye = useRef(null);
  const [audioPlaying, setAudioPlaying] = useState(false);

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

  useEffect(() => {
    const audio = document.getElementsByTagName('audio')[0];
    if (!audio.paused) setAudioPlaying(true);
    audio.addEventListener('play', () => {
      setAudioPlaying(true);
    });
    audio.addEventListener('pause', () => {
      setAudioPlaying(false);
    });

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
    <>
      <SettingsButton />
      <div
        className="start-screen flex flex-col items-center justify-center px-4 text-center"
        ref={mouseWatchArea}
      >
        <div className={`${audioPlaying ? 'skew-bounce' : 'pop-anim'} quiz-bot-head`}>
          <div className="eye ml-14" ref={leftEye}><div className="pupil"></div></div>
          <div className="eye mr-14" ref={rightEye}><div className="pupil"></div></div>
          <img src="/bot_boy/quiz-bot-head.png" alt="Quiz bot head" />
        </div>
        <div className="max-w-md mx-auto z-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-8 rounded-xl flex items-center flex-col shadow-lg border-gray-200 dark:border-gray-700">
          <h2 className="text-3xl font-bold text-center mb-6">Welcome to Quiz Bot's Arcade!</h2>
          <button type="button"  onClick={handleSignIn} className="google-sign-in-button dark:border-2 dark:border-white">
            Sign in with Google
          </button>
          <button
            type="button"
            onClick={handleGuestSignIn}
            className="cursor-pointer mt-4 px-6 py-3 dark:text-white font-bold rounded-lg shadow-lg hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-75 transition duration-200 transform hover:scale-105"
          >
            Play as Guest
          </button>
        </div>
      </div>
    </>
  );
}

export default AuthPage;
