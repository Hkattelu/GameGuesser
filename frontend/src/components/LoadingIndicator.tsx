import React from 'react';

function LoadingIndicator() {
  return (
    <div id="loading-indicator" className="mt-4">
      <div className="loading-spinner"></div>
      <p className="text-gray-500 text-sm mt-2">AI is thinking...</p>
    </div>
  );
}

export default LoadingIndicator;
