import ResponseButtons from './components/ResponseButtons';
import ConversationHistory from './components/ConversationHistory';
import { ChatMessage, GameMode } from './types';
import { getApiUrl } from './env_utils';

export interface AIGuessesGameProps {
  gameMode: GameMode;
  preGame: boolean;
  started: boolean;
  loading: boolean;
  questionCount: number;
  maxQuestions: number;
  chatHistory: ChatMessage[];
  highlightedResponse: string | null;
  sessionId: string | null;
  setPreGame: React.Dispatch<React.SetStateAction<boolean>>;
  setStarted: React.Dispatch<React.SetStateAction<boolean>>;
  setQuestionCount: React.Dispatch<React.SetStateAction<number>>;
  setChatHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setHighlightedResponse: React.Dispatch<React.SetStateAction<string | null>>;
  setSessionId: React.Dispatch<React.SetStateAction<string | null>>;
  setGameMessage: React.Dispatch<React.SetStateAction<string>>;
  setAiQuestion: React.Dispatch<React.SetStateAction<string>>;
  setVictory: React.Dispatch<React.SetStateAction<boolean | 'guess'>>;
  // Optional JWT token for authenticated API requests
  token?: string | null;
}

function AIGuessesGame({
  gameMode,
  preGame,
  started,
  loading,
  questionCount,
  maxQuestions,
  chatHistory,
  highlightedResponse,
  sessionId,
  token,
  setPreGame,
  setStarted,
  setQuestionCount,
  setChatHistory,
  setLoading,
  setHighlightedResponse,
  setSessionId,
  setGameMessage,
  setAiQuestion,
  setVictory,
}: AIGuessesGameProps) {

  const startGameAI = async () => {
    setPreGame(false);
    setStarted(true);
    setQuestionCount(0);
    setChatHistory([]);
    setLoading(true);
    setGameMessage("Okay, let's begin! I'll ask my first question.");
    setHighlightedResponse(null);

    try {
      const response = await fetch(`${getApiUrl()}/ai-guesses/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start AI game on backend.');
      }

      const data = await response.json();
      const { sessionId: newSessionId, aiResponse, questionCount: newQuestionCount } = data;

      setSessionId(newSessionId);
      setQuestionCount(newQuestionCount);
      setAiQuestion(`(${newQuestionCount}/${maxQuestions}) ${aiResponse.content}`);
      setGameMessage("Your turn to answer!");

      // Update client-side chat history for display
      setChatHistory((prevHistory) => [
        ...prevHistory,
        { role: "user", parts: [{ text: "AI Game Started." }] },
        { role: "model", parts: [{ text: JSON.stringify(aiResponse) }] },
      ]);

    } catch (error: unknown) {
      const err = error as Error;
      setAiQuestion('Error: Could not start AI game. Check backend and network.');
      setGameMessage(`Please try again. Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = async (answer: string) => {
    if (!started || !sessionId) return;

    setLoading(true);
    setHighlightedResponse(null);
    setGameMessage(`You answered "${answer}". Thinking...`);
    setChatHistory((prevHistory) => [
      ...prevHistory,
      { role: "user", parts: [{ text: `User answered: ${answer}` }] },
    ]);

    try {
      const response = await fetch(`${getApiUrl()}/ai-guesses/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ sessionId: sessionId, userAnswer: answer }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get AI response from backend.');
      }

      const data = await response.json();
      const { aiResponse, questionCount: newQuestionCount } = data;

      setQuestionCount(newQuestionCount);
      setChatHistory((prevHistory) => [
        ...prevHistory,
        { role: "model", parts: [{ text: JSON.stringify(aiResponse) }] },
      ]);

      if (aiResponse.type === "question") {
        if (newQuestionCount > maxQuestions) {
          endGame("I couldn't guess your game in 20 questions! You win!", false);
          return;
        }
        setAiQuestion(`(${newQuestionCount}/${maxQuestions}) ${aiResponse.content}`);
        setGameMessage("Your turn to answer!");
      } else if (aiResponse.type === "guess") {
        endGame(`My guess is: ${aiResponse.content}. Am I right?`, 'guess');
      } else {
        setAiQuestion("Error: Unexpected response type from Bot Boy.");
        setGameMessage("Please try again.");
      }
    } catch (error: unknown) {
      const err = error as Error;
      setAiQuestion('Bot Boy encountered an error. Please try again.');
      setGameMessage(`Error communicating with Bot Boy: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const endGame = (finalMessage: string, victoryStatus: boolean | 'guess') => {
    setStarted(false);
    setLoading(false);
    setHighlightedResponse(victoryStatus === 'guess' ? 'guess' : null); // Set highlight for guess, clear otherwise
    setAiQuestion(finalMessage);
    setVictory(victoryStatus);
  };

  return (
    <div id="ai-guesses-game">
      {/* Conversation History */}
      <ConversationHistory chatHistory={chatHistory} gameMode={gameMode} loading={loading} />

      {/* AI's Question Display */}
      {started && (
        <div id="question-display">
          <p className="text-xl font-semibold text-gray-800 mb-4">AI's Question:</p>
          <p id="ai-question" className="text-2xl font-bold text-blue-700 bg-blue-50 p-4 rounded-lg shadow-inner mb-6"></p>
        </div>
      )}

      {/* User Response Buttons */}
      {started && !loading && (
        <ResponseButtons onAnswer={handleAnswer} highlightedResponse={highlightedResponse} />
      )}

      {/* Start Game Button */}
      {!started && (
        <button
          id="btn-start-game"
          className="mt-8 px-8 py-4 bg-blue-600 text-white font-bold text-xl rounded-lg shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition duration-200 transform hover:scale-105"
          onClick={startGameAI}
        >
          Start Game
        </button>
      )}
    </div>
  );
}

export default AIGuessesGame;
