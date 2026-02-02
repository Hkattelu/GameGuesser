import React, { useEffect } from 'react';

interface AdSlotProps {
  /** 'banner' | 'rectangle' */
  format: 'banner' | 'rectangle';
  /** Unique ID for the ad placement */
  placementId: string;
  /** Custom styles */
  className?: string;
}

const AdSlot: React.FC<AdSlotProps> = ({ format, placementId, className = '' }) => {
  useEffect(() => {
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error('AdSense error:', e);
    }
  }, []);

  const style = format === 'banner' 
    ? { display: 'block', minWidth: '320px', minHeight: '100px' }
    : { display: 'inline-block', width: '300px', height: '250px' };

  return (
    <div className={`ad-slot-container my-4 p-1 bg-black border-2 border-white rounded-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${className}`}>
      <div className="text-[10px] text-gray-400 mb-1 pixel-game text-left uppercase tracking-tighter">Advertisement</div>
      <ins 
        className="adsbygoogle"
        style={style}
        data-ad-client="ca-pub-5108380761431058"
        data-ad-slot={placementId}
        data-ad-format={format === 'banner' ? 'horizontal' : 'rectangle'}
        data-full-width-responsive="true"
      ></ins>
    </div>
  );
};

export default AdSlot;
