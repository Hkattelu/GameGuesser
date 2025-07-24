import React, { useState, useEffect } from 'react';

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
  games: GameSession[];
}
const MonthlyStats: React.FC<MonthlyStatsProps> = ({ games }) => {
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

    return {
      wins,
      total,
      winRate,
      currentStreak,
      bestStreak,
    };
  }

  if (stats.total === 0) {
    return (
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
      <h3 className="text-sm font-semibold text-blue-800 mb-2">You haven't played this month!</h3>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 dark:bg-gray-800/50 rounded-lg p-4 border border-blue-200">
      <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-100 mb-2">This Month's Stats</h3>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-100">{stats.wins}/{stats.total}</div>
          <div className="text-blue-600 dark:text-blue-100">Win Rate: {stats.winRate}%</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-blue-600 dark:text-blue-100">
            🔥 {stats.currentStreak}
          </div>
          <div className="text-blue-600 dark:text-blue-100">Current Streak</div>
          {stats.bestStreak > 0 && (
            <div className="text-xs text-blue-500 dark:text-blue-100 mt-1">
              Best: {stats.bestStreak}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MonthlyStats;
