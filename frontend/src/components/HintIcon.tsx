import React from 'react';

interface HintIconProps {
  onClick: () => void;
}

const HintIcon: React.FC<HintIconProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      aria-label="Get a hint"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9.663 17.333A6 6 0 013.663 12a6 6 0 016-5.333m0 10.666V12m0 5.333a6 6 0 006-5.333M12 6.667a6 6 0 00-6 5.333m6-5.333a6 6 0 016 5.333m-6-5.333V3.333m0 3.334a6 6 0 01-6 5.333m6-5.333a6 6 0 006 5.333"
        />
      </svg>
    </button>
  );
};

export default HintIcon;
