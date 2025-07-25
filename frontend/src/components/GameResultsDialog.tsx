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
  score?: number;
  usedHint?: boolean;
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
  score,
  usedHint,
}) => {
  const [copySuccess, setCopySuccess] = useState(false);

  if (!isOpen) return null;

  const getResultSummary = () => {
    const totalQuestions = chatHistory.filter(msg => msg.role === 'user' && 
      !msg.parts[0]?.text.includes('Game Started') && 
      !msg.parts[0]?.text.includes('answered:')).length;

    const gameType = gameMode === 'player-guesses' ? 'Player Guesses' : 'Quiz Bot Guesses';
    const resultText = victory === true ? 'Won' : victory === 'guess' ? 'Quiz Bot Guessed' : 'Lost';
    
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
    
    let scoreText = '';
    if (gameMode === 'player-guesses' && victory && typeof score === 'number') {
      scoreText = `\nScore: ${score === 1 ? '1.0' : score.toFixed(1)} point${score !== 1 ? 's' : ''}`;
      if (usedHint) {
        scoreText += ' (💡 Hint used)';
      }
    } else if (gameMode === 'player-guesses' && usedHint) {
      scoreText = '\n💡 Hint used';
    }
    
    const shareText = `🎮 Quiz Bot's Arcade - ${date}

Mode: ${gameType}
Result: ${resultText} (${totalQuestions}/${maxQuestions} questions)${scoreText}

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
    <div className="fixed inset-0 bg-gray-600/60 overflow-y-auto h-full w-full z-50 flex justify-center items-center" onClick={onClose}>
      <div className="relative p-6 border w-full max-w-md shadow-lg rounded-md bg-white mx-4 dark:bg-gray-800" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-bold text-gray-800 dark:text-white">Game Results</h3>
          <button
            onClick={onClose}
            className="cursor-pointer text-gray-400 hover:text-gray-600 text-xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="text-center mb-6">
          <div className="text-lg font-semibold mb-2">
            {gameType} - {resultText}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-200 mb-4">
            {totalQuestions}/{maxQuestions} questions used
            {gameMode === 'player-guesses' && victory && typeof score === 'number' && (
              <div className="mt-1">
                Score: {score === 1 ? '1.0' : score.toFixed(1)} point{score !== 1 ? 's' : ''}
                {usedHint && <span className="text-orange-600 dark:text-orange-400"> (💡 Hint used)</span>}
              </div>
            )}
            {gameMode === 'player-guesses' && usedHint && !victory && (
              <div className="mt-1 text-orange-600 dark:text-orange-400">
                💡 Hint used
              </div>
            )}
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
            className="cursor-pointer w-full px-4 py-2 bg-blue-500 text-white font-medium rounded-md shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-colors"
          >
            {copySuccess ? '✓ Copied!' : 'Share Results'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameResultsDialog;
