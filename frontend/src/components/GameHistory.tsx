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

interface GameHistoryProps {
  token: string | null;
  isOpen: boolean;
  onClose: () => void;
  gameType?: GameMode;
}

const GameHistory: React.FC<GameHistoryProps> = ({ token, isOpen, onClose, gameType = 'player-guesses' }) => {
  const [history, setHistory] = useState<GameSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    const fetchGameHistory = async () => {
      try {
        const response = await fetch(`${getApiUrl()}/games/history?gameType=${gameType}`, {
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
  }, [token, gameType]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center">
      <div className="relative p-6 border w-full max-w-lg shadow-lg rounded-md bg-white mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-bold text-gray-800">Game History</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold"
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6 mb-2"></div>
          </div>
        ) : (
          <div className="overflow-y-scroll max-h-96">
            <ul className="divide-y divide-gray-200">
              {history.map((session) => (
                <li key={session.session_id} className="py-4">
                  <div className="flex justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {session.date} - {session.game_mode.replace('-', ' ').toUpperCase()}
                      </div>
                      <div className="text-sm text-gray-500">
                        {session.question_count}/{session.total_questions} questions used
                      </div>
                    </div>
                    <div className={session.victory ? 'text-green-600' : 'text-red-600'}>
                      {session.victory ? 'Win' : 'Loss'}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-gray-500 text-white font-medium rounded-md shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-colors mt-4"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default GameHistory;

