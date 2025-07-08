import React from 'react';

function MascotImage({ imageSrc }) {
  return (
    <img src={imageSrc} alt="AI Mascot" id="mascot-image" className="mx-auto mb-4" />
  );
}

export default MascotImage;
