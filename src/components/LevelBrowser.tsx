import React from 'react';
import { useGame } from '../context/GameContext';
import { getRegion } from '../state/regionSelectors';
import { ENEMY_CONFIGS } from '../configs/loaders/entities.loader';
import type { LevelConfig } from '../configs/types/region.types';

import { isRegionUnlocked, isLevelUnlocked, getClearedLevels } from '../state/levelCombat';
import { Crown } from 'lucide-react';

export interface LevelBrowserProps {
  regionId: string;
  mode: 'active' | 'idle';
  onSelectLevel: (level: LevelConfig) => void;
}

export const LevelBrowser: React.FC<LevelBrowserProps> = ({
  regionId,
  mode,
  onSelectLevel
}) => {
  const { state } = useGame();
  const region = getRegion(regionId);

  if (!region || region.levels.length === 0) {
    return (
      <div className="p-8 bg-zinc-950/40 rounded-2xl border border-zinc-900 text-xs text-zinc-500 text-center">
        该区域暂无可用关卡。
      </div>
    );
  }

  const isRegionUnlockedForCombat = isRegionUnlocked(state, region.id, 'combat');
  const clearedLevels = getClearedLevels(state);
  const clearedList = clearedLevels[region.id] ?? [];

  return (
    <div
      data-testid="level-browser-grid"
      className="grid grid-cols-3 gap-2.5"
    >
      {region.levels.map((level, index) => {
        const code = String(index + 1).padStart(2, '0');
        const isCleared = clearedList.includes(level.id);
        const isUnlocked = isLevelUnlocked(state, region.id, level.id);
        const isBossLevel = level.enemies.some((id) => ENEMY_CONFIGS[id]?.role === 'boss');

        let statusText = '未解锁';
        let statusBadgeClass = 'text-zinc-500 bg-zinc-950 border-zinc-850';
        let cardBorderClass = 'border-zinc-850 opacity-60 bg-zinc-950/40';

        if (isRegionUnlockedForCombat) {
          if (mode === 'idle') {
            if (isCleared) {
              statusText = '可挂机';
              statusBadgeClass = 'text-amber-400 bg-amber-950/50 border-amber-500/30';
              cardBorderClass = 'border-amber-500/30 hover:border-amber-500/60 bg-zinc-900/90';
            } else {
              cardBorderClass = 'border-zinc-850 opacity-60 bg-zinc-950/30';
            }
          } else {
            // mode === 'active'
            if (isCleared) {
              statusText = '已通关';
              statusBadgeClass = 'text-emerald-400 bg-emerald-950/50 border-emerald-500/30';
              cardBorderClass = 'border-emerald-500/30 hover:border-emerald-500/60 bg-zinc-900/90';
            } else if (isUnlocked) {
              statusText = '可挑战';
              statusBadgeClass = 'text-rose-300 bg-rose-950/50 border-rose-500/40';
              cardBorderClass = 'border-rose-500/40 hover:border-rose-500/70 bg-zinc-900/90';
            }
          }
        }

        return (
          <div
            key={level.id}
            data-testid={`level-card-${level.id}`}
            onClick={() => onSelectLevel(level)}
            className={`p-3 border rounded-2xl flex flex-col justify-between items-center text-center cursor-pointer transition-all active:scale-95 shadow aspect-square relative ${cardBorderClass}`}
          >
            <div className="flex items-center gap-1 text-[10px] font-mono font-black text-zinc-500">
              {isBossLevel && <Crown className="w-3 h-3 text-amber-400" />}
              <span>{code}</span>
            </div>
            <div className="text-xs font-black text-zinc-200 leading-tight px-0.5 line-clamp-2">
              {level.name}
            </div>
            <div>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${statusBadgeClass}`}>
                {statusText}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default LevelBrowser;
