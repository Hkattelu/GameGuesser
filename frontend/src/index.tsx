import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';

import { AuthProvider } from './AuthContext';
import App from './App';
import AuthWrapper from './AuthWrapper';
import ProtectedRoute from './ProtectedRoute';

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
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

