import React from 'react';

type HintDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  hints: {
    genre: string;
    platform: string;
    releaseYear: string;
    publisher: string;
    developer: string;
  };
  onHintClick: (hint: string) => void;
};

const HintDialog: React.FC<HintDialogProps> = ({
  isOpen,
  onClose,
  hints,
  onHintClick,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg">
        <h2 className="text-2xl font-bold mb-4">Need a hint?</h2>
        <p className="mb-4">
          Reveal your hints below, you get access to a hint after every 4
          questions. Using a hint will count as asking one question.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => onHintClick(hints.genre)}
            className="bg-gray-200 hover:bg-gray-300 text-black font-bold py-2 px-4 rounded"
          >
            Genre
          </button>
          <button
            onClick={() => onHintClick(hints.platform)}
            className="bg-gray-200 hover:bg-gray-300 text-black font-bold py-2 px-4 rounded"
          >
            Platform
          </button>
          <button
            onClick={() => onHintClick(hints.releaseYear)}
            className="bg-gray-200 hover:bg-gray-300 text-black font-bold py-2 px-4 rounded"
          >
            Release Year
          </button>
          <button
            onClick={() => onHintClick(hints.publisher)}
            className="bg-gray-200 hover:bg-gray-300 text-black font-bold py-2 px-4 rounded"
          >
            Publisher
          </button>
          <button
            onClick={() => onHintClick(hints.developer)}
            className="bg-gray-200 hover:bg-gray-300 text-black font-bold py-2 px-4 rounded"
          >
            Developer
          </button>
        </div>
        <button
          onClick={onClose}
          className="mt-4 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default HintDialog;
