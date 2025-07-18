import React, { useState } from 'react';
import { ChatMessage, GameMode } from '../types';
import GameResultsGrid from './GameResultsGrid';

interface GameResultsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  chatHistory: ChatMessage[];
  gameMode: GameMode;
  victory: boolean | 'guess';
  maxQuestions: number;
  sessionId: string | null;
  username: string | null;
}

const GameResultsDialog: React.FC<GameResultsDialogProps> = ({
  isOpen,
  onClose,
  chatHistory,
  gameMode,
  victory,
  maxQuestions,
  sessionId,
  username,
}) => {
  const [copySuccess, setCopySuccess] = useState(false);

  if (!isOpen) return null;

  const getResultSummary = () => {
    const totalQuestions = chatHistory.filter(msg => msg.role === 'user' && 
      !msg.parts[0]?.text.includes('Game Started') && 
      !msg.parts[0]?.text.includes('answered:')).length;

    const gameType = gameMode === 'player-guesses' ? 'Player Guesses' : 'AI Guesses';
    const resultText = victory === true ? 'Won' : victory === 'guess' ? 'AI Guessed' : 'Lost';
    
    return {
      totalQuestions,
      gameType,
      resultText,
    };
  };

  const generateShareText = () => {
    const { totalQuestions, gameType, resultText } = getResultSummary();
    const date = new Date().toLocaleDateString();
    
    // Create a simple text representation of the grid
    const gridText = generateGridText();
    
    const shareText = `🎮 Bot Boy's Game Guessr - ${date}

Mode: ${gameType}
Result: ${resultText} (${totalQuestions}/${maxQuestions} questions)

${gridText}

Play at: ${window.location.origin}`;

    return shareText;
  };

  const generateGridText = () => {
    const results: Array<'🟢' | '🔴' | '🟡' | '🟣' | '⬜'> = [];
    let questionNumber = 1;

    for (let i = 0; i < chatHistory.length; i++) {
      const message = chatHistory[i];
      
      if (message.role === 'user') {
        const userInput = message.parts[0]?.text || '';
        
        // Skip system messages
        if (userInput.includes('Game Started') || userInput.includes('answered:')) {
          continue;
        }

        // Find the corresponding AI response
        let responseType: 'Yes' | 'No' | 'Unsure' | 'Guess' | 'Unknown' = 'Unknown';

        // Look for the next model message
        for (let j = i + 1; j < chatHistory.length; j++) {
          const nextMessage = chatHistory[j];
          if (nextMessage.role === 'model') {
            const content = nextMessage.parts[0]?.text || '';
            
            if (gameMode === 'player-guesses') {
              // For player guesses, parse the response
              if (content.includes('Yes') || content.toLowerCase().includes('yes')) {
                responseType = 'Yes';
              } else if (content.includes('No') || content.toLowerCase().includes('no')) {
                responseType = 'No';
              } else if (content.includes('Unsure') || content.includes("I don't know")) {
                responseType = 'Unsure';
              } else if (content.includes('You guessed it') || content.includes('correct')) {
                responseType = 'Guess';
              }
            } else {
              // For AI guesses, the user input is the response
              if (userInput.toLowerCase().includes('yes')) {
                responseType = 'Yes';
              } else if (userInput.toLowerCase().includes('no')) {
                responseType = 'No';
              } else if (userInput.toLowerCase().includes('unsure')) {
                responseType = 'Unsure';
              }
            }
            break;
          }
        }

        // Convert to emoji
        switch (responseType) {
          case 'Yes':
            results.push('🟢');
            break;
          case 'No':
            results.push('🔴');
            break;
          case 'Unsure':
            results.push('🟡');
            break;
          case 'Guess':
            results.push(victory ? '🟣' : '⬜');
            break;
          default:
            results.push('⬜');
        }
        
        questionNumber++;
        if (questionNumber > maxQuestions) break;
      }
    }

    // Fill remaining squares with empty ones
    while (results.length < maxQuestions) {
      results.push('⬜');
    }

    // Format as a grid (5 columns)
    let gridText = '';
    for (let i = 0; i < results.length; i += 5) {
      gridText += results.slice(i, i + 5).join('') + '\n';
    }

    return gridText.trim();
  };

  const handleShare = async () => {
    const shareText = generateShareText();
    
    try {
      await navigator.clipboard.writeText(shareText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      // Fallback: show text in a dialog
      alert('Copy this text to share:\n\n' + shareText);
    }
  };

  const { totalQuestions, gameType, resultText } = getResultSummary();

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
      <div className="relative p-6 border w-full max-w-md shadow-lg rounded-md bg-white mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-bold text-gray-800">Game Results</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="text-center mb-6">
          <div className="text-lg font-semibold mb-2">
            {gameType} - {resultText}
          </div>
          <div className="text-sm text-gray-600 mb-4">
            {totalQuestions}/{maxQuestions} questions used
          </div>
          
          <GameResultsGrid
            chatHistory={chatHistory}
            gameMode={gameMode}
            victory={victory}
            maxQuestions={maxQuestions}
          />
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleShare}
            className="w-full px-4 py-2 bg-blue-500 text-white font-medium rounded-md shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-colors"
          >
            {copySuccess ? '✓ Copied!' : 'Share Results'}
          </button>
          
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-500 text-white font-medium rounded-md shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameResultsDialog;
