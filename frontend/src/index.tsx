import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';

// Install global fetch wrapper **before** any component mounts so that all
// network requests are automatically monitored for session expiry.
import { setupSessionExpiredHandler } from './utils/sessionExpiredHandler';

setupSessionExpiredHandler();

import StartScreen from './StartScreen';
import App from './App';
import ProtectedRoute from './ProtectedRoute';

import './index.css';

function Root() {
  return (
    <React.StrictMode>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<StartScreen />} />

          {/* Game routes (protected) */}
          <Route
            path="/ai-guesses"
            element={
              <ProtectedRoute>
                <App />
              </ProtectedRoute>
            }
          />
          <Route
            path="/player-guesses"
            element={
              <ProtectedRoute>
                <App />
              </ProtectedRoute>
            }
          />

          {/* Catch-all – redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </React.StrictMode>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<Root />);
