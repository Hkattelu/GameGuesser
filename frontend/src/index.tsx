import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';

import { AuthProvider } from './AuthContext';
import App from './App';
import AuthWrapper from './AuthWrapper';
import ProtectedRoute from './ProtectedRoute';
import AIGuessesGame from './AIGuessesGame';
import PlayerGuessesGame from './PlayerGuessesGame';

import './index.css';

import { setupGlobalUnauthorizedInterceptor } from './utils/fetchInterceptor';

setupGlobalUnauthorizedInterceptor();

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
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

