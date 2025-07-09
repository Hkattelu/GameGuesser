// @ts-nocheck
import React from 'react';

function MascotImage({ imageSrc }: { imageSrc: URL }) {
  return (
    <div className="flex justify-center mb-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageSrc.toString()} alt="Game Boy mascot" className="w-40 h-40" />
    </div>
  );
}

export default MascotImage;
