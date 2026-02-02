import React, { useEffect } from 'react';

interface AdSlotProps {
  /** 'banner' | 'rectangle' | 'vertical' */
  format: 'banner' | 'rectangle' | 'vertical';
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

  const getStyle = () => {
    switch (format) {
      case 'vertical':
        return { display: 'block', width: '160px', height: '600px' };
      case 'rectangle':
        return { display: 'inline-block', width: '300px', height: '250px' };
      default:
        return { display: 'block', minWidth: '320px', minHeight: '100px' };
    }
  };

  return (
    <div className={`ad-slot-container p-1 bg-black border-2 border-white rounded-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${className}`}>
      <div className="text-[10px] text-gray-400 mb-1 pixel-game text-left uppercase tracking-tighter">Ads</div>
      <ins 
        className="adsbygoogle"
        style={getStyle()}
        data-ad-client="ca-pub-5108380761431058"
        data-ad-slot={placementId}
        data-ad-format={format === 'vertical' ? 'vertical' : (format === 'rectangle' ? 'rectangle' : 'horizontal')}
        data-full-width-responsive={format === 'banner' ? 'true' : 'false'}
      ></ins>
    </div>
  );
};

export default AdSlot;
