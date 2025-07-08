import React from 'react';

function ResponseButtons({ onAnswer, highlightedResponse }) {
  const getButtonClass = (buttonType) => {
    let baseClasses = "px-6 py-3 text-white font-bold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-opacity-75 transition duration-200 transform hover:scale-105";
    if (buttonType === 'Yes') {
      baseClasses += " bg-green-600 hover:bg-green-700 focus:ring-green-500";
    } else if (buttonType === 'No') {
      baseClasses += " bg-red-600 hover:bg-red-700 focus:ring-red-500";
    } else if (buttonType === 'Unsure') {
      baseClasses += " bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-400";
    }

    if (highlightedResponse === buttonType) {
      baseClasses += ` highlight-${buttonType.toLowerCase()}`;
    }
    return baseClasses;
  };

  return (
    <div id="response-buttons" className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4 mt-3 mb-3">
      <button
        id="btn-yes"
        className={getButtonClass('Yes')}
        onClick={() => onAnswer('Yes')}
      >
        Yes
      </button>
      <button
        id="btn-no"
        className={getButtonClass('No')}
        onClick={() => onAnswer('No')}
      >
        No
      </button>
      <button
        id="btn-unsure"
        className={getButtonClass('Unsure')}
        onClick={() => onAnswer('Unsure')}
      >
        Unsure
      </button>
    </div>
  );
}

export default ResponseButtons;
