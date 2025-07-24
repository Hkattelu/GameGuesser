import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import GameHistoryCalendar from '../GameHistoryCalendar';

// Mock fetch
global.fetch = vi.fn();
const mockFetch = fetch as vi.MockedFunction<typeof fetch>;

// Mock getApiUrl
vi.mock('../../env_utils', () => ({
  getApiUrl: () => 'http://localhost:8080',
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
});

describe('GameHistoryCalendar', () => {
  const defaultProps = {
    token: 'test-token',
    gameMode: 'player-guesses' as const,
    isOpen: true,
    onClose: vi.fn(),
  };

  const mockGameHistory = [
    {
      session_id: '1',
      date: '2025-07-02',
      game_mode: 'player-guesses' as const,
      victory: true,
      question_count: 5,
      total_questions: 20,
    },
    {
      session_id: '2',
      date: '2025-07-03',
      game_mode: 'player-guesses' as const,
      victory: false,
      question_count: 20,
      total_questions: 20,
    },
    {
      session_id: '3',
      date: '2025-07-15',
      game_mode: 'player-guesses' as const,
      victory: true,
      question_count: 10,
      total_questions: 20,
    },
  ];

  const mockGameHistoryWithHints = [
    {
      session_id: '1',
      date: '2025-07-02',
      game_mode: 'player-guesses' as const,
      victory: true,
      question_count: 5,
      total_questions: 20,
      score: 1,
      used_hint: true,
    },
    {
      session_id: '2',
      date: '2025-07-03',
      game_mode: 'player-guesses' as const,
      victory: false,
      question_count: 20,
      total_questions: 20,
      used_hint: true,
    },
    {
      session_id: '3',
      date: '2025-07-15',
      game_mode: 'player-guesses' as const,
      victory: true,
      question_count: 10,
      total_questions: 20,
      score: 0.5,
      used_hint: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(new Date('2025-07-15'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders when isOpen is true', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockGameHistory,
    } as Response);

    render(<GameHistoryCalendar {...defaultProps} />);
    
    expect(screen.getByText('Game History Calendar')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<GameHistoryCalendar {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('Game History Calendar')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response);

    render(<GameHistoryCalendar {...defaultProps} />);
    
    const closeButton = screen.getByRole('button', { name: '×' });
    fireEvent.click(closeButton);
    
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('fetches game history on mount', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockGameHistory,
    } as Response);

    render(<GameHistoryCalendar {...defaultProps} />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/games/history/player-guesses?startDate=2025-07-01&endDate=2025-07-31',
        {
          headers: {
            Authorization: 'Bearer test-token',
          },
        }
      );
    });
  });

  it('displays monthly stats correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockGameHistory,
    } as Response);

    render(<GameHistoryCalendar {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('2/3')).toBeInTheDocument(); // Games Won
      expect(screen.getByText('Win Rate: 67%')).toBeInTheDocument(); // Win Rate
      expect(screen.getByText('Best: 1')).toBeInTheDocument(); // Streak
    });
  });

  it('displays calendar with current month', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockGameHistory,
    } as Response);

    render(<GameHistoryCalendar {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('July 2025')).toBeInTheDocument();
    });

    // Should show day headers
    expect(screen.getByText('Sun')).toBeInTheDocument();
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Sat')).toBeInTheDocument();

    // Should show day numbers
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('31')).toBeInTheDocument();
  });

  it('colors calendar days based on game results', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockGameHistory,
    } as Response);

    const { container } = render(<GameHistoryCalendar {...defaultProps} />);

    await waitFor(() => {
      // Day 1 should be green (win)
      const day1 = container.querySelector('[title*="2025-07-02: Won"]');
      expect(day1).toHaveClass('bg-green-100', 'text-green-800');

      // Day 2 should be red (loss)
      const day2 = container.querySelector('[title*="2025-07-03: Lost"]');
      expect(day2).toHaveClass('bg-red-100', 'text-red-800');

      // Day 15 should be green (win).
      const day15 = container.querySelector('[title*="2025-07-15: Won"]');
      expect(day15).toHaveClass('bg-green-100', 'text-green-800');
    });
  });

  it('navigates between months', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response);

    render(<GameHistoryCalendar {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('July 2025')).toBeInTheDocument();
    });

    // Click previous month
    const prevButton = screen.getByRole('button', { name: '← Previous' });
    fireEvent.click(prevButton);

    expect(screen.getByText('June 2025')).toBeInTheDocument();

    // Click next month
    const nextButton = screen.getByRole('button', { name: 'Next →' });
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);

    expect(screen.getByText('August 2025')).toBeInTheDocument();
  });

  it('shares monthly results to clipboard', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockGameHistory,
    } as Response);

    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    navigator.clipboard.writeText = mockWriteText;

    render(<GameHistoryCalendar {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Share Monthly Results')).toBeInTheDocument();
    });

    const shareButton = screen.getByRole('button', { name: 'Share Monthly Results' });
    fireEvent.click(shareButton);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledTimes(1);
    });

    const callArgs = mockWriteText.mock.calls[0][0];
    expect(callArgs).toContain('Quiz Bot\'s Arcade - July 2025');
    expect(callArgs).toContain('📊 Monthly Stats:');
    expect(callArgs).toContain('🏆 Won: 2/3 games (67%)');
    expect(callArgs).toContain('📅 Days played: 3');
    expect(callArgs).toContain('🟢 = Win  🔴 = Loss  ⬜ = No game');
  });

  it('shows success message after successful share', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockGameHistory,
    } as Response);

    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    navigator.clipboard.writeText = mockWriteText;

    render(<GameHistoryCalendar {...defaultProps} />);

    await waitFor(() => {
      const shareButton = screen.getByRole('button', { name: 'Share Monthly Results' });
      fireEvent.click(shareButton);
    });

    await waitFor(() => {
      expect(screen.getByText('✓ Copied!')).toBeInTheDocument();
    });
  });

  it('handles share failure gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockGameHistory,
    } as Response);

    const mockWriteText = vi.fn().mockRejectedValue(new Error('Clipboard failed'));
    navigator.clipboard.writeText = mockWriteText;

    const mockAlert = vi.fn();
    global.alert = mockAlert;

    render(<GameHistoryCalendar {...defaultProps} />);

    await waitFor(() => {
      const shareButton = screen.getByRole('button', { name: 'Share Monthly Results' });
      fireEvent.click(shareButton);
    });

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith(
        expect.stringContaining('Copy this text to share:')
      );
    });
  });

  it('displays loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<GameHistoryCalendar {...defaultProps} />);
    
    expect(screen.getByTestId('loading-animation')).toHaveClass('animate-pulse');
  });

  it('displays notice when no games played', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ([]),
    } as Response);

    render(<GameHistoryCalendar {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('You haven\'t played this month!'));
    });
  });

  it('does not fetch when not open', () => {
    render(<GameHistoryCalendar {...defaultProps} isOpen={false} />);
    
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('handles API error gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('API Error'));
    
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<GameHistoryCalendar {...defaultProps} />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching game history:', expect.any(Error));
    });
    
    consoleSpy.mockRestore();
  });

  it('generates correct emoji grid for sharing', async () => {
    const gridGameHistory = [];
    // Create a full week of games
    for (let i = 1; i <= 7; i++) {
      gridGameHistory.push({
        session_id: `${i}`,
        date: `2025-07-0${i}`,
        game_mode: 'player-guesses' as const,
        victory: i % 2 === 1, // Alternate wins/losses
        question_count: 10,
        total_questions: 20,
      });
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => gridGameHistory,
    } as Response);

    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    navigator.clipboard.writeText = mockWriteText;

    render(<GameHistoryCalendar {...defaultProps} />);

    await waitFor(() => {
      const shareButton = screen.getByRole('button', { name: 'Share Monthly Results' });
      fireEvent.click(shareButton);
    });

    const callArgs = mockWriteText.mock.calls[0][0];
    // Should contain emojis for the calendar grid
    expect(callArgs).toContain('🟢🔴🟢🔴🟢\n🔴🟢');
  });

  it('shows legend with correct colors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response);

    render(<GameHistoryCalendar {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Won')).toBeInTheDocument();
      expect(screen.getByText('Lost')).toBeInTheDocument();
      expect(screen.getByText('No Game')).toBeInTheDocument();
    });
  });

  it('displays hint indicator for games where hint was used', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockGameHistoryWithHints,
    } as Response);

    const { container } = render(<GameHistoryCalendar {...defaultProps} />);

    await waitFor(() => {
      // Day 2 should show hint indicator (💡)
      const day2 = container.querySelector('[title*="2025-07-02: Won"] .text-orange-600');
      expect(day2).toBeInTheDocument();
      expect(day2).toHaveTextContent('💡');

      // Day 3 should show hint indicator (💡)
      const day3 = container.querySelector('[title*="2025-07-03: Lost"] .text-orange-600');
      expect(day3).toBeInTheDocument();
      expect(day3).toHaveTextContent('💡');

      // Day 15 should show hint indicator (💡)
      const day15 = container.querySelector('[title*="2025-07-15: Won"] .text-orange-600');
      expect(day15).toBeInTheDocument();
      expect(day15).toHaveTextContent('💡');
    });
  });

  it('shows hint legend for player-guesses mode', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response);

    render(<GameHistoryCalendar {...defaultProps} gameMode="player-guesses" />);

    await waitFor(() => {
      expect(screen.getByText('💡')).toBeInTheDocument();
      expect(screen.getByText('Hint Used')).toBeInTheDocument();
    });
  });

  it('does not show hint legend for ai-guesses mode', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response);

    render(<GameHistoryCalendar {...defaultProps} gameMode="ai-guesses" />);

    await waitFor(() => {
      expect(screen.queryByText('💡')).not.toBeInTheDocument();
      expect(screen.queryByText('Hint Used')).not.toBeInTheDocument();
    });
  });
});
