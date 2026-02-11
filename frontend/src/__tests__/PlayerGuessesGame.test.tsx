import React from 'react';
import { render, screen, fireEvent, waitFor } from '../test/test-utils';
import { vi } from 'vitest';
import PlayerGuessesGame from '../PlayerGuessesGame';
import { GameMode } from '../types';

// Mock child components
vi.mock('../components/SuggestionChips', () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    default: (props: any) => (
        <div data-testid="suggestion-chips">
            <button onClick={() => props.onSelectSuggestion('Is it a strategy game?')}>Suggest</button>
        </div>
    ),
}));
vi.mock('../components/ConversationHistory', () => ({
    default: () => <div data-testid="conversation-history" />,
}));
vi.mock('../components/HintIcon', () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    default: (props: any) => <button aria-label="Get a hint" onClick={props.onClick} />,
}));
vi.mock('../components/HintDialog', () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    default: (props: any) => props.isOpen ? <div data-testid="hint-dialog">Hint Dialog</div> : null,
}));


// Mock fetch
global.fetch = vi.fn();

const mockProps = {
  gameMode: 'player-guesses' as GameMode,
  preGame: true,
  started: false,
  loading: false,
  questionCount: 0,
  maxQuestions: 20,
  chatHistory: [],
  sessionId: null,
  setPreGame: vi.fn(),
  setStarted: vi.fn(),
  setQuestionCount: vi.fn(),
  setChatHistory: vi.fn(),
  setLoading: vi.fn(),
  setSessionId: vi.fn(),
  setGameMessage: vi.fn(),
  setVictory: vi.fn(),
  setShowResults: vi.fn(),
  setConfidence: vi.fn(),
  setError: vi.fn(),
  token: null,
  setScore: vi.fn(),
  setUsedHint: vi.fn(),
};

describe('PlayerGuessesGame', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as vi.Mock).mockClear();
  });

  it('renders the start button initially', () => {
    render(<PlayerGuessesGame {...mockProps} />);
    expect(screen.getByText('Start Game')).toBeInTheDocument();
  });

  it('calls startGamePlayerGuesses and updates state on start button click', async () => {
    (global.fetch as vi.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ sessionId: 'test-session-id' }),
    });

    render(<PlayerGuessesGame {...mockProps} />);
    fireEvent.click(screen.getByText('Start Game'));

    // The component should enter a loading state right away.
    expect(mockProps.setLoading).toHaveBeenCalledWith(true);

    await waitFor(() => {
      expect(mockProps.setStarted).toHaveBeenCalledWith(true);
      expect(mockProps.setSessionId).toHaveBeenCalledWith('test-session-id');
      expect(mockProps.setGameMessage).toHaveBeenCalledWith("I'm thinking of a game. Ask me a yes/no question, or try to guess the game!");
      expect(mockProps.setLoading).toHaveBeenCalledWith(false);
    });
  });

  it('handles player question and updates the conversation', async () => {
    (global.fetch as vi.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        type: 'answer',
        content: { answer: 'Yes' },
        questionCount: 1,
      }),
    });

    const props = { ...mockProps, started: true, sessionId: 'test-session-id' };
    render(<PlayerGuessesGame {...props} />);

    const input = screen.getByPlaceholderText('e.g., Is the game a first-person shooter?');
    fireEvent.change(input, { target: { value: 'Is it a strategy game?' } });
    fireEvent.click(screen.getByText('Submit'));

    expect(mockProps.setLoading).toHaveBeenCalledWith(true);

    await waitFor(() => {
      expect(mockProps.setChatHistory).toHaveBeenCalled();
      expect(mockProps.setLoading).toHaveBeenCalledWith(false);
    });
  });

  it('handles correct player guess and ends the game', async () => {
    (global.fetch as vi.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        type: 'guessResult',
        content: { correct: true, response: 'Starcraft' },
      }),
    });

    const props = { ...mockProps, started: true, sessionId: 'test-session-id' };
    render(<PlayerGuessesGame {...props} />);

    const input = screen.getByPlaceholderText('e.g., Is the game a first-person shooter?');
    fireEvent.change(input, { target: { value: 'Starcraft' } });
    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(mockProps.setVictory).toHaveBeenCalledWith(true);
    });
  });

  it('handles correct player guess with hint used and shows hint indicator in message', async () => {
    (global.fetch as vi.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        type: 'guessResult',
        content: { correct: true, response: 'Starcraft', usedHint: true, score: 0.5 },
      }),
    });

    const props = { ...mockProps, started: true, sessionId: 'test-session-id' };
    render(<PlayerGuessesGame {...props} />);

    const input = screen.getByPlaceholderText('e.g., Is the game a first-person shooter?');
    fireEvent.change(input, { target: { value: 'Starcraft' } });
    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(mockProps.setGameMessage).toHaveBeenCalledWith('Starcraft (0.5 pts) - Hint used');
    });
  });

  it('handles close guess with hint used and shows hint indicator in message', async () => {
    (global.fetch as vi.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        type: 'guessResult',
        content: { correct: false, response: 'Close but not quite', usedHint: true, score: 0 },
      }),
    });

    const props = { ...mockProps, started: true, sessionId: 'test-session-id' };
    render(<PlayerGuessesGame {...props} />);

    const input = screen.getByPlaceholderText('e.g., Is the game a first-person shooter?');
    fireEvent.change(input, { target: { value: 'Starcraft' } });
    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(mockProps.setGameMessage).toHaveBeenCalledWith('Close but not quite');
    });
  });

  it('shows an error banner when startGamePlayerGuesses fails', async () => {
    (global.fetch as vi.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Test error' }),
    });

    render(<PlayerGuessesGame {...mockProps} />);
    fireEvent.click(screen.getByText('Start Game'));

    await waitFor(() => {
      expect(screen.getByTestId('error-banner')).toBeInTheDocument();
      expect(screen.getByText('Error starting the game: Test error')).toBeInTheDocument();
    });
  });

  it('does not increment question count on handlePlayerQuestion failure', async () => {
    (global.fetch as vi.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Test error' }),
    });

    const props = { ...mockProps, started: true, sessionId: 'test-session-id' };
    render(<PlayerGuessesGame {...props} />);
    const input = screen.getByPlaceholderText('e.g., Is the game a first-person shooter?');
    fireEvent.change(input, { target: { value: 'Is it a strategy game?' } });
    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(screen.getByTestId('error-banner')).toBeInTheDocument();
      expect(mockProps.setQuestionCount).not.toHaveBeenCalled();
    });
  });

  it('handles incorrect player guess', async () => {
    (global.fetch as vi.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        type: 'guessResult',
        content: { correct: false, response: 'Incorrect guess.' },
      }),
    });

    const props = { ...mockProps, started: true, sessionId: 'test-session-id' };
    render(<PlayerGuessesGame {...props} />);
    const input = screen.getByPlaceholderText('e.g., Is the game a first-person shooter?');
    fireEvent.change(input, { target: { value: 'Wrong game' } });
    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(mockProps.setGameMessage).toHaveBeenCalledWith('Incorrect guess.');
    });
  });

  it('ends the game if question count exceeds max questions', async () => {
    (global.fetch as vi.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        type: 'answer',
        content: 'The game was Starcraft',
        questionCount: 20,
      }),
    });

    const props = { ...mockProps, started: true, sessionId: 'test-session-id', questionCount: 19 };
    render(<PlayerGuessesGame {...props} />);
    const input = screen.getByPlaceholderText('e.g., Is the game a first-person shooter?');
    fireEvent.change(input, { target: { value: 'Is it a strategy game?' } });
    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(mockProps.setVictory).toHaveBeenCalledWith(false);
    });
  });

  it('opens the hint dialog when the hint icon is clicked', async () => {
    const props = { ...mockProps, started: true, sessionId: 'test-session-id' };
    render(<PlayerGuessesGame {...props} />);

    fireEvent.click(screen.getByRole('button', { name: 'Get a hint' }));

    await waitFor(() => {
        expect(screen.getByTestId('hint-dialog')).toBeInTheDocument();
    });
  });

  it('sets error state when startGamePlayerGuesses fails', async () => {
    (global.fetch as vi.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Test error' }),
    });

    render(<PlayerGuessesGame {...mockProps} />);
    fireEvent.click(screen.getByText('Start Game'));

    await waitFor(() => {
      expect(mockProps.setError).toHaveBeenCalledWith(true);
    });
  });

  describe('usedHint & score propagation', () => {
    it('resets score and hint only after successful start game request', async () => {
      // Create a promise we can resolve later to control async timing
      let resolveFetch: (value: unknown) => void;
      const fetchPromise = new Promise((res) => {
        resolveFetch = res;
      });

      // @ts-expect-error resolveFetch will be assigned synchronously above
      (global.fetch as vi.Mock).mockReturnValueOnce(fetchPromise);

      render(<PlayerGuessesGame {...mockProps} />);
      fireEvent.click(screen.getByText('Start Game'));

      // Immediately after clicking, fetch is pending so setters should NOT have been called yet
      expect(mockProps.setScore).not.toHaveBeenCalled();
      expect(mockProps.setUsedHint).not.toHaveBeenCalled();

      // Fulfill the fetch promise with a successful response object
      resolveFetch!({
        ok: true,
        json: () => Promise.resolve({ sessionId: 'session-after' }),
      });

      await waitFor(() => {
        expect(mockProps.setScore).toHaveBeenCalledWith(undefined);
        expect(mockProps.setUsedHint).toHaveBeenCalledWith(undefined);
      });
    });

    it('does not reset score or hint when start game request fails', async () => {
      (global.fetch as vi.Mock).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Backend down' }),
      });

      render(<PlayerGuessesGame {...mockProps} />);
      fireEvent.click(screen.getByText('Start Game'));

      await waitFor(() => {
        expect(mockProps.setError).toHaveBeenCalledWith(true);
      });

      // Ensure score/hint were never reset
      expect(mockProps.setScore).not.toHaveBeenCalled();
      expect(mockProps.setUsedHint).not.toHaveBeenCalled();
    });

    it('propagates score and hint from guessResult message', async () => {
      (global.fetch as vi.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          type: 'guessResult',
          content: {
            correct: true,
            response: 'You guessed it!',
            score: 0.7,
            usedHint: true,
          },
        }),
      });

      const props = { ...mockProps, started: true, sessionId: 'sess-123' };
      render(<PlayerGuessesGame {...props} />);

      const input = screen.getByPlaceholderText('e.g., Is the game a first-person shooter?');
      fireEvent.change(input, { target: { value: 'My final guess' } });
      fireEvent.click(screen.getByText('Submit'));

      await waitFor(() => {
        expect(mockProps.setScore).toHaveBeenCalledWith(0.7);
        expect(mockProps.setUsedHint).toHaveBeenCalledWith(true);
      });
    });
  });
});
