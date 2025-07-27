import React from 'react';
import { GameMode } from '../types';

interface RulesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  gameMode: GameMode;
}

const RulesDialog: React.FC<RulesDialogProps> = ({ isOpen, onClose, gameMode }) => {
  if (!isOpen) return null;

  const aiGuessesRules = [
    "I'm thinking of a video game, and you'll try to guess it.",
    "I will ask you up to 20 yes/no questions.",
    "You can respond with 'Yes', 'No', or 'Unsure', but no cheating!",
    "I'll try to guess the game before I run out of questions!",
  ];

  const playerGuessesRules = [
    "You're thinking of a video game, and I'll try to guess it.",
    "You can ask me up to 20 yes/no questions.",
    "I will respond with 'Yes', 'No', or 'Unsure'",
    "Using a hint will cost you half a point!",
    "Try to guess my game before you run out of questions!",
  ];

  const rules = gameMode === 'ai-guesses' ? aiGuessesRules : playerGuessesRules;
  const title = gameMode === 'ai-guesses' ? "Rules: AI Guesses Your Game" : "Rules: You Guess My Game";

  return (
    <div className="fixed inset-0 bg-gray-600/50 overflow-y-auto h-full w-full z-50 flex justify-center items-center" onClick={onClose}>
      <div className="relative p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">{title}</h3>
        <ul className="list-disc list-inside text-left text-gray-700 dark:text-gray-200 mb-6">
          {rules.map((rule, index) => (
            <li key={index} className="mb-2">{rule}</li>
          ))}
        </ul>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="cursor-pointer px-4 py-2 bg-blue-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            Got It!
          </button>
        </div>
      </div>
    </div>
  );
};

export default RulesDialog;
