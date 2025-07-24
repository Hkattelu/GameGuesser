import React from 'react';

interface ErrorBannerProps {
  /**
   * The human-readable error message to display to the user.
   */
  message: string;
  /**
   * Optional click handler invoked when the user presses the Retry button.
   */
  onRetry?: () => void;
}

/**
* A lightweight, reusable banner for surfacing recoverable errors to the user.
*
* The banner is visually distinct from normal game messages and includes an
* optional *Retry* button so users can quickly attempt the failed action
* again without reloading the entire page.
*/
function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      data-testid="error-banner"
      className="flex items-center justify-between bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4"
    >
      <span className="flex-1 pr-4">{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="ml-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-1 px-3 rounded"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export default ErrorBanner;
