import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../env_utils';
import { AI_NAME } from '../constants';

interface GameSession {
  session_id: string;
  date: string;
  game_mode: 'player-guesses' | 'ai-guesses';
  victory: boolean;
  question_count: number;
  total_questions: number;
  game_name?: string;
}

interface GameHistoryCalendarProps {
  token: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const GameHistoryCalendar: React.FC<GameHistoryCalendarProps> = ({ token, isOpen, onClose }) => {
  const [history, setHistory] = useState<GameSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    if (!token || !isOpen) return;

    const fetchGameHistory = async () => {
      try {
        const response = await fetch(`${getApiUrl()}/games/history`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) throw new Error('Failed to fetch game history');

        const data: GameSession[] = await response.json();
        setHistory(data);
      } catch (error) {
        console.error('Error fetching game history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGameHistory();
  }, [token, isOpen]);

  const getMonthlyStats = (month: Date) => {
    const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
    const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    
    const monthlyGames = history.filter(game => {
      const gameDate = new Date(game.date);
      return gameDate >= startOfMonth && gameDate <= endOfMonth;
    });

    const wins = monthlyGames.filter(g => g.victory).length;
    const total = monthlyGames.length;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

    return { wins, total, winRate, games: monthlyGames };
  };

  const getDaysInMonth = (month: Date) => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const firstDay = new Date(year, monthIndex, 1);
    const lastDay = new Date(year, monthIndex + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty days for the start of the month
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    return days;
  };

  const getGameForDate = (day: number) => {
    const dateStr = `${selectedMonth.getFullYear()}-${(selectedMonth.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    return history.find(game => game.date === dateStr);
  };

  const generateMonthlyShareText = () => {
    const { wins, total, winRate, games } = getMonthlyStats(selectedMonth);
    const monthName = selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    // Create calendar grid
    const days = getDaysInMonth(selectedMonth);
    let calendarText = '';
    
    // Add calendar grid (7 days per row)
    for (let i = 0; i < days.length; i += 7) {
      const week = days.slice(i, i + 7);
      const weekText = week.map(day => {
        if (day === null) return '⬜';
        const game = getGameForDate(day);
        if (!game) return '⬜';
        return game.victory ? '🟢' : '🔴';
      }).join('');
      calendarText += weekText + '\n';
    }

    const shareText = `🎮 ${AI_NAME}'s Arcade - ${monthName}

📊 Monthly Stats:
🏆 Won: ${wins}/${total} games (${winRate}%)
📅 Days played: ${games.length}

${calendarText.trim()}

🟢 = Win  🔴 = Loss  ⬜ = No game

Play at: ${window.location.origin}`;

    return shareText;
  };

  const handleShareMonth = async () => {
    const shareText = generateMonthlyShareText();
    
    try {
      await navigator.clipboard.writeText(shareText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      alert('Copy this text to share:\n\n' + shareText);
    }
  };

  const changeMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(selectedMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setSelectedMonth(newMonth);
  };

  if (!isOpen) return null;

  const { wins, total, winRate } = getMonthlyStats(selectedMonth);
  const monthName = selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
      <div className="relative p-6 border w-full max-w-2xl shadow-lg rounded-md bg-white mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-bold text-gray-800">Game History Calendar</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold"
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="animate-pulse" data-testid="loading-animation">
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="grid grid-cols-7 gap-2 mb-4">
              {Array.from({length: 35}).map((_, i) => (
                <div key={i} className="h-8 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Month Navigation */}
            <div className="flex justify-between items-center mb-4">
              <button
                onClick={() => changeMonth('prev')}
                className="px-3 py-1 text-gray-600 hover:text-gray-800"
              >
                ← Previous
              </button>
              <h4 className="text-lg font-semibold">{monthName}</h4>
              <button
                onClick={() => changeMonth('next')}
                className="px-3 py-1 text-gray-600 hover:text-gray-800"
              >
                Next →
              </button>
            </div>

            {/* Monthly Stats */}
            <div className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-200">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xl font-bold text-blue-600">{wins}/{total}</div>
                  <div className="text-sm text-blue-600">Games Won</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-blue-600">{winRate}%</div>
                  <div className="text-sm text-blue-600">Win Rate</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-blue-600">{total}</div>
                  <div className="text-sm text-blue-600">Days Played</div>
                </div>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2 mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                  {day}
                </div>
              ))}
              {getDaysInMonth(selectedMonth).map((day, index) => {
                if (day === null) {
                  return <div key={index} className="aspect-square"></div>;
                }
                
                const game = getGameForDate(day);
                const isToday = new Date().toDateString() === new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), day).toDateString();
                
                return (
                  <div
                    key={day}
                    className={`aspect-square flex items-center justify-center text-sm font-medium rounded-lg border ${
                      isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    } ${
                      game 
                        ? game.victory 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                        : 'bg-gray-50 text-gray-500'
                    }`}
                    title={game ? `${game.date}: ${game.victory ? 'Won' : 'Lost'} (${game.question_count}/${game.total_questions})` : ''}
                  >
                    {day}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex justify-center space-x-4 text-xs mb-4">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
                <span>Won</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
                <span>Lost</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-gray-50 border border-gray-200 rounded"></div>
                <span>No Game</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleShareMonth}
                className="flex-1 px-4 py-2 bg-blue-500 text-white font-medium rounded-md shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-colors"
              >
                {copySuccess ? '✓ Copied!' : 'Share Monthly Results'}
              </button>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-500 text-white font-medium rounded-md shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GameHistoryCalendar;
