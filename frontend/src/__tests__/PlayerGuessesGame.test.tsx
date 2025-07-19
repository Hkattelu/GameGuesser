import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import { vi } from 'vitest';
import PlayerGuessesGame from '../PlayerGuessesGame';
import { GameMode } from '../types';

// Mock child components
vi.mock('../components/SuggestionChips', () => ({
    default: (props: any) => (
        <div data-testid="suggestion-chips">
            <button onClick={() => props.onSelectSuggestion('Is it a strategy game?')}>Suggest</button>
        </div>
    ),
}));
vi.mock('../components/ConversationHistory', () => ({
    default: () => <div data-testid="conversation-history" />,
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
  token: null,
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

    expect(mockProps.setPreGame).toHaveBeenCalledWith(false);
    expect(mockProps.setStarted).toHaveBeenCalledWith(true);
    expect(mockProps.setLoading).toHaveBeenCalledWith(true);

    await waitFor(() => {
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
      expect(mockProps.setGameMessage).toHaveBeenCalledWith('You guessed it! The game was Starcraft.');
    });
  });

  it('handles startGamePlayerGuesses failure', async () => {
    (global.fetch as vi.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Test error' }),
    });

    render(<PlayerGuessesGame {...mockProps} />);
    fireEvent.click(screen.getByText('Start Game'));
    
    await waitFor(() => {
      expect(mockProps.setGameMessage).toHaveBeenCalledWith('Error starting the game: Test error. Please try again.');
    });
  });

  it('handles handlePlayerQuestion failure', async () => {
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
      expect(mockProps.setGameMessage).toHaveBeenCalledWith('Error processing your question: Test error. Please try again.');
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
      expect(mockProps.setGameMessage).toHaveBeenCalledWith("You're out of questions! The game was The game was Starcraft.");
    });
  });

  it('fetches and displays a hint when the Hint button is clicked', async () => {
    (global.fetch as vi.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ hintText: 'Developer: Nintendo' }),
    });

    const props = { ...mockProps, started: true, sessionId: 'test-session-id' };
    render(<PlayerGuessesGame {...props} />);

    fireEvent.click(screen.getByText('Hint'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/hint'), expect.any(Object));
    });

    expect(screen.getByText('Developer: Nintendo')).toBeInTheDocument();
  });
});

