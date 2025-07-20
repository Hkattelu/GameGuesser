import React, { useState, useEffect } from 'react';
<<<<<<< HEAD
=======
import { getApiUrl } from '../env_utils';
import type { GameMode } from '../types';
>>>>>>> adb4e7d770617ea754c22914ae65b1500a77018c

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
<<<<<<< HEAD
  games: GameSession[];
}
const MonthlyStats: React.FC<MonthlyStatsProps> = ({ games }) => {
=======
  token: string | null;
  gameMode?: GameMode;
}

const MonthlyStats: React.FC<MonthlyStatsProps> = ({ token, gameMode = 'player-guesses' }) => {
>>>>>>> adb4e7d770617ea754c22914ae65b1500a77018c
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

  useEffect(() => {
    setStats(gamesToStats(games));
  }, [games]);

  const gamesToStats = (games: GameSession[]) => {
    const wins = games.filter(g => g.victory).length;
    const total = games.length;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

<<<<<<< HEAD
    // Calculate streaks
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;
=======
        const response = await fetch(
          `${getApiUrl()}/games/history/${gameMode}?startDate=${startOfMonth
            .toISOString()
            .split('T')[0]}&endDate=${endOfMonth.toISOString().split('T')[0]}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
>>>>>>> adb4e7d770617ea754c22914ae65b1500a77018c

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

    return {
      wins,
      total,
      winRate,
      currentStreak,
      bestStreak,
    };
  }

<<<<<<< HEAD
  if (stats.total === 0) {
=======
    fetchMonthlyStats();
  }, [token, gameMode]);

  if (loading) {
>>>>>>> adb4e7d770617ea754c22914ae65b1500a77018c
    return (
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
      <h3 className="text-sm font-semibold text-blue-800 mb-2">You haven't played this month!</h3>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
      <h3 className="text-sm font-semibold text-blue-800 mb-2">This Month's Stats</h3>
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
