import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MonthlyStats from '../MonthlyStats';

describe('MonthlyStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock current date to be consistent
    vi.setSystemTime(new Date('2025-07-15'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fetches and displays monthly stats correctly', async () => {
    const mockGameHistory = [
      {
        session_id: '1',
        date: '2025-07-01',
        game_mode: 'player-guesses',
        victory: true,
        question_count: 5,
        total_questions: 20,
      },
      {
        session_id: '2',
        date: '2025-07-02',
        game_mode: 'player-guesses',
        victory: false,
        question_count: 20,
        total_questions: 20,
      },
      {
        session_id: '3',
        date: '2025-07-03',
        game_mode: 'ai-guesses',
        victory: true,
        question_count: 10,
        total_questions: 20,
      },
    ];

    render(<MonthlyStats games={mockGameHistory} />);

    await waitFor(() => {
      expect(screen.getByText('This Month\'s Stats')).toBeInTheDocument();
    });

    expect(screen.getByText('2/3')).toBeInTheDocument(); // 2 wins out of 3 games
    expect(screen.getByText('Win Rate: 67%')).toBeInTheDocument();
    expect(screen.getByText('🔥 1')).toBeInTheDocument(); // Current streak
    expect(screen.getByText('Current Streak')).toBeInTheDocument();
    expect(screen.getByText('Best: 1')).toBeInTheDocument();
  });

  it('calculates current streak correctly', async () => {
    const mockGameHistory = [
      {
        session_id: '1',
        date: '2025-07-01',
        game_mode: 'player-guesses',
        victory: true,
        question_count: 5,
        total_questions: 20,
      },
      {
        session_id: '2',
        date: '2025-07-02',
        game_mode: 'player-guesses',
        victory: true,
        question_count: 8,
        total_questions: 20,
      },
      {
        session_id: '3',
        date: '2025-07-03',
        game_mode: 'ai-guesses',
        victory: true,
        question_count: 10,
        total_questions: 20,
      },
    ];

    render(<MonthlyStats games={mockGameHistory} />);

    await waitFor(() => {
      expect(screen.getByText('🔥 3')).toBeInTheDocument(); // 3 consecutive wins
    });
  });

  it('handles streak break correctly', async () => {
    const mockGameHistory = [
      {
        session_id: '1',
        date: '2025-07-01',
        game_mode: 'player-guesses',
        victory: true,
        question_count: 5,
        total_questions: 20,
      },
      {
        session_id: '2',
        date: '2025-07-02',
        game_mode: 'player-guesses',
        victory: false,
        question_count: 20,
        total_questions: 20,
      },
      {
        session_id: '3',
        date: '2025-07-03',
        game_mode: 'ai-guesses',
        victory: true,
        question_count: 10,
        total_questions: 20,
      },
    ];

    render(<MonthlyStats games={mockGameHistory} />);

    await waitFor(() => {
      expect(screen.getByText('🔥 1')).toBeInTheDocument(); // Only most recent win
    });
  });

  it('calculates best streak correctly', async () => {
    const mockGameHistory = [
      {
        session_id: '1',
        date: '2025-07-01',
        game_mode: 'player-guesses',
        victory: true,
        question_count: 5,
        total_questions: 20,
      },
      {
        session_id: '2',
        date: '2025-07-02',
        game_mode: 'player-guesses',
        victory: true,
        question_count: 8,
        total_questions: 20,
      },
      {
        session_id: '3',
        date: '2025-07-03',
        game_mode: 'ai-guesses',
        victory: false,
        question_count: 20,
        total_questions: 20,
      },
      {
        session_id: '4',
        date: '2025-07-04',
        game_mode: 'player-guesses',
        victory: true,
        question_count: 12,
        total_questions: 20,
      },
    ];

    render(<MonthlyStats games={mockGameHistory} />);

    await waitFor(() => {
      expect(screen.getByText('Best: 2')).toBeInTheDocument(); // Best streak was 2
      expect(screen.getByText('🔥 1')).toBeInTheDocument(); // Current streak is 1
    });
  });

  it('handles empty game history', async () => {
<<<<<<< HEAD
    render(<MonthlyStats games={[]} />);
    expect(screen.queryByText('You haven\t played this month!')).not.toBeInTheDocument();
=======
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response);

    render(<MonthlyStats token="test-token" />);

    await waitFor(() => {
      expect(screen.getByText('0/0')).toBeInTheDocument();
      expect(screen.getByText('Win Rate: 0%')).toBeInTheDocument();
      expect(screen.getByText('🔥 0')).toBeInTheDocument();
    });

    // Should not show "Best:" when there are no games
    expect(screen.queryByText('Best:')).not.toBeInTheDocument();
  });

  it('handles API error gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('API Error'));
    
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<MonthlyStats token="test-token" />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching monthly stats:', expect.any(Error));
    });

    // Should still render the component structure
    expect(screen.getByText('July 2025 Stats')).toBeInTheDocument();
    
    consoleSpy.mockRestore();
  });

  it('fetches data for correct date range', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response);

    render(<MonthlyStats token="test-token" />);

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

  it('handles non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as Response);
    
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<MonthlyStats token="test-token" />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching monthly stats:', expect.any(Error));
    });
    
    consoleSpy.mockRestore();
  });

  it('renders current month name correctly', async () => {
    // Test different month
    vi.setSystemTime(new Date('2025-12-15'));
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response);

    render(<MonthlyStats token="test-token" />);

    await waitFor(() => {
      expect(screen.getByText('December 2025 Stats')).toBeInTheDocument();
    });
>>>>>>> adb4e7d770617ea754c22914ae65b1500a77018c
  });

  it('rounds win rate correctly', async () => {
    const mockGameHistory = [
      { session_id: '1', date: '2025-07-01', victory: true, question_count: 5, total_questions: 20 },
      { session_id: '2', date: '2025-07-02', victory: false, question_count: 20, total_questions: 20 },
      { session_id: '3', date: '2025-07-03', victory: false, question_count: 20, total_questions: 20 },
    ];

    render(<MonthlyStats games={mockGameHistory} />);

    await waitFor(() => {
      expect(screen.getByText('Win Rate: 33%')).toBeInTheDocument(); // 1/3 = 33.33%, rounded to 33%
    });
  });
});
