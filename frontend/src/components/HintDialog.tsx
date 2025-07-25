import React, { useState } from 'react';
import { getApiUrl } from '../env_utils';

type HintDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string | null;
  token?: string | null;
};

enum HintType {
  PUBLISHER = 'publisher',
  DEVELOPER = 'developer',
  RELEASE_YEAR = 'releaseYear',
  SPECIAL = 'special'
};

const HintDialog: React.FC<HintDialogProps> = ({
  isOpen,
  onClose,
  sessionId,
  token,
}) => {
  const [developer, setDeveloper] = useState<string|null>(null);
  const [publisher, setPublisher] = useState<string|null>(null);
  const [releaseYear, setReleaseYear] = useState<string|null>(null);
  const [special, setSpecial] = useState<string|null>(null);
  const [loading, setLoading] = useState(false);

  const handleRevealHint = async (hintType: HintType) => {
    if (!sessionId) return;
    setLoading(true);

    try {
      const response = await fetch(`${getApiUrl()}/player-guesses/${sessionId}/hint/${hintType}`, {
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
      switch (data.hint?.hintType) {
        case HintType.PUBLISHER:
          setPublisher(data.hint.hintText);
          break;
        case HintType.DEVELOPER:
          setDeveloper(data.hint.hintText);
          break;
        case HintType.RELEASE_YEAR:
          setReleaseYear(data.hint.hintText);
          break;
        case HintType.SPECIAL:
          setSpecial(data.hint.hintText);
          break;
        default:
          break;
      }
    } catch (error: unknown) {
      console.error(error as Error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white text-gray-900 dark:text-white dark:bg-gray-800 p-8 m-8 rounded-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4 w-80">
          <h2 className="text-2xl font-bold flex-1">Need a hint?</h2>
          <button
            onClick={onClose}
            className="cursor-pointer text-gray-400 hover:text-gray-600 text-xl font-bold"
          >
            ×
          </button>
        </div>
        <div className="flex-col">
          <div className="flex justify-between items-center mb-4">
            <div>Publisher</div>
            {publisher ? (<div>{publisher}</div>) :
            <button
              onClick={() => handleRevealHint(HintType.PUBLISHER)}
              className="cursor-pointer bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Reveal'}
            </button> }
          </div>
          <div className="flex justify-between items-center mb-4">
            <div>Developer</div>
            {developer ? (<div>{developer}</div>) :
            <button
              onClick={() => handleRevealHint(HintType.DEVELOPER)}
              className="cursor-pointer bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Reveal'}
            </button>}
          </div>
          <div className="flex justify-between items-center mb-4">
            <div>Release Year</div>
            {releaseYear ? (<div>{releaseYear}</div>) :
            <button
              onClick={() => handleRevealHint(HintType.RELEASE_YEAR)}
              className="cursor-pointer bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Reveal'}
            </button>}
          </div>
          <div className="flex justify-between items-center mb-4">
            <div>Special ✨</div>
            {special ? (<div>{special}</div>) :
            <button
              onClick={() => handleRevealHint(HintType.SPECIAL)}
              className="cursor-pointer bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Reveal'}
            </button>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HintDialog;