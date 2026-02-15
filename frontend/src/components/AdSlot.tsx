import React from 'react';
import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

interface AdSlotProps {
  /** 'banner' | 'rectangle' | 'vertical' | 'fluid' */
  format: 'banner' | 'rectangle' | 'vertical' | 'fluid';
  /** Unique ID for the ad placement */
  placementId: string;
  /** Optional layout for fluid ads (e.g., 'in-article') */
  adLayout?: string;
  /** Custom styles */
  className?: string;
}

const AdSlot: React.FC<AdSlotProps> = ({ format, placementId, adLayout, className = '' }) => {
  const adRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Delay ad initialization to ensure container is properly sized
    const initAd = () => {
      if (!adRef.current) return;

      // Check if the container has a valid width
      const containerWidth = adRef.current.offsetWidth;
      if (containerWidth < 100) {
        console.warn(`AdSlot container too narrow (${containerWidth}px), skipping ad initialization`);
        return;
      }

      try {
        // @ts-expect-error adsbygoogle is injected by Google AdSense script
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.error('AdSense error:', e);
      }
    };

    // Use requestAnimationFrame to ensure DOM is fully rendered
    const rafId = requestAnimationFrame(() => {
      // Add a small delay to ensure layout is settled
      setTimeout(initAd, 100);
    });

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [placementId]);

  const getStyle = (): React.CSSProperties => {
    switch (format) {
      case 'vertical':
        return { display: 'block', width: '160px', height: '600px' };
      case 'rectangle':
        return { display: 'inline-block', width: '300px', height: '250px' };
      case 'fluid':
        // Add minimum width for fluid ads to prevent zero-width errors
        return { display: 'block', textAlign: 'center', minWidth: '300px', minHeight: '100px' };
      default:
        return { display: 'block', minWidth: '320px', minHeight: '100px' };
    }
  };

  return (
    <div
      ref={adRef}
      className={`ad-slot-container p-1 bg-black border-2 border-white rounded-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${className}`}
      style={{ minWidth: '300px' }} // Ensure container itself has minimum width
    >
      <div className="text-[10px] text-gray-400 mb-1 pixel-game text-left uppercase tracking-tighter">Ads</div>
      <ins
        className="adsbygoogle"
        style={getStyle()}
        data-ad-client="ca-pub-5108380761431058"
        data-ad-slot={placementId}
        data-ad-format={format === 'fluid' ? 'fluid' : (format === 'vertical' ? 'vertical' : (format === 'rectangle' ? 'rectangle' : 'horizontal'))}
        data-ad-layout={adLayout}
        data-full-width-responsive={format === 'banner' ? 'true' : 'false'}
      ></ins>
    </div>
  );
};

export default AdSlot;
