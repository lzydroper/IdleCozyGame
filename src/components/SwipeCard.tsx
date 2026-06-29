import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Cog, TestTube, Crosshair, Tent, FlaskConical, CloudLightning } from 'lucide-react';
import type { EventChoice } from '../data/realityEvents';
import type { PlayerStats } from '../types/game';
import { ITEMS_CONFIG } from '../data/items';

interface SwipeCardProps {
  title: string;
  description: string;
  imageSrc?: string;
  leftLabel?: string;
  rightLabel?: string;
  choiceA?: any;
  choiceB?: any;
  eventType?: string; // 'common' | 'danger' | 'combat' | 'welfare' | 'relic' | 'anomaly'
  playerStats?: PlayerStats;
  playerInventory?: Record<string, number>;
  hasCatherine?: boolean;
  hasBuster?: boolean;
  leftColor?: string;
  rightColor?: string;
  dreamPollution?: number;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

export const SwipeCard: React.FC<SwipeCardProps> = ({
  title,
  description,
  imageSrc,
  leftLabel = '确认',
  rightLabel = '取消',
  choiceA,
  choiceB,
  eventType = 'common',
  playerStats,
  playerInventory,
  hasCatherine = false,
  hasBuster = false,
  leftColor = 'bg-red-500/20',
  rightColor = 'bg-cyan-500/20',
  dreamPollution = 0,
  onSwipeLeft,
  onSwipeRight
}) => {
  const [dx, setDx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);

  const startX = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const threshold = 100;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (exitDirection) return;
    startX.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || exitDirection) return;
    const diff = e.touches[0].clientX - startX.current;
    const dx_visual = diff * (1 - Math.min(0.5, Math.abs(diff) / 1200));
    setDx(dx_visual);

    if (dx_visual > 20) setSwipeDirection('right');
    else if (dx_visual < -20) setSwipeDirection('left');
    else setSwipeDirection(null);
  };

  const handleTouchEnd = () => {
    if (!isDragging || exitDirection) return;
    setIsDragging(false);
    if (dx > threshold) triggerExit('right');
    else if (dx < -threshold) triggerExit('left');
    else { setDx(0); setSwipeDirection(null); }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (exitDirection) return;
    startX.current = e.clientX;
    setIsDragging(true);
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || exitDirection) return;
    const diff = e.clientX - startX.current;
    const dx_visual = diff * (1 - Math.min(0.5, Math.abs(diff) / 1200));
    setDx(dx_visual);

    if (dx_visual > 20) setSwipeDirection('right');
    else if (dx_visual < -20) setSwipeDirection('left');
    else setSwipeDirection(null);
  };

  const handleMouseUp = () => {
    if (!isDragging || exitDirection) return;
    setIsDragging(false);
    if (dx > threshold) triggerExit('right');
    else if (dx < -threshold) triggerExit('left');
    else { setDx(0); setSwipeDirection(null); }
  };

  const handleMouseLeave = () => {
    if (isDragging) handleMouseUp();
  };

  const triggerExit = (dir: 'left' | 'right') => {
    if (exitDirection) return;
    
    // Check requirements before triggering if choice is provided
    const selectedChoice = dir === 'left' ? choiceA : choiceB;
    if (selectedChoice && selectedChoice.requirements && playerInventory) {
      let reqsMet = true;
      Object.entries(selectedChoice.requirements).forEach(([item, qty]) => {
        if ((playerInventory[item] || 0) < qty) reqsMet = false;
      });
      if (!reqsMet) return; // WildernessTab will toast, we just prevent swipe trigger
    }

    setExitDirection(dir);
    setDx(dir === 'right' ? 600 : -600);
    setTimeout(() => {
      if (dir === 'left') onSwipeLeft();
      else onSwipeRight();
      setDx(0);
      setSwipeDirection(null);
      setExitDirection(null);
    }, 300);
  };

  useEffect(() => {
    setDx(0);
    setSwipeDirection(null);
    setExitDirection(null);
  }, [title, description]);

  const rotation = dx * 0.04;

  const getTypeStyles = () => {
    switch (eventType) {
      case 'danger': return { borderColor: 'border-green-500/40', shadow: 'shadow-[0_0_20px_rgba(34,197,94,0.15)]', icon: <TestTube className="w-3.5 h-3.5 text-green-400" />, label: '生化异变', color: 'text-green-400' };
      case 'combat': return { borderColor: 'border-red-500/40', shadow: 'shadow-[0_0_20px_rgba(239,68,68,0.15)]', icon: <Crosshair className="w-3.5 h-3.5 text-red-400" />, label: '废土御敌', color: 'text-red-400' };
      case 'welfare': return { borderColor: 'border-yellow-500/40', shadow: 'shadow-[0_0_20px_rgba(234,179,8,0.15)]', icon: <Tent className="w-3.5 h-3.5 text-yellow-400" />, label: '营地休整', color: 'text-yellow-400' };
      case 'relic': return { borderColor: 'border-purple-500/40', shadow: 'shadow-[0_0_20px_rgba(168,85,247,0.15)]', icon: <FlaskConical className="w-3.5 h-3.5 text-purple-400" />, label: '古代遗迹', color: 'text-purple-400' };
      case 'anomaly': return { borderColor: 'border-orange-500/40', shadow: 'shadow-[0_0_20px_rgba(249,115,22,0.15)]', icon: <CloudLightning className="w-3.5 h-3.5 text-orange-400" />, label: '异常天气', color: 'text-orange-400' };
      default: return { borderColor: 'border-zinc-500/40', shadow: 'shadow-[0_0_20px_rgba(161,161,170,0.15)]', icon: <Cog className="w-3.5 h-3.5 text-zinc-400" />, label: '废土物资', color: 'text-zinc-400' };
    }
  };

  const styles = getTypeStyles();

  // Helper to strip parenthesis from text
  const cleanActionText = (text: string) => {
    return text.replace(/\s*\(.*\)\s*/g, '');
  };

  const renderChoicePreview = (choice: any) => {
    if (!playerStats || !playerInventory) return null;
    const previews: React.ReactNode[] = [];
    
    // Requirements
    if (choice.requirements) {
      Object.entries(choice.requirements).forEach(([item, reqQty]) => {
        const itemName = ITEMS_CONFIG[item]?.name || item;
        const currentQty = playerInventory[item] || 0;
        const isMet = currentQty >= reqQty;
        previews.push(
          <div key={`req-${item}`} className={`text-[10px] flex items-center gap-1.5 ${isMet ? 'text-zinc-400' : 'text-red-500 font-bold'} whitespace-nowrap`}>
            <span>⚠️ 需 {itemName}</span>
            <span>{currentQty}/{reqQty}</span>
          </div>
        );
      });
    }

    // Stats
    if (choice.results.stats) {
      Object.entries(choice.results.stats).forEach(([stat, val]) => {
        if (val === 0) return;
        let adjustedVal = val as number;
        if (hasCatherine && adjustedVal < 0 && (stat === 'hp' || stat === 'food')) {
          adjustedVal = Math.round(adjustedVal * 0.85);
        }
        
        if (stat === 'pollution') {
          const statIcon = '🔮';
          const statColor = adjustedVal < 0 ? 'text-emerald-400' : 'text-purple-400';
          const statLabel = '污染';
          const curPollution = dreamPollution ?? 0;
          const nextPollution = Math.max(0, Math.min(100, curPollution + adjustedVal));
          previews.push(
            <div key={`stat-${stat}`} className={`text-[10px] flex items-center justify-between w-full ${statColor} whitespace-nowrap`}>
              <span className="flex items-center gap-1">{statIcon} {statLabel}</span>
              <span className="font-mono">{curPollution}➔{nextPollution} ({adjustedVal > 0 ? `+${adjustedVal}` : adjustedVal})</span>
            </div>
          );
          return;
        }

        if (stat === 'resonance') {
          const statIcon = '🌾';
          const statColor = 'text-emerald-400';
          const statLabel = '共鸣';
          previews.push(
            <div key={`stat-${stat}`} className={`text-[10px] flex items-center justify-between w-full ${statColor} whitespace-nowrap`}>
              <span className="flex items-center gap-1">{statIcon} {statLabel}</span>
              <span className="font-mono">+{adjustedVal}%</span>
            </div>
          );
          return;
        }

        const key = stat as keyof PlayerStats;
        const currentValue = playerStats[key] as number;
        if (currentValue === undefined) return;
        const nextValue = Math.max(0, Math.min(100, currentValue + adjustedVal));
        
        let statIcon = '';
        let statColor = '';
        let statLabel = '';
        switch (stat) {
          case 'hp':
            statIcon = '❤️';
            statColor = adjustedVal < 0 ? 'text-red-400' : 'text-emerald-400';
            statLabel = 'HP';
            break;
          case 'food':
            statIcon = '🍗';
            statColor = adjustedVal < 0 ? 'text-orange-400' : 'text-emerald-400';
            statLabel = '饱食';
            break;
          case 'energy':
            statIcon = '⚡';
            statColor = adjustedVal < 0 ? 'text-cyan-400' : 'text-emerald-400';
            statLabel = '魔能';
            break;
          case 'sanity':
            statIcon = '🧠';
            statColor = adjustedVal < 0 ? 'text-purple-400' : 'text-emerald-400';
            statLabel = '理智';
            break;
        }

        previews.push(
          <div key={`stat-${stat}`} className={`text-[10px] flex items-center justify-between w-full ${statColor} whitespace-nowrap`}>
            <span className="flex items-center gap-1">{statIcon} {statLabel}</span>
            <span className="font-mono">{currentValue}➔{nextValue} ({adjustedVal > 0 ? `+${adjustedVal}` : adjustedVal})</span>
          </div>
        );
      });
    }

    // Items
    if (choice.results.items) {
      Object.entries(choice.results.items).forEach(([item, qty]) => {
        let adjustedQty = qty;
        if (item === 'scrap_metal' && qty > 0 && hasBuster) {
          adjustedQty = Math.round(qty * 1.3);
        }
        if (adjustedQty === 0) return;

        const itemName = ITEMS_CONFIG[item]?.name || item;
        const isGain = adjustedQty > 0;
        previews.push(
          <div key={`item-${item}`} className={`text-[10px] flex items-center justify-between w-full ${isGain ? 'text-emerald-400 font-medium' : 'text-red-400'} whitespace-nowrap`}>
            <span>📦 {itemName}</span>
            <span>{adjustedQty > 0 ? `+${adjustedQty}` : adjustedQty}</span>
          </div>
        );
      });
    }

    return previews;
  };

  // Check if button should be visually disabled due to requirements
  const checkRequirementsMet = (choice?: EventChoice) => {
    if (!choice || !choice.requirements || !playerInventory) return true;
    let met = true;
    Object.entries(choice.requirements).forEach(([item, qty]) => {
      if ((playerInventory[item] || 0) < qty) met = false;
    });
    return met;
  };

  const reqsMetA = checkRequirementsMet(choiceA);
  const reqsMetB = checkRequirementsMet(choiceB);

  const hasDetails = !!(choiceA && choiceB && playerStats && playerInventory);

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Swipeable Card Area */}
      <div className="relative w-full aspect-[4/5] max-h-[290px] max-w-[230px] mx-auto select-none" style={{ touchAction: 'none' }}>
        <div className="absolute inset-0 bg-zinc-950 border border-zinc-900 rounded-3xl opacity-40 scale-[0.94] translate-y-2 pointer-events-none transition-transform" />
        <div className="absolute inset-0 bg-zinc-950/80 border border-zinc-900 rounded-3xl opacity-60 scale-[0.97] translate-y-1 pointer-events-none transition-transform" />
        
        <div
          ref={cardRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          className={`w-full h-full rounded-3xl border flex flex-col overflow-hidden relative backdrop-blur-md ${styles.borderColor} ${
            isDragging ? 'cursor-grabbing scale-[0.98]' : 'cursor-grab'
          } ${styles.shadow}`}
          style={{
            transform: `translateX(${dx}px) rotate(${rotation}deg)`,
            backgroundColor: 'rgba(24, 24, 27, 0.85)',
            transitionProperty: 'transform',
            transitionDuration: isDragging ? '0ms' : exitDirection ? '300ms' : '400ms',
            transitionTimingFunction: 'cubic-bezier(0.25, 1, 0.5, 1)',
          }}
        >
          {/* Badge */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-1 rounded-full border border-white/10 shadow-lg">
            {styles.icon}
            <span className={`text-[9px] font-bold tracking-widest ${styles.color}`}>{styles.label}</span>
          </div>

          {/* Scene Image */}
          {imageSrc && (
            <div className="relative h-[110px] w-full overflow-hidden shrink-0">
              <img
                src={imageSrc}
                alt="Scene"
                className="w-full h-full object-cover select-none pointer-events-none"
                style={{ filter: 'brightness(0.7) saturate(1.1)' }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#18181b]" />
            </div>
          )}

          {/* Card Body */}
          <div className="p-4 flex-1 flex flex-col justify-center items-center text-center">
            <h3 className="text-base font-black text-white mb-1.5 drop-shadow-md">{title}</h3>
            <p className="text-[11px] text-zinc-400 leading-relaxed select-none pointer-events-none">{description}</p>
          </div>

          {/* Minimal Drag Indicator Overlay */}
          {swipeDirection === 'left' && (
            <div className={`absolute inset-0 z-20 pointer-events-none flex items-center justify-center ${leftColor} opacity-100 transition-opacity`}>
              <div className="bg-black/80 text-white font-black text-xs px-3 py-1.5 rounded-xl shadow-lg border border-white/20 uppercase tracking-widest flex items-center gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5 text-red-400" /> 决定 A
              </div>
            </div>
          )}

          {swipeDirection === 'right' && (
            <div className={`absolute inset-0 z-20 pointer-events-none flex items-center justify-center ${rightColor} opacity-100 transition-opacity`}>
              <div className="bg-black/80 text-white font-black text-xs px-3 py-1.5 rounded-xl shadow-lg border border-white/20 uppercase tracking-widest flex items-center gap-1.5">
                决定 B <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Decision Buttons Area */}
      <div className="flex gap-2 justify-center max-w-[300px] mx-auto w-full px-1">
        {/* Choice A */}
        <button 
          onClick={() => triggerExit('left')}
          disabled={!reqsMetA}
          className={`flex-1 p-2.5 rounded-2xl border transition-all text-left flex flex-col gap-1.5 ${
            hasDetails ? 'min-h-[84px]' : 'justify-center h-12'
          } ${
            !reqsMetA
              ? 'bg-zinc-950/30 border-zinc-900 text-zinc-600 cursor-not-allowed opacity-50'
              : swipeDirection === 'left' 
              ? 'bg-zinc-800/80 border-red-500/60 scale-[0.98]' 
              : 'bg-zinc-900/60 border-zinc-800/80 hover:bg-zinc-800 hover:border-red-500/30'
          }`}
        >
          <span className="flex items-center gap-1 text-[8px] font-bold text-zinc-500 tracking-wider uppercase">
            <ArrowLeft className="w-2 h-2" /> 左滑/点击
          </span>
          <span className="text-[11px] font-black text-zinc-200 leading-snug">
            {choiceA ? cleanActionText(choiceA.text) : cleanActionText(leftLabel)}
          </span>
          {hasDetails && choiceA && (
            <>
              <div className="w-full border-t border-zinc-850 my-0.5" />
              <div className="flex flex-col gap-0.5 w-full">
                {renderChoicePreview(choiceA)}
              </div>
            </>
          )}
        </button>

        {/* Choice B */}
        <button 
          onClick={() => triggerExit('right')}
          disabled={!reqsMetB}
          className={`flex-1 p-2.5 rounded-2xl border transition-all text-left flex flex-col gap-1.5 ${
            hasDetails ? 'min-h-[84px]' : 'justify-center h-12'
          } ${
            !reqsMetB
              ? 'bg-zinc-950/30 border-zinc-900 text-zinc-600 cursor-not-allowed opacity-50'
              : swipeDirection === 'right' 
              ? 'bg-zinc-800/80 border-cyan-500/60 scale-[0.98]' 
              : 'bg-zinc-900/60 border-zinc-800/80 hover:bg-zinc-800 hover:border-cyan-500/30'
          }`}
        >
          <span className="flex items-center gap-1 text-[8px] font-bold text-zinc-500 tracking-wider uppercase">
            右滑/点击 <ArrowRight className="w-2 h-2" />
          </span>
          <span className="text-[11px] font-black text-zinc-200 leading-snug">
            {choiceB ? cleanActionText(choiceB.text) : cleanActionText(rightLabel)}
          </span>
          {hasDetails && choiceB && (
            <>
              <div className="w-full border-t border-zinc-850 my-0.5" />
              <div className="flex flex-col gap-0.5 w-full">
                {renderChoicePreview(choiceB)}
              </div>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
export default SwipeCard;
