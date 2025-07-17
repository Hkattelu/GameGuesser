import React, { useState } from 'react';
import TextDialog from './TextDialog';

const HintButton: React.FC = () => {
  const [isHintTextDialogOpen, setIsHintTextDialogOpen] = useState(false);

  const openHintTextDialog = () => setIsHintTextDialogOpen(true);
  const closeHintTextDialog = () => setIsHintTextDialogOpen(false);

  const hintContent = [
    "Hints can be revealed after every 4 questions you ask.",
    "Using a hint will count as asking one question.",
    "Hints provide specific information about the game, such as its genre, platform, or release year.",
  ];

  return (
    <>
      <button
        onClick={openHintTextDialog}
        className="absolute top-4 right-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        Hint
      </button>
      <TextDialog
        isOpen={isHintTextDialogOpen}
        onClose={closeHintTextDialog}
        title="How Hints Work"
        content={hintContent}
      />
    </>
  );
};

export default HintButton;