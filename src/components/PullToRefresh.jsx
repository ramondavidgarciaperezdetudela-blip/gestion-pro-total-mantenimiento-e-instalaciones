import React, { useRef, useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

const THRESHOLD = 72;

export default function PullToRefresh({ onRefresh, children }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e) => {
      if (window.scrollY === 0) {
        startY.current = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e) => {
      if (startY.current === null || refreshing) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta > 0 && window.scrollY === 0) {
        e.preventDefault();
        setPullDistance(Math.min(delta * 0.5, THRESHOLD + 20));
      }
    };

    const onTouchEnd = async () => {
      if (pullDistance >= THRESHOLD && !refreshing) {
        setRefreshing(true);
        setPullDistance(THRESHOLD);
        await onRefresh();
        setRefreshing(false);
      }
      setPullDistance(0);
      startY.current = null;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [pullDistance, refreshing, onRefresh]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const isReady = pullDistance >= THRESHOLD;

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Indicator */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: `translateX(-50%) translateY(${pullDistance - 48}px)`,
          zIndex: 50,
          transition: refreshing ? 'none' : 'none',
          pointerEvents: 'none',
        }}
      >
        <div
          className={`flex items-center justify-center w-10 h-10 rounded-full shadow-md border ${
            isReady ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-200'
          } transition-colors`}
        >
          <RefreshCw
            className={`w-5 h-5 transition-colors ${isReady ? 'text-white' : 'text-gray-400'} ${refreshing ? 'animate-spin' : ''}`}
            style={{ transform: `rotate(${progress * 360}deg)` }}
          />
        </div>
      </div>

      {/* Content offset when pulling */}
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: pullDistance === 0 && !refreshing ? 'transform 0.3s ease' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
}