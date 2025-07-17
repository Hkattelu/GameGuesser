import React from 'react';

type HintButtonProps = {
  onClick: () => void;
};

const HintButton: React.FC<HintButtonProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="absolute top-4 right-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
    >
      Hint
    </button>
  );
};

export default HintButton;
