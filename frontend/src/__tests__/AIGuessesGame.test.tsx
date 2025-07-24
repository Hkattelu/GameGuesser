import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AIGuessesGame from '../AIGuessesGame';
import { GameMode } from '../types';

// Mock child components
vi.mock('../components/ResponseButtons', () => ({
    default: (props: any) => (
        <div data-testid="response-buttons">
            <button onClick={() => props.onAnswer('Yes')}>Yes</button>
            <button onClick={() => props.onAnswer('No')}>No</button>
        </div>
    ),
}));

vi.mock('../components/LoadingIndicator', () => ({
    default: () => <div data-testid="loading-indicator" />,
}));

vi.mock('../components/ConversationHistory', () => ({
    default: () => <div data-testid="conversation-history" />,
}));

// Mock fetch
global.fetch = vi.fn();

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
  setPreGame: vi.fn(),
  setStarted: vi.fn(),
  setQuestionCount: vi.fn(),
  setChatHistory: vi.fn(),
  setLoading: vi.fn(),
  setHighlightedResponse: vi.fn(),
  setSessionId: vi.fn(),
  setGameMessage: vi.fn(),
  setVictory: vi.fn(),
  setShowResults: vi.fn(),
  setConfidence: vi.fn(),
};

describe('AIGuessesGame', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as vi.Mock).mockClear();
  });

  it('renders the start button initially', () => {
    render(<AIGuessesGame {...mockProps} />);
    expect(screen.getByText('Start Game')).toBeInTheDocument();
  });

  it('calls startGameAI and updates state on start button click', async () => {
    (global.fetch as vi.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        sessionId: 'test-session-id',
        aiResponse: { type: 'question', content: 'Is your game a strategy game?' },
        questionCount: 1,
      }),
    });

    render(<AIGuessesGame {...mockProps} />);
    fireEvent.click(screen.getByText('Start Game'));

    // Loading indicator should appear immediately.
    expect(mockProps.setLoading).toHaveBeenCalledWith(true);

    // The game should only transition to *started* state after the fetch
    // succeeds.
    await waitFor(() => {
      expect(mockProps.setStarted).toHaveBeenCalledWith(true);
      expect(mockProps.setSessionId).toHaveBeenCalledWith('test-session-id');
      expect(mockProps.setLoading).toHaveBeenCalledWith(false);
    });
  });

  it('handles user answer and updates state', async () => {
    (global.fetch as vi.Mock).mockResolvedValueOnce({
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
      expect(mockProps.setLoading).toHaveBeenCalledWith(false);
    });
  });

  it('handles AI guess and ends the game', async () => {
    (global.fetch as vi.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        aiResponse: { type: 'guess', content: true },
        questionCount: 3,
      }),
    });

    const props = { ...mockProps, started: true, sessionId: 'test-session-id' };
    render(<AIGuessesGame {...props} />);

    fireEvent.click(screen.getByText('Yes'));

    await waitFor(() => {
      expect(mockProps.setVictory).toHaveBeenCalledWith(false);
    });
  });

  it('shows an error banner when startGameAI fails', async () => {
    (global.fetch as vi.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Test error' }),
    });

    render(<AIGuessesGame {...mockProps} />);
    fireEvent.click(screen.getByText('Start Game'));

    await waitFor(() => {
      expect(screen.getByTestId('error-banner')).toBeInTheDocument();
      expect(screen.getByText('Error starting game: Test error')).toBeInTheDocument();
    });
  });

  it('does not increment question count on handleAnswer failure', async () => {
    (global.fetch as vi.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Test error' }),
    });

    const props = { ...mockProps, started: true, sessionId: 'test-session-id' };
    render(<AIGuessesGame {...props} />);
    fireEvent.click(screen.getByText('Yes'));

    await waitFor(() => {
      expect(screen.getByTestId('error-banner')).toBeInTheDocument();
      expect(mockProps.setQuestionCount).not.toHaveBeenCalled();
    });
  });

  it('ends the game if question count exceeds max questions', async () => {
    (global.fetch as vi.Mock).mockResolvedValueOnce({
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
      expect(mockProps.setVictory).toHaveBeenCalledWith(true);
    });
  });
});
