import React from 'react';
import { createPortal } from 'react-dom';
import { HEROES_CONFIG } from '../data/heroes';
import { X, Users, Star } from 'lucide-react';
import GameIcon from './GameIcon';
import type { HeroState } from '../types/game';

export interface HeroListModalProps {
  isOpen: boolean;
  heroes: Record<string, HeroState>;
  onSelectHero: (heroId: string) => void;
  onClose: () => void;
}

export const HeroListModal: React.FC<HeroListModalProps> = ({
  isOpen,
  heroes,
  onSelectHero,
  onClose
}) => {
  if (!isOpen) return null;

  const heroIds = Object.keys(heroes);

  const modalContent = (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in fade-in duration-150 select-none"
    >
      {/* 必须复用 PartySlotModal 的固定宽高尺寸标准: h-[460px] max-h-[68vh] w-[92%] max-w-[380px] */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 border border-zinc-750 rounded-2xl w-[92%] max-w-[380px] h-[460px] max-h-[68vh] p-4 flex flex-col gap-3 shadow-2xl overflow-hidden"
      >
        {/* 顶部 Header */}
        <header className="flex items-center justify-between pb-2.5 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-black text-zinc-100">
              英雄列表（已解锁 {heroIds.length} 位）
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </header>

        {/* 内部可滑动区域: flex-1 overflow-y-auto 多列 3 槽 Hero Card 网格 */}
        <div className="flex-1 overflow-y-auto grid grid-cols-3 gap-2.5 p-1 align-content-start">
          {heroIds.map((id) => {
            const config = HEROES_CONFIG[id];
            const hero = heroes[id];
            if (!config || !hero) return null;

            return (
              <div
                key={id}
                data-testid={`hero-card-${id}`}
                onClick={() => onSelectHero(id)}
                className="flex flex-col items-center gap-1 cursor-pointer group transition-transform active:scale-95"
              >
                {/* 必须为正方形 1:1 头像框 */}
                <div className="w-18 h-18 aspect-square rounded-2xl bg-zinc-950 border border-zinc-800 group-hover:border-amber-500/60 flex items-center justify-center relative overflow-hidden transition-all shadow-md">
                  <GameIcon type="hero" id={config.id} className="w-full h-full" />

                  {hero.wounded && (
                    <div className="absolute inset-0 bg-red-950/75 flex items-center justify-center">
                      <span className="text-[9px] font-black text-red-300">重伤</span>
                    </div>
                  )}

                  {hero.logisticsFacilityId && !hero.wounded && (
                    <div className="absolute top-1 left-1 bg-sky-950/90 text-sky-300 text-[7px] font-black px-1 rounded border border-sky-500/40">
                      后勤
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-center text-center">
                  <span className="text-[11px] font-black text-zinc-200 group-hover:text-amber-300 transition-colors truncate max-w-[70px]">
                    {config.name}
                  </span>
                  <div className="flex items-center gap-1 text-[8px] text-amber-400 font-bold">
                    <span>Lv.{hero.level}</span>
                    <span><Star className="w-3 h-3 inline-block fill-amber-400 text-amber-400 mr-0.5" />{hero.star}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default HeroListModal;
