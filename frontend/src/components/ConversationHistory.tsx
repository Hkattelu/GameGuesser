import React, { useEffect, useRef } from 'react';
import { ChatMessage, GameMode } from '../types';
import LoadingIndicator from './LoadingIndicator';

export interface ConversationHistoryProps {
  chatHistory: ChatMessage[];
  gameMode: GameMode;
  /**
   * Indicates the parent component is currently fetching data that will
   * result in additional entries being appended to the chat history. While
   * true, the message list is replaced with a visual loading indicator so the
   * user understands that work is in progress.
   */
  loading: boolean;
}

const AI_NAME = 'Quiz Bot';

/**
* Renders the chronological list of chat messages exchanged between the user
* and the AI model. The component also handles two UX enhancements:
*
* 1. Automatic scroll-to-bottom behaviour whenever a new message arrives.
* 2. A built-in loading state that shows a spinner centred within the
*    container while a request is in-flight.
*/
function ConversationHistory({ chatHistory, gameMode, loading }: ConversationHistoryProps) {
  const historyEndRef = useRef<HTMLDivElement | null>(null);

  // Keep the most recent message in view when the list changes.
  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Outer wrapper keeps a fixed max height so the list becomes scrollable once
  // it overflows. `space-y-*` utilities add consistent vertical rhythm between
  // messages.
  const containerClasses =
    'text-left mb-6 p-4 bg-gray-50 rounded-lg max-h-60 overflow-y-auto';

  if (loading) {
    // While loading, centre the spinner and avoid showing stale messages so it
    // is obvious that updated content is on the way.
    return (
      <div
        id={gameMode === 'ai-guesses' ? 'conversation-history' : 'conversation-history-player'}
        className={`${containerClasses} flex justify-center items-center`}
      >
        {/* Lazy-loaded to avoid import cycles in Jest tests. */}
        <LoadingIndicator />
      </div>
    );
  }

  return (
    <div
      id={gameMode === 'ai-guesses' ? 'conversation-history' : 'conversation-history-player'}
      className={`${containerClasses} space-y-2`}
    >
      {chatHistory.map((entry, index) => {
        let textContent = '';
        // Base styling for every message bubble.
        let className =
          'inline-block px-3 py-2 rounded-lg max-w-full shadow-sm break-words';

        if (entry.role === 'user') {
          className += ' bg-blue-100 text-blue-900 font-semibold';
          textContent = `You: ${entry.parts[0].text}`;
        } else if (entry.role === 'model') {
          className += ' bg-green-100 text-green-900';

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
      {/* Dummy element so we can scrollIntoView() smoothly. */}
      <div ref={historyEndRef} />
    </div>
  );
}

export default ConversationHistory;

