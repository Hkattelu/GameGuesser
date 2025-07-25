import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import GameResultsDialog from '../GameResultsDialog';
import { ChatMessage } from '../../types';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
});

describe('GameResultsDialog', () => {
  const mockChatHistory: ChatMessage[] = [
    { role: 'user', parts: [{ text: 'Is it an RPG?' }] },
    { role: 'model', parts: [{ text: 'Yes' }] },
    { role: 'user', parts: [{ text: 'Is it open world?' }] },
    { role: 'model', parts: [{ text: 'No' }] },
    { role: 'user', parts: [{ text: 'Final Fantasy VII' }] },
    { role: 'model', parts: [{ text: 'You guessed it! The game was Final Fantasy VII.' }] },
  ];

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    chatHistory: mockChatHistory,
    gameMode: 'player-guesses' as const,
    victory: true as const,
    maxQuestions: 20,
    sessionId: 'session-123',
    username: 'testuser',
  };

  const defaultPropsWithHint = {
    ...defaultProps,
    score: 0.5,
    usedHint: true,
  };

  const defaultPropsWithHintNoVictory = {
    ...defaultProps,
    victory: false as const,
    usedHint: true,
  };

  const defaultPropsNoHintWithScore = {
    ...defaultProps,
    score: 0.8,
    usedHint: false,
  };

  const defaultPropsUndefinedValues = {
    ...defaultProps,
    score: undefined,
    usedHint: undefined,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when isOpen is true', () => {
    render(<GameResultsDialog {...defaultProps} />);
    
    expect(screen.getByText('Game Results')).toBeInTheDocument();
    expect(screen.getByText('Player Guesses - Won')).toBeInTheDocument();
    expect(screen.getByText('3/20 questions used')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<GameResultsDialog {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('Game Results')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(<GameResultsDialog {...defaultProps} />);
    
    const closeButton = screen.getByRole('button', { name: '×' });
    fireEvent.click(closeButton);
    
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('displays correct summary for winning game', () => {
    render(<GameResultsDialog {...defaultProps} />);
    
    expect(screen.getByText('Player Guesses - Won')).toBeInTheDocument();
    expect(screen.getByText('3/20 questions used')).toBeInTheDocument();
  });

  it('displays correct summary for losing game', () => {
    render(<GameResultsDialog {...defaultProps} victory={false} />);
    
    expect(screen.getByText('Player Guesses - Lost')).toBeInTheDocument();
  });

  it('displays correct summary for AI guess victory', () => {
    render(<GameResultsDialog {...defaultProps} victory="guess" />);
    
    expect(screen.getByText('Player Guesses - AI Guessed')).toBeInTheDocument();
  });

  it('displays correct summary for AI guesses mode', () => {
    render(<GameResultsDialog {...defaultProps} gameMode="ai-guesses" />);
    
    expect(screen.getByText('AI Guesses - Won')).toBeInTheDocument();
  });

  it('shares results to clipboard when share button is clicked', async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    navigator.clipboard.writeText = mockWriteText;

    render(<GameResultsDialog {...defaultProps} />);
    
    const shareButton = screen.getByRole('button', { name: 'Share Results' });
    fireEvent.click(shareButton);
    
    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledTimes(1);
    });

    const callArgs = mockWriteText.mock.calls[0][0];
    expect(callArgs).toContain('Bot Boy\'s Game Guessr');
    expect(callArgs).toContain('Player Guesses');
    expect(callArgs).toContain('Won');
    expect(callArgs).toContain('3/20 questions');
    expect(callArgs).toContain('🟢🔴🟣');
  });

  it('shows success message after successful share', async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    navigator.clipboard.writeText = mockWriteText;

    render(<GameResultsDialog {...defaultProps} />);
    
    const shareButton = screen.getByRole('button', { name: 'Share Results' });
    fireEvent.click(shareButton);
    
    await waitFor(() => {
      expect(screen.getByText('✓ Copied!')).toBeInTheDocument();
    });

    // Should revert back to original text after timeout
    await waitFor(() => {
      expect(screen.getByText('Share Results')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('handles clipboard write failure gracefully', async () => {
    const mockWriteText = vi.fn().mockRejectedValue(new Error('Clipboard failed'));
    navigator.clipboard.writeText = mockWriteText;

    // Mock alert
    const mockAlert = vi.fn();
    global.alert = mockAlert;

    render(<GameResultsDialog {...defaultProps} />);
    
    const shareButton = screen.getByRole('button', { name: 'Share Results' });
    fireEvent.click(shareButton);
    
    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith(
        expect.stringContaining('Copy this text to share:')
      );
    });
  });

  it('generates correct emoji grid for different responses', () => {
    const complexChatHistory: ChatMessage[] = [
      { role: 'user', parts: [{ text: 'Is it an RPG?' }] },
      { role: 'model', parts: [{ text: 'Yes' }] },
      { role: 'user', parts: [{ text: 'Is it open world?' }] },
      { role: 'model', parts: [{ text: 'No' }] },
      { role: 'user', parts: [{ text: 'Is it a puzzle game?' }] },
      { role: 'model', parts: [{ text: 'Unsure' }] },
      { role: 'user', parts: [{ text: 'Wrong guess' }] },
      { role: 'model', parts: [{ text: 'That is incorrect.' }] },
    ];

    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    navigator.clipboard.writeText = mockWriteText;

    render(<GameResultsDialog {...defaultProps} chatHistory={complexChatHistory} victory={false} />);
    
    const shareButton = screen.getByRole('button', { name: 'Share Results' });
    fireEvent.click(shareButton);
    
    const callArgs = mockWriteText.mock.calls[0][0];
    expect(callArgs).toContain('🟢🔴🟡⬜');
  });

  it('includes GameResultsGrid component', () => {
    render(<GameResultsDialog {...defaultProps} />);
    
    // Should render the grid with numbered squares
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('handles empty chat history', () => {
    render(<GameResultsDialog {...defaultProps} chatHistory={[]} />);
    
    expect(screen.getByText('Player Guesses - Won')).toBeInTheDocument();
    expect(screen.getByText('0/20 questions used')).toBeInTheDocument();
  });

  it('generates share text with correct website URL', async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    navigator.clipboard.writeText = mockWriteText;

    render(<GameResultsDialog {...defaultProps} />);
    
    const shareButton = screen.getByRole('button', { name: 'Share Results' });
    fireEvent.click(shareButton);
    
    await waitFor(() => {
      const callArgs = mockWriteText.mock.calls[0][0];
      expect(callArgs).toContain('Play at:');
      expect(callArgs).toContain(window.location.origin);
    });
  });

  it('displays hint indicator for winning game with hint used', () => {
    render(<GameResultsDialog {...defaultPropsWithHint} />);
    
    expect(screen.getByText('(💡 Hint used)')).toBeInTheDocument();
  });

  it('displays hint indicator for losing game with hint used', () => {
    render(<GameResultsDialog {...defaultPropsWithHintNoVictory} />);
    
    expect(screen.getByText('💡 Hint used')).toBeInTheDocument();
  });

  it('includes hint indicator in share text for winning game with hint used', async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    navigator.clipboard.writeText = mockWriteText;

    render(<GameResultsDialog {...defaultPropsWithHint} />);
    
    const shareButton = screen.getByRole('button', { name: 'Share Results' });
    fireEvent.click(shareButton);
    
    await waitFor(() => {
      const callArgs = mockWriteText.mock.calls[0][0];
      expect(callArgs).toContain('Score: 0.5 points (💡 Hint used)');
    });
  });

  it('includes hint indicator in share text for losing game with hint used', async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    navigator.clipboard.writeText = mockWriteText;

    render(<GameResultsDialog {...defaultPropsWithHintNoVictory} />);
    
    const shareButton = screen.getByRole('button', { name: 'Share Results' });
    fireEvent.click(shareButton);
    
    await waitFor(() => {
      const callArgs = mockWriteText.mock.calls[0][0];
      expect(callArgs).toContain('💡 Hint used');
    });
  });

  it('does not display hint indicator when hint was not used', () => {
    render(<GameResultsDialog {...defaultProps} />);
    
    expect(screen.queryByText('💡 Hint used')).not.toBeInTheDocument();
  });

  it('displays score without hint indicator when hint was not used', () => {
    render(<GameResultsDialog {...defaultPropsNoHintWithScore} />);

    // Score text should appear
    expect(screen.getByText('Score: 0.8 points')).toBeInTheDocument();

    // Hint indicator should be absent
    expect(screen.queryByText('💡 Hint used')).not.toBeInTheDocument();
  });

  it('renders safely when score and usedHint are undefined', () => {
    render(<GameResultsDialog {...defaultPropsUndefinedValues} />);

    // Should still show standard results summary without crashing
    expect(screen.getByText('Game Results')).toBeInTheDocument();
    expect(screen.getByText('Player Guesses - Won')).toBeInTheDocument();
  });
});
