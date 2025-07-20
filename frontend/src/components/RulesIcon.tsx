import React, { useState } from 'react';
import { FaQuestionCircle } from 'react-icons/fa'; // Assuming react-icons is installed
import RulesDialog from './RulesDialog';
import { GameMode } from '../types';

interface RulesIconProps {
  gameMode: GameMode;
}

const RulesIcon: React.FC<RulesIconProps> = ({ gameMode }) => {
  const [isRulesDialogOpen, setIsRulesDialogOpen] = useState(false);

  const openRulesDialog = () => setIsRulesDialogOpen(true);
  const closeRulesDialog = () => setIsRulesDialogOpen(false);

  return (
    <>
      <button
        onClick={openRulesDialog}
        className="cursor-pointer absolute top-4 left-4 text-gray-600 hover:text-blue-600 focus:outline-none"
        aria-label="Game Rules"
      >
        <FaQuestionCircle size={24} />
      </button>
      <RulesDialog
        isOpen={isRulesDialogOpen}
        onClose={closeRulesDialog}
        gameMode={gameMode}
      />
    </>
  );
};

export default RulesIcon;
