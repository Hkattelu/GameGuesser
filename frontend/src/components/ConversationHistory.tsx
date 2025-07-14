import React, { useEffect, useRef } from 'react';

import type { ChatMessage, GameMode } from '../types';
import LoadingIndicator from './LoadingIndicator';

export interface ConversationHistoryProps {
  chatHistory: ChatMessage[];
  gameMode: GameMode;
  /**
   * Indicates an in-flight request for conversation history or a follow-up
   * message. When true, the component hides the log and shows a loading
   * spinner instead so users get immediate feedback.
   *
   * The prop is optional so existing callers who don’t yet track a loading
   * flag continue to work without modification.
   */
  loading?: boolean;
}

const AI_NAME = 'Quiz Bot';

/**
* Displays the running conversation between the user and the AI. The list
* uses alternating row backgrounds and subtle hover highlights to improve
* scan-ability and add a bit of visual flair without hurting performance.
*
* The component auto-scrolls to the newest message on update.
*/
function ConversationHistory({ chatHistory, gameMode, loading = false }: ConversationHistoryProps) {
  const historyEndRef = useRef<HTMLDivElement | null>(null);

  // Scroll to the most-recent entry whenever the list changes.
  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, loading]);

  // When a fetch is in progress we show the spinner in place of content.
  if (loading) {
    return (
      <div
        id={gameMode === 'ai-guesses' ? 'conversation-history' : 'conversation-history-player'}
        className="flex items-center justify-center h-60 bg-gray-50 rounded-lg border border-gray-200"
      >
        <LoadingIndicator />
      </div>
    );
  }

  return (
    <div
      id={gameMode === 'ai-guesses' ? 'conversation-history' : 'conversation-history-player'}
      className="text-left mb-6 p-4 bg-white border border-gray-200 rounded-lg shadow-sm max-h-72 md:max-h-96 overflow-y-auto"
    >
      <ul className="space-y-2">
        {chatHistory.map((entry, index) => {
          let textContent = '';

          if (entry.role === 'user') {
            textContent = `You: ${entry.parts[0].text}`;
          } else if (entry.role === 'model') {
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
            <li
              /* eslint-disable-next-line react/no-array-index-key */
              key={index}
              className={
                // Tailwind `odd:` and `even:` variants create alternating rows.
                'odd:bg-gray-50 even:bg-white rounded-md p-2 hover:bg-gray-100 transition-colors duration-150 ' +
                (entry.role === 'user' ? 'text-blue-800 font-semibold' : 'text-green-800')
              }
            >
              {textContent}
            </li>
          );
        })}
        {/* Dummy div so we can scrollIntoView for new messages */}
        <div ref={historyEndRef} />
      </ul>
    </div>
  );
}

export default ConversationHistory;
