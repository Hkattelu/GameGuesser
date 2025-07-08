import React, { useEffect, useRef } from 'react';

function ConversationHistory({ chatHistory, gameMode }) {
  const historyEndRef = useRef(null);

  useEffect(() => {
    // Scroll to the bottom of the history whenever chatHistory changes
    historyEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  return (
    <div
      id={gameMode === 'ai-guesses' ? "conversation-history" : "conversation-history-player"}
      className="text-left mb-6 p-4 bg-gray-50 rounded-lg max-h-60 overflow-y-auto"
    >
      <p className="text-lg text-gray-600">Conversation History:</p>
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
              textContent = `Bot Boy: ${jsonContent.content}`;
            } else if (jsonContent.type === 'guess') {
              textContent = `Bot Boy (Guess): ${jsonContent.content}`;
            } else if (jsonContent.type === 'answer') {
              textContent = `Bot Boy: ${jsonContent.content}`;
            } else if (jsonContent.type === 'guessResult') {
              textContent = `Bot Boy: ${jsonContent.content.response}`;
            }
          } catch (e) {
            textContent = `Bot Boy: ${entry.parts[0].text}`;
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
