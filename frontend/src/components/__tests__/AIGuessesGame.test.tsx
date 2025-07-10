import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AIGuessesGame from '../../AIGuessesGame';
import { GameMode } from '../../types';

// Mock child components
jest.mock('../../components/ResponseButtons', () => (props: any) => (
  <div data-testid="response-buttons">
    <button onClick={() => props.onAnswer('Yes')}>Yes</button>
    <button onClick={() => props.onAnswer('No')}>No</button>
  </div>
));

jest.mock('../../components/LoadingIndicator', () => () => <div data-testid="loading-indicator" />);
jest.mock('../../components/ConversationHistory', () => () => <div data-testid="conversation-history" />);

// Mock fetch
global.fetch = jest.fn();

const mockProps = {
  gameMode: 'ai-guesses' as GameMode,
  preGame: true,
  started: false,
  loading: false,
  questionCount: 0,
  maxQuestions: 20,
  chatHistory: [],
  highlightedResponse: null,
  sessionId: null,
  setPreGame: jest.fn(),
  setStarted: jest.fn(),
  setQuestionCount: jest.fn(),
  setChatHistory: jest.fn(),
  setLoading: jest.fn(),
  setHighlightedResponse: jest.fn(),
  setSessionId: jest.fn(),
  setGameMessage: jest.fn(),
  setAiQuestion: jest.fn(),
  setVictory: jest.fn(),
};

describe('AIGuessesGame', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  it('renders the start button initially', () => {
    render(<AIGuessesGame {...mockProps} />);
    expect(screen.getByText('Start Game')).toBeInTheDocument();
  });

  it('calls startGameAI and updates state on start button click', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        sessionId: 'test-session-id',
        aiResponse: { type: 'question', content: 'Is your game a strategy game?' },
        questionCount: 1,
      }),
    });

    render(<AIGuessesGame {...mockProps} />);
    fireEvent.click(screen.getByText('Start Game'));

    expect(mockProps.setPreGame).toHaveBeenCalledWith(false);
    expect(mockProps.setStarted).toHaveBeenCalledWith(true);
    expect(mockProps.setLoading).toHaveBeenCalledWith(true);

    await waitFor(() => {
      expect(mockProps.setSessionId).toHaveBeenCalledWith('test-session-id');
      expect(mockProps.setAiQuestion).toHaveBeenCalledWith('(1/20) Is your game a strategy game?');
      expect(mockProps.setLoading).toHaveBeenCalledWith(false);
    });
  });

  it('handles user answer and updates state', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        aiResponse: { type: 'question', content: 'Is it a real-time strategy game?' },
        questionCount: 2,
      }),
    });

    const props = { ...mockProps, started: true, sessionId: 'test-session-id' };
    render(<AIGuessesGame {...props} />);

    fireEvent.click(screen.getByText('Yes'));

    expect(mockProps.setLoading).toHaveBeenCalledWith(true);

    await waitFor(() => {
      expect(mockProps.setAiQuestion).toHaveBeenCalledWith('(2/20) Is it a real-time strategy game?');
      expect(mockProps.setLoading).toHaveBeenCalledWith(false);
    });
  });

  it('handles AI guess and ends the game', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        aiResponse: { type: 'guess', content: 'Starcraft' },
        questionCount: 3,
      }),
    });

    const props = { ...mockProps, started: true, sessionId: 'test-session-id' };
    render(<AIGuessesGame {...props} />);

    fireEvent.click(screen.getByText('Yes'));

    await waitFor(() => {
      expect(mockProps.setVictory).toHaveBeenCalledWith('guess');
      expect(mockProps.setAiQuestion).toHaveBeenCalledWith('My guess is: Starcraft. Am I right?');
    });
  });

  it('handles startGameAI failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Test error' }),
    });

    render(<AIGuessesGame {...mockProps} />);
    fireEvent.click(screen.getByText('Start Game'));

    await waitFor(() => {
      expect(mockProps.setAiQuestion).toHaveBeenCalledWith('Error: Could not start AI game. Check backend and network.');
      expect(mockProps.setGameMessage).toHaveBeenCalledWith('Please try again. Error: Test error');
    });
  });

  it('handles handleAnswer failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Test error' }),
    });

    const props = { ...mockProps, started: true, sessionId: 'test-session-id' };
    render(<AIGuessesGame {...props} />);
    fireEvent.click(screen.getByText('Yes'));

    await waitFor(() => {
      expect(mockProps.setAiQuestion).toHaveBeenCalledWith('Bot Boy encountered an error. Please try again.');
      expect(mockProps.setGameMessage).toHaveBeenCalledWith('Error communicating with Bot Boy: Test error');
    });
  });

  it('ends the game if question count exceeds max questions', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        aiResponse: { type: 'question', content: 'Is it a sports game?' },
        questionCount: 21,
      }),
    });

    const props = { ...mockProps, started: true, sessionId: 'test-session-id', questionCount: 20 };
    render(<AIGuessesGame {...props} />);
    fireEvent.click(screen.getByText('Yes'));

    await waitFor(() => {
      expect(mockProps.setVictory).toHaveBeenCalledWith(false);
      expect(mockProps.setAiQuestion).toHaveBeenCalledWith("I couldn't guess your game in 20 questions! You win!");
    });
  });
});
