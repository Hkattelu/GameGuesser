import React from 'react';
import { ChatMessage, GameMode } from '../types';

interface GameResultsGridProps {
  chatHistory: ChatMessage[];
  gameMode: GameMode;
  victory: boolean | 'guess';
  maxQuestions: number;
}

interface GameResult {
  questionNumber: number;
  userInput: string;
  aiResponse: string;
  responseType: 'Yes' | 'No' | 'Unsure' | 'Guess' | 'Unknown';
}

const GameResultsGrid: React.FC<GameResultsGridProps> = ({
  chatHistory,
  gameMode,
  victory,
  maxQuestions,
}) => {
  const parseGameResults = (): GameResult[] => {
    const results: GameResult[] = [];
    let questionNumber = 1;

    for (let i = 0; i < chatHistory.length; i++) {
      const message = chatHistory[i];
      
      if (message.role === 'user') {
        const userInput = message.parts[0]?.text || '';
        
        // Skip system messages like "AI Game Started."
        if (userInput.includes('Game Started')) {
          continue;
        }

        // Find the corresponding AI response
        let aiResponse = '';
        let responseType: GameResult['responseType'] = 'Unknown';

        // Look for the next model message
        for (let j = i + 1; j < chatHistory.length; j++) {
          const nextMessage = chatHistory[j];
          if (nextMessage.role === 'model') {
            const content = nextMessage.parts[0]?.text || '';
            
            if (gameMode === 'player-guesses') {
              // For player guesses, parse the response
              if (content.includes('Yes') || content.toLowerCase().includes('yes')) {
                responseType = 'Yes';
                aiResponse = content;
              } else if (content.includes('No') || content.toLowerCase().includes('no')) {
                responseType = 'No';
                aiResponse = content;
              } else if (content.includes('Unsure') || content.includes("I don't know")) {
                responseType = 'Unsure';
                aiResponse = content;
              } else if (content.includes('You guessed it') || content.includes('correct')) {
                responseType = 'Guess';
                aiResponse = content;
              } else {
                aiResponse = content;
              }
            } else {
              // For AI guesses, the user input is the response
              if (userInput.toLowerCase().includes('yes')) {
                responseType = 'Yes';
              } else if (userInput.toLowerCase().includes('no')) {
                responseType = 'No';
              } else if (userInput.toLowerCase().includes('unsure')) {
                responseType = 'Unsure';
              } else {
                responseType = 'Unknown';
              }
              aiResponse = content;
            }
            break;
          }
        }

        results.push({
          questionNumber,
          userInput,
          aiResponse,
          responseType,
        });
        
        questionNumber++;
        if (questionNumber > maxQuestions) break;
      }
    }

    return results;
  };

  const getSquareColor = (responseType: GameResult['responseType']): string => {
    switch (responseType) {
      case 'Yes':
        return 'bg-green-500';
      case 'No':
        return 'bg-red-500';
      case 'Unsure':
        return 'bg-yellow-500';
      case 'Guess':
        return victory ? 'bg-purple-500' : 'bg-gray-500';
      default:
        return 'bg-gray-300';
    }
  };

  const getSquareTextColor = (responseType: GameResult['responseType']): string => {
    switch (responseType) {
      case 'Yes':
      case 'No':
      case 'Guess':
        return 'text-white';
      case 'Unsure':
        return 'text-black';
      default:
        return 'text-gray-600';
    }
  };

  const results = parseGameResults();

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="grid grid-cols-5 gap-2 mb-4">
        {Array.from({ length: maxQuestions }, (_, index) => {
          const result = results[index];
          const isEmpty = !result;
          
          return (
            <div
              key={index}
              className={`
                aspect-square flex items-center justify-center rounded-lg text-sm font-bold
                ${isEmpty ? 'bg-gray-100 text-gray-400' : getSquareColor(result.responseType)}
                ${isEmpty ? '' : getSquareTextColor(result.responseType)}
              `}
              title={result ? `Q${result.questionNumber}: ${result.userInput}` : `Question ${index + 1}`}
            >
              {result ? result.questionNumber : index + 1}
            </div>
          );
        })}
      </div>
      
      <div className="flex justify-center space-x-4 text-xs">
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span>Yes</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-red-500 rounded"></div>
          <span>No</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-yellow-500 rounded"></div>
          <span>Unsure</span>
        </div>
        {victory && (
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-purple-500 rounded"></div>
            <span>Win</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameResultsGrid;
