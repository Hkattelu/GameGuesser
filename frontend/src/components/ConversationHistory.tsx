import { useEffect, useRef } from 'react';
import {AI_NAME} from '../constants';
import { ChatMessage, GameMode, ChatTurn } from '../types';
import LoadingIndicator from './LoadingIndicator';


export interface ConversationHistoryProps {
  chatHistory: ChatMessage[];
  gameMode: GameMode;
  loading: boolean;
}

/**
 * Given an array of ChatMessages, return them a list of length-2 arrays
 * which represent the user prompt and the model response. This also
 * filters out messages which shouldn't be shown to the user in the history,
 * such as hints, and system messages.
 *
 * @param messages The list of chat messages
 * @return The reformatted response
 */
function formatMessages(messages: ChatMessage[], gameMode: GameMode): ChatTurn[] {
  const turns: ChatTurn[] = [];

  const filteredMessages = (messages || []).filter(message => message.role !== 'system');

  if (gameMode === 'player-guesses') {
    for (let i = 0; i < filteredMessages.length; i++) {
      if (filteredMessages[i].role === 'user' && i + 1 < filteredMessages.length && filteredMessages[i + 1].role === 'model') {
        turns.push({
          user: filteredMessages[i].parts[0].text,
          model: filteredMessages[i + 1].parts[0].text,
        });
        i++;
      } else {
        turns.push({ user: filteredMessages[i].parts[0].text });
      }
    }
  } else if (gameMode === 'ai-guesses') {
    for (let i = 0; i < filteredMessages.length; i++) {
      if (filteredMessages[i].role === 'model' && i + 1 < filteredMessages.length && filteredMessages[i + 1].role === 'user') {
        turns.push({
          model: filteredMessages[i].parts[0].text,
          user: filteredMessages[i + 1].parts[0].text,
        });
        i++;
      } else {
        turns.push({ model: filteredMessages[i].parts[0].text });
      }
    }
  }
  return turns;
}

/**
 * Given a string which may or may not contain JSON content, parse it and
 * return a string which is easier to read in the conversation history.
 *
 * See backend/types.ts for more detail.
 *
 * @param maybeJsonString The string which may or may not contain JSON content.
 * @return The formatted string.
 */
function formatJsonContent(maybeJsonString: any): string {
  let jsonContent = {};

  try {
    jsonContent = JSON.parse(maybeJsonString);
  } catch {
    return maybeJsonString;
  }

  if (jsonContent.type === 'question') {
    return jsonContent.content;
  } else if (jsonContent.type === 'guess') {
    return 'Victory!'; // This only ever happens if the AI guesses the correct answer.
  } else if (jsonContent.type === 'answer') {
    if (typeof jsonContent.content === 'string') {
      return jsonContent.content;
    } else if (jsonContent.content && typeof jsonContent.content === 'object') {
      const answer = (jsonContent.content as any).answer;
      const clarification = (jsonContent.content as any).clarification as string | undefined;
      return `${answer}${clarification ? ` - ${clarification}` : ''}`;
    }
  } else if (
    jsonContent.type === 'guessResult' &&
    typeof jsonContent.content?.response === 'string'
  ) {
    const { response, score, usedHint } = jsonContent.content as any;
    let suffix = '';
    if (typeof score === 'number') {
      suffix += ` (${score} pts)`;
    }
    if (usedHint) {
      suffix += suffix ? ' (hint)' : '(hint)';
    }
    return `${response}${suffix}`;
  }
  return jsonContent.content;
}

// Renders chat history and shows a centered spinner while `loading` is true.
function ConversationHistory({ chatHistory, gameMode, loading }: ConversationHistoryProps) {
  const historyEndRef = useRef<HTMLDivElement | null>(null);

  // Keep the most recent message in view when the list changes.
  useEffect(() => {
    // Scroll to the bottom.
    historyEndRef.current?.scrollIntoView({block: 'end'});
  }, [chatHistory]);

  if (loading) {
    return (
      <div className="loader-container conversation-screen">
        <div className="arcade-loader"></div>
      </div>
    );
  }

  if (chatHistory?.filter(message => message.role !== 'system').length === 0) {
    return null;
  }

  return (
    <div
      id={gameMode === 'ai-guesses' ? 'conversation-history' : 'conversation-history-player'}
      className={'mb-6 conversation-screen w-full'}
    >
      {formatMessages(chatHistory, gameMode).map((turn, index) => {
        return (
          <>
            <div className="left-message"> 
              <div className="underline">{gameMode === 'player-guesses' ? 'You' : 'Quiz Bot'}</div>
              {gameMode === 'player-guesses' ? (turn.user ? formatJsonContent(turn.user) : (<div className="dots-loader"></div>)) : (turn.model ? formatJsonContent(turn.model) : (<div className="dots-loader"></div>))}
            </div>
            <div className="right-message">
              <div className="underline">{gameMode === 'player-guesses' ? 'Quiz Bot' : 'You'}</div>
              {gameMode === 'player-guesses' ? (turn.model ? formatJsonContent(turn.model) : (<div className="dots-loader"></div>)) : (turn.user ? formatJsonContent(turn.user) : (<div className="dots-loader"></div>))}
            </div>
          </>
        );
      })}
      {/* Dummy element so we can scrollIntoView() smoothly. */}
      <div ref={historyEndRef}></div>
    </div>
  );
}

export default ConversationHistory;

