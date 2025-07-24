import React from 'react';

interface ErrorBannerProps {
  /** Concise, human-readable error message */
  message: string;
  /** Retry handler – should re-invoke the last failed request */
  onRetry: () => void;
}

/**
* A small inline banner that surfaces non-fatal errors inside a game flow.
*
* The banner is deliberately minimal – red background, rounded corners, and a
* prominent retry button – to draw attention without taking the user out of
* context. Styling is Tailwind-compatible to match the rest of the UI.
*/
export default function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className="flex items-center justify-between bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4"
      data-testid="error-banner"
    >
      <span className="mr-4 text-sm sm:text-base">{message}</span>
      <button
        type="button"
        className="cursor-pointer bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded shadow"
        onClick={onRetry}
        data-testid="retry-button"
      >
        Try Again
      </button>
    </div>
  );
}
