import React from 'react';

type MascotMood = 'default'|'sad'|'thinking';

export interface MascotImageProps {
  mood: MascotMood;
}

/**
 * Maps a given mood to a URL of the corresponding mascot image.
 *
 * @param {MascotMood} mood
 * @returns {string}
 */
const moodToUrl = (mood: MascotMood) => {
  const base = '/bot_boy/';
  switch (mood) {
    case 'default':
      return `${base}guy.png`;
    case 'sad':
      return `${base}sadge.png`;
    case 'thinking':
      return `${base}thinking.png`;
    default:
      return '';
  }
};

function MascotImage({ mood }: MascotImageProps) {
  return (
    <div className="flex justify-center mb-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={moodToUrl(mood)} alt="Game Boy mascot" className="w-40 h-40" />
    </div>
  );
}

export default MascotImage;
