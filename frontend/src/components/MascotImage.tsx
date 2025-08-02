import React from 'react';

type MascotMood = 'default'|'sad'|'thinking'|'nervous'|'smug'|'victory'|'error';

export interface MascotImageProps {
  mood?: MascotMood;
  confidence?: number;
  error?: boolean;
  loading?: boolean;
}

/**
 * Maps a given mood to a URL of the corresponding mascot image.
 *
 * @param {MascotMood} mood
 * @returns {string}
 */
const moodToUrl = (mood: MascotMood) => {
  return `/bot_boy/${mood}.png`;
};

const confidenceToUrl = (confidence: number) => {
  const base = '/bot_boy/';
  if (confidence <= 2) {
    return `${base}sad.png`;
  } else if (confidence <= 4) {
    return `${base}nervous.png`;
  } else if (confidence <= 6) {
    return `${base}thinking.png`;
  } else if (confidence <= 8) {
    return `${base}smile.png`;
  } else if (confidence <= 9) {
    return `${base}confident.png`;
  }else {
    return `${base}smug.png`;
  }
}

function MascotImage({ mood, confidence, error, loading }: MascotImageProps) {
  let imageUrl = '';
  if (loading) {
    imageUrl = '/bot_boy/thinking.png';
  } else if (error) {
    imageUrl = '/bot_boy/error.png';
  } else if (mood === 'victory') {
    imageUrl = '/bot_boy/victory.png';
  } else {
    imageUrl = confidence ? confidenceToUrl(confidence) : moodToUrl(mood || 'default');
  }
  return (
    <div className="flex justify-center mb-4 max-w-50">
      <img src={imageUrl} alt="Game Boy mascot" />
    </div>
  );
}

export default MascotImage;
