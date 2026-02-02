import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router';

import { AuthProvider } from './AuthContext';
import App from './App';
import AuthWrapper from './AuthWrapper';
import ProtectedRoute from './ProtectedRoute';
import AIGuessesGame from './AIGuessesGame';
import PlayerGuessesGame from './PlayerGuessesGame';

import './index.css';

import { setupGlobalUnauthorizedInterceptor } from './utils/fetchInterceptor';
import AudioButton from './components/AudioButton';

setupGlobalUnauthorizedInterceptor();

function updateSeoUrls(): void {
  const { origin, pathname, search } = window.location;
  const url = new URL(pathname + search, origin).toString();

  const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (canonical) {
    canonical.setAttribute('href', url);
  } else {
    const link = document.createElement('link');
    link.rel = 'canonical';
    link.href = url;
    document.head.appendChild(link);
  }

  const ogUrl = document.querySelector<HTMLMetaElement>('meta[property="og:url"]');
  if (ogUrl) {
    ogUrl.setAttribute('content', url);
  } else {
    const meta = document.createElement('meta');
    meta.setAttribute('property', 'og:url');
    meta.setAttribute('content', url);
    document.head.appendChild(meta);
  }
}

function SeoUpdater(): null {
  const location = useLocation();

  useEffect(() => {
    updateSeoUrls();
  }, [location.pathname, location.search]);

  return null;
}

function shouldLoadAdSense(): boolean {
  if (!import.meta.env.PROD) return false;

  const host = window.location.hostname;
  return host === 'quizbot.games' || host === 'www.quizbot.games';
}

function ensureAdSenseScriptLoaded(): void {
  if (!shouldLoadAdSense()) return;

  const existing = document.querySelector('script[src*="adsbygoogle.js"]');
  if (existing) return;

  const script = document.createElement('script');
  script.async = true;
  script.src =
    'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5108380761431058';
  script.crossOrigin = 'anonymous';
  document.head.appendChild(script);
}

updateSeoUrls();
ensureAdSenseScriptLoaded();

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <SeoUpdater />
      <AuthProvider>
        <AudioButton />
        <Routes>
          <Route path="/" element={<AuthWrapper />} />

          {/* Authenticated game routes with App as layout */}
          <Route element={<ProtectedRoute><App /></ProtectedRoute>}>
            <Route path="ai-guesses" element={<AIGuessesGame />} />
            <Route path="player-guesses" element={<PlayerGuessesGame />} />
          </Route>

          {/* Catch-all – redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

