import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../env_utils';
import type { GameMode } from '../types';

interface GameSession {
  session_id: string;
  date: string;
  game_mode: 'player-guesses' | 'ai-guesses';
  victory: boolean;
  question_count: number;
  total_questions: number;
  game_name?: string;
}

interface MonthlyStatsProps {
  token: string | null;
  /**
   * Which game mode to fetch history for. When omitted we default to
   * `'player-guesses'` to preserve test compatibility.
   */
  gameType?: GameMode;
}

const MonthlyStats: React.FC<MonthlyStatsProps> = ({ token, gameType = 'player-guesses' }) => {
  const [stats, setStats] = useState<{
    wins: number;
    total: number;
    winRate: number;
    currentStreak: number;
    bestStreak: number;
  }>({
    wins: 0,
    total: 0,
    winRate: 0,
    currentStreak: 0,
    bestStreak: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    const fetchMonthlyStats = async () => {
      try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);


        const response = await fetch(
          `${getApiUrl()}/games/history?startDate=${startOfMonth.toISOString().split('T')[0]}&endDate=${endOfMonth.toISOString().split('T')[0]}&gameType=${gameType}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) throw new Error('Failed to fetch game history');

        const games: GameSession[] = await response.json();
        
        const wins = games.filter(g => g.victory).length;
        const total = games.length;
        const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

        // Calculate streaks
        let currentStreak = 0;
        let bestStreak = 0;
        let tempStreak = 0;

        // Sort games by date (most recent first)
        const sortedGames = games.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Calculate current streak from most recent games
        for (const game of sortedGames) {
          if (game.victory) {
            currentStreak++;
          } else {
            break;
          }
        }

        // Calculate best streak
        for (const game of sortedGames.reverse()) {
          if (game.victory) {
            tempStreak++;
            bestStreak = Math.max(bestStreak, tempStreak);
          } else {
            tempStreak = 0;
          }
        }

        setStats({
          wins,
          total,
          winRate,
          currentStreak,
          bestStreak,
        });
      } catch (error) {
        console.error('Error fetching monthly stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMonthlyStats();
  }, [token, gameType]);

  if (loading) {
    return (
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <div className="animate-pulse" data-testid="loading-animation">
          <div className="h-4 bg-blue-200 rounded w-1/2 mb-2"></div>
          <div className="h-6 bg-blue-200 rounded w-1/4"></div>
        </div>
      </div>
    );
  }

  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
      <h3 className="text-sm font-semibold text-blue-800 mb-2">{currentMonth} Stats</h3>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.wins}/{stats.total}</div>
          <div className="text-blue-600">Win Rate: {stats.winRate}%</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-blue-600">
            🔥 {stats.currentStreak}
          </div>
          <div className="text-blue-600">Current Streak</div>
          {stats.bestStreak > 0 && (
            <div className="text-xs text-blue-500 mt-1">
              Best: {stats.bestStreak}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MonthlyStats;
