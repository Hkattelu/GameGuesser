import { useEffect, useRef } from 'react';
import {AI_NAME} from '../constants';
import { ChatMessage, GameMode } from '../types';

export interface ConversationHistoryProps {
  chatHistory: ChatMessage[];
  gameMode: GameMode;
}

function ConversationHistory({ chatHistory, gameMode }: ConversationHistoryProps) {
  const historyEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  return (
    <div
      id={gameMode === 'ai-guesses' ? 'conversation-history' : 'conversation-history-player'}
      className="text-left mb-6 p-4 bg-gray-50 rounded-lg max-h-60 overflow-y-auto"
    >
      {chatHistory.map((entry, index) => {
        let textContent = '';
        let className = 'mb-1';

        if (entry.role === 'user') {
          className += ' text-blue-800 font-semibold';
          textContent = `You: ${entry.parts[0].text}`;
        } else if (entry.role === 'model') {
          className += ' text-green-800';
          try {
            const jsonContent = JSON.parse(entry.parts[0].text);
            if (jsonContent.type === 'question') {
              textContent = `${AI_NAME}: ${jsonContent.content}`;
            } else if (jsonContent.type === 'guess') {
              textContent = `${AI_NAME} (Guess): ${jsonContent.content}`;
            } else if (jsonContent.type === 'answer') {
              textContent = `${AI_NAME}: ${jsonContent.content}`;
            } else if (
              jsonContent.type === 'guessResult' &&
              typeof jsonContent.content?.response === 'string'
            ) {
              textContent = `${AI_NAME}: ${jsonContent.content.response}`;
            }
          } catch {
            textContent = `${AI_NAME}: ${entry.parts[0].text}`;
          }
        }

        return (
          <p key={index} className={className}>
            {textContent}
          </p>
        );
      })}
      <div ref={historyEndRef} />
    </div>
  );
}

export default ConversationHistory;

