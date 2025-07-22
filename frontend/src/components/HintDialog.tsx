import React, { useState } from 'react';
import { getApiUrl } from '../env_utils';

type HintDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string | null;
  token?: string | null;
  setQuestionCount: React.Dispatch<React.SetStateAction<number>>;
  setChatHistory: React.Dispatch<React.SetStateAction<any[]>>;
};

const HintDialog: React.FC<HintDialogProps> = ({
  isOpen,
  onClose,
  sessionId,
  token,
  setQuestionCount,
  setChatHistory,
}) => {
  const [hint, setHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRevealHint = async () => {
    if (!sessionId) return;
    setLoading(true);

    try {
      const response = await fetch(`${getApiUrl()}/player-guesses/${sessionId}/hint`, {
        method: 'GET',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch hint.');
      }

      const data = await response.json();
      setHint(data.hintText);
      setQuestionCount((prev) => prev + 1);
      setChatHistory((prevHistory) => [
        ...prevHistory,
        { role: 'model', parts: [{ text: `Hint: ${data.hintText}` }] },
      ]);
    } catch (error: unknown) {
      const err = error as Error;
      setHint(`Error fetching hint: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg">
        <h2 className="text-2xl font-bold mb-4">Need a hint?</h2>
        {hint ? (
          <p className="mb-4">{hint}</p>
        ) : (
          <p className="mb-4">
            Reveal a hint below. Using a hint will count as asking one question.
          </p>
        )}
        <div className="flex justify-center gap-4">
          {!hint && (
            <button
              onClick={handleRevealHint}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Reveal Hint'}
            </button>
          )}
          <button
            onClick={onClose}
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default HintDialog;