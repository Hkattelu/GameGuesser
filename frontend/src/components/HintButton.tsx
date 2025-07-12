import { useState } from 'react';
import { getApiUrl } from '../env_utils';

export interface HintButtonProps {
  sessionId: string | null;
  token?: string;
  disabled?: boolean;
  onHintLoaded: (hintText: string) => void;
}

/**
* HintButton fetches a textual hint (developer, publisher, release year)
* for the secret game associated with the current Player-Guesses session.
*
* The backend endpoint is expected at:
*   GET /games/:sessionId/hint
* and returns JSON of the shape:
*   { developer: string, publisher: string, releaseYear: number }
*/
function HintButton({ sessionId, token, disabled, onHintLoaded }: HintButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const res = await fetch(`${getApiUrl()}/games/${sessionId}/hint`, {
        method: 'GET',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to fetch hint');
      }

      const data = (await res.json()) as {
        developer: string;
        publisher: string;
        releaseYear: number;
      };

      const text = `Developer: ${data.developer}, Publisher: ${data.publisher}, Release Year: ${data.releaseYear}`;
      onHintLoaded(text);
    } catch (err) {
      const e = err as Error;
      // In a real app we might surface this to the user via toast, but for now
      // we simply log to the console.
      // eslint-disable-next-line no-console
      console.error('HintButton error:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      id="btn-hint"
      className={`px-6 py-3 bg-purple-600 text-white font-bold rounded-lg shadow-md transition duration-200 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-75 ${
        (disabled || loading) && 'opacity-50 cursor-not-allowed'
      }`}
      onClick={handleClick}
      disabled={disabled || loading}
    >
      {loading ? 'Loading…' : 'Hint'}
    </button>
  );
}

export default HintButton;
