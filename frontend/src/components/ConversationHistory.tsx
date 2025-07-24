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

  const filteredMessages = messages.filter(message => message.role !== 'system');

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
 * The following types of JSON content are supported:
 *
 * - {"type": "question", "content": string} - renders as just the content.
 * - {"type": "guess", "content": string} - renders as "(Guess): content"
 * - {"type": "answer", "content": string} - renders as just the content.
 * - {"type": "answer", "content": {"answer": string, "clarification": string}} - renders as
 *   "answer - clarification".
 * - {"type": "guessResult", "content": {"response": string, "score": number, "usedHint": boolean}} -
 *   renders as "response (score pts)(hint)"
 *
 * If the content is not one of the above formats, it is returned unchanged.
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
    historyEndRef.current?.scrollIntoView();
  }, [chatHistory]);

  const containerClasses =
    'text-left mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg max-h-60 overflow-y-auto';

  if (loading) {
    return (
      <div
        id={gameMode === 'ai-guesses' ? 'conversation-history' : 'conversation-history-player'}
        className={`${containerClasses} flex justify-center items-center`}
      >
        <LoadingIndicator />
      </div>
    );
  }

  if (chatHistory.filter(message => message.role !== 'system').length === 0) {
    return null;
  }

  return (
    <table
      id={gameMode === 'ai-guesses' ? 'conversation-history' : 'conversation-history-player'}
      className={`${containerClasses} space-y-2 w-full`}
    >
      <thead>
        <tr>
          <th scope="col" className="border-2 border-r-1">{gameMode === 'player-guesses' ? 'You' : 'Quiz Bot'}</th>
          <th scope="col" className="border-2 border-l-1 text-right">{gameMode === 'player-guesses' ? 'Quiz Bot' : 'You'}</th>
        </tr>
      </thead>
      <tbody>
      {formatMessages(chatHistory, gameMode).map((turn, index) => {
        return (
          <tr key={index}>
            <td>{gameMode === 'player-guesses' ? formatJsonContent(turn.user) :  formatJsonContent(turn.model)}</td>
            <td className="text-right">{gameMode === 'player-guesses' ? (turn.model ? formatJsonContent(turn.model) : '-') : (turn.user ? formatJsonContent(turn.user) : '-')}</td>
          </tr>
        );
      })}
      </tbody>
      {/* Dummy element so we can scrollIntoView() smoothly. */}
      <tfoot ref={historyEndRef}></tfoot>
    </table>
  );
}

export default ConversationHistory;

