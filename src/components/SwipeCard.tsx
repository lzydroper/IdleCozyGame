import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface SwipeCardProps {
  title: string;
  description: string;
  imageSrc?: string;
  leftLabel: string;
  rightLabel: string;
  leftColor?: string; // e.g. 'bg-red-500/25'
  rightColor?: string; // e.g. 'bg-cyan-500/25'
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

export const SwipeCard: React.FC<SwipeCardProps> = ({
  title,
  description,
  imageSrc,
  leftLabel,
  rightLabel,
  leftColor = 'bg-red-500/20',
  rightColor = 'bg-cyan-500/20',
  onSwipeLeft,
  onSwipeRight
}) => {
  const [dx, setDx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);

  const startX = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const threshold = 100; // threshold in pixels to trigger swipe

  // Handle touch start
  const handleTouchStart = (e: React.TouchEvent) => {
    if (exitDirection) return;
    startX.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  // Handle touch move
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || exitDirection) return;
    const diff = e.touches[0].clientX - startX.current;
    setDx(diff);

    if (diff > 20) {
      setSwipeDirection('right');
    } else if (diff < -20) {
      setSwipeDirection('left');
    } else {
      setSwipeDirection(null);
    }
  };

  // Handle touch end
  const handleTouchEnd = () => {
    if (!isDragging || exitDirection) return;
    setIsDragging(false);

    if (dx > threshold) {
      triggerExit('right');
    } else if (dx < -threshold) {
      triggerExit('left');
    } else {
      setDx(0);
      setSwipeDirection(null);
    }
  };

  // Mouse drag start
  const handleMouseDown = (e: React.MouseEvent) => {
    if (exitDirection) return;
    startX.current = e.clientX;
    setIsDragging(true);
    e.preventDefault();
  };

  // Mouse drag move
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || exitDirection) return;
    const diff = e.clientX - startX.current;
    setDx(diff);

    if (diff > 20) {
      setSwipeDirection('right');
    } else if (diff < -20) {
      setSwipeDirection('left');
    } else {
      setSwipeDirection(null);
    }
  };

  // Mouse drag end
  const handleMouseUp = () => {
    if (!isDragging || exitDirection) return;
    setIsDragging(false);

    if (dx > threshold) {
      triggerExit('right');
    } else if (dx < -threshold) {
      triggerExit('left');
    } else {
      setDx(0);
      setSwipeDirection(null);
    }
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      handleMouseUp();
    }
  };

  const triggerExit = (dir: 'left' | 'right') => {
    setExitDirection(dir);
    // Animate card flying off screen
    setDx(dir === 'right' ? 600 : -600);
    setTimeout(() => {
      if (dir === 'left') {
        onSwipeLeft();
      } else {
        onSwipeRight();
      }
      // Reset state for new card
      setDx(0);
      setSwipeDirection(null);
      setExitDirection(null);
    }, 300);
  };

  // Reset offset when card content changes
  useEffect(() => {
    setDx(0);
    setSwipeDirection(null);
    setExitDirection(null);
  }, [title, description]);

  // Compute rotation angle and opacity based on dragging offset
  const rotation = dx * 0.05;
  const opacityRatio = Math.min(1, Math.abs(dx) / threshold);

  return (
    <div className="relative w-full select-none" style={{ touchAction: 'none' }}>
      {/* Background hint decorations */}
      <div className="absolute inset-0 bg-zinc-950 border border-zinc-900 rounded-3xl opacity-40 scale-[0.96] -translate-y-2 pointer-events-none transition-transform" />
      
      <div
        ref={cardRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        className={`w-full rounded-3xl border transition-all duration-100 flex flex-col overflow-hidden relative ${
          isDragging ? 'cursor-grabbing scale-[0.98]' : 'cursor-grab'
        } ${
          exitDirection
            ? 'transition-all duration-300 ease-out'
            : isDragging
            ? ''
            : 'transition-all duration-205 ease-out'
        } ${
          swipeDirection === 'left'
            ? 'border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.1)]'
            : swipeDirection === 'right'
            ? 'border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.1)]'
            : 'bg-zinc-900 border-zinc-800 shadow-xl'
        }`}
        style={{
          transform: `translateX(${dx}px) rotate(${rotation}deg)`,
          backgroundColor: '#18181b', // fallback bg color
        }}
      >
        {/* Swipe choice overlays */}
        {swipeDirection === 'left' && (
          <div
            className={`absolute inset-0 z-20 pointer-events-none flex items-center justify-center ${leftColor}`}
            style={{ opacity: opacityRatio }}
          >
            <div className="bg-red-600/90 text-white font-black text-xs px-4 py-2 rounded-xl shadow-lg border border-red-500 uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
              <ArrowLeft className="w-4 h-4" /> {leftLabel}
            </div>
          </div>
        )}

        {swipeDirection === 'right' && (
          <div
            className={`absolute inset-0 z-20 pointer-events-none flex items-center justify-center ${rightColor}`}
            style={{ opacity: opacityRatio }}
          >
            <div className="bg-cyan-600/90 text-white font-black text-xs px-4 py-2 rounded-xl shadow-lg border border-cyan-500 uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
              {rightLabel} <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        )}

        {/* Scene Image */}
        {imageSrc && (
          <div className="relative h-32 w-full overflow-hidden shrink-0">
            <img
              src={imageSrc}
              alt="Scene Illustration"
              className="w-full h-full object-cover select-none pointer-events-none"
              style={{ filter: 'brightness(0.6) saturate(1.2)' }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-zinc-900" />
            <div className="absolute bottom-3 left-4">
              <h3 className="text-base font-black text-white leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{title}</h3>
            </div>
          </div>
        )}

        {/* Card Body */}
        <div className="p-5 flex-1 flex flex-col justify-between min-h-[120px]">
          {!imageSrc && (
            <h3 className="text-base font-black text-white mb-2">{title}</h3>
          )}
          <p className="text-[11px] text-zinc-400 leading-relaxed text-left flex-1 select-none pointer-events-none">{description}</p>
          
          {/* Action indicator at bottom */}
          <div className="mt-4 flex items-center justify-between text-[8px] font-bold text-zinc-600 tracking-wider border-t border-zinc-800/40 pt-2.5">
            <span className="flex items-center gap-0.5"><ArrowLeft className="w-2.5 h-2.5 text-red-500/50" /> {leftLabel} (左滑)</span>
            <span className="flex items-center gap-0.5">{rightLabel} (右滑) <ArrowRight className="w-2.5 h-2.5 text-cyan-500/50" /></span>
          </div>
        </div>
      </div>
    </div>
  );
};
export default SwipeCard;
