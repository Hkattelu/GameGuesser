import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PlayerGuessesGame from '../../PlayerGuessesGame';
import { GameMode } from '../../types';

// Mock child components
jest.mock('../../components/SuggestionChips', () => (props: any) => (
  <div data-testid="suggestion-chips">
    <button onClick={() => props.onSelectSuggestion('Is it a strategy game?')}>Suggest</button>
  </div>
));
jest.mock('../../components/ConversationHistory', () => () => <div data-testid="conversation-history" />);

// Mock fetch
global.fetch = jest.fn();

const mockProps = {
  gameMode: 'player-guesses' as GameMode,
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
  setVictory: jest.fn(),
};

describe('PlayerGuessesGame', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  it('renders the start button initially', () => {
    render(<PlayerGuessesGame {...mockProps} />);
    expect(screen.getByText('Start Game')).toBeInTheDocument();
  });

  it('calls startGamePlayerGuesses and updates state on start button click', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
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
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        type: 'answer',
        content: 'Yes',
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
      expect(mockProps.setHighlightedResponse).toHaveBeenCalledWith('Yes');
      expect(mockProps.setChatHistory).toHaveBeenCalled();
      expect(mockProps.setLoading).toHaveBeenCalledWith(false);
    });
  });

  it('handles correct player guess and ends the game', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
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
});
