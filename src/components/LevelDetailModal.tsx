import React from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../context/GameContext';
import type { LevelConfig, DropEntry } from '../data/regions';
import { ENEMY_CONFIGS } from '../data/enemies';
import { ITEMS_CONFIG } from '../data/items';
import { isRegionUnlocked, isLevelUnlocked, getClearedLevels } from '../state/levelCombat';
import { getRegion } from '../data/regionSelectors';
import { UI_TOKENS } from '../configs/constants/uiConstants';
import { X, AlertTriangle } from 'lucide-react';

export interface LevelDetailModalProps {
  isOpen: boolean;
  regionId: string | null;
  level: LevelConfig | null;
  mode: 'active' | 'idle';
  onClose: () => void;
  onConfirm: (regionId: string, levelId: string) => void;
}

const formatDropText = (drop: DropEntry): string => {
  if (drop.kind === 'fixed') {
    const item = ITEMS_CONFIG[drop.itemId];
    return `${item?.name || drop.itemId} ×${drop.count}`;
  }
  if (drop.kind === 'chance') {
    const item = ITEMS_CONFIG[drop.itemId];
    return `${item?.name || drop.itemId} ×${drop.count} (${drop.chancePercent}%)`;
  }
  if (drop.kind === 'weighted') {
    return drop.pool.map((p) => {
      const item = ITEMS_CONFIG[p.itemId];
      return `${item?.name || p.itemId} ×${p.count}`;
    }).join(' / ');
  }
  return '—';
};

export const LevelDetailModal: React.FC<LevelDetailModalProps> = ({
  isOpen,
  regionId,
  level,
  mode,
  onClose,
  onConfirm
}) => {
  const { state } = useGame();

  if (!isOpen || !regionId || !level) return null;

  const region = getRegion(regionId);
  const regionUnlocked = isRegionUnlocked(state, regionId, 'combat');
  const clearedLevels = getClearedLevels(state);
  const isCleared = (clearedLevels[regionId] ?? []).includes(level.id);
  const isUnlockedLevel = isLevelUnlocked(state, regionId, level.id);

  const party = (state.party || []).filter((id) => !!state.heroes[id]);
  const anyWounded = party.some((id) => state.heroes[id]?.wounded);
  const stamina = Math.floor(state.stamina || 0);
  const hasStamina = stamina >= level.staminaCost;

  let lockMessage: string | null = null;
  let canConfirm = false;

  if (!regionUnlocked) {
    lockMessage = '区域待解锁，本关卡信息处于封锁状态，不可挑战或挂机。';
  } else if (mode === 'idle' && !isCleared) {
    lockMessage = '未通关此关卡，无法开启挂机。需先在「挑战」模式下通关该关卡。';
  } else if (mode === 'active' && !isUnlockedLevel) {
    lockMessage = '尚未解锁本关卡，请先通关前置关卡。';
  } else if (party.length === 0) {
    lockMessage = '小队为空，请先前往英雄页编队上阵（至少 1 名英雄）。';
  } else if (anyWounded) {
    lockMessage = '小队有重伤英雄，战斗被禁止，请先在英雄页使用纳米修复剂治愈。';
  } else if (!hasStamina) {
    lockMessage = `体力不足（当前 ${stamina} / 需 ${level.staminaCost} 点），请等待体力随时间恢复。`;
  } else {
    canConfirm = true;
  }

  return createPortal(
    <div
      data-testid="level-detail-backdrop"
      onClick={onClose}
      className={UI_TOKENS.modalBackdropChild}
    >
      <div
        data-testid="level-detail-modal"
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 border border-zinc-750 rounded-3xl w-[92%] max-w-[380px] h-[460px] max-h-[68vh] p-4 flex flex-col justify-between shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <header className="flex items-center justify-between pb-2.5 border-b border-zinc-800 shrink-0">
          <div>
            <h3 className="text-sm font-black text-zinc-100">{region ? `${region.name} · ` : ''}{level.name}</h3>
            <div className="text-xs font-bold text-rose-400 mt-0.5">
              消耗体力: {level.staminaCost} 点
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors cursor-pointer"
            aria-label="关闭"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </header>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain py-3 space-y-3">
          {/* 锁住原因与警告诊断区 */}
          {lockMessage && (
            <div
              data-testid="level-lock-alert"
              className="p-3 bg-red-950/30 border border-red-900/40 rounded-2xl text-xs text-red-300 flex items-start gap-2 leading-relaxed"
            >
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{lockMessage}</span>
            </div>
          )}

          {/* 敌方阵容 */}
          <div className="space-y-1.5">
            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider px-0.5">
              敌方阵容
            </div>
            <div className="flex flex-wrap gap-1.5 text-xs">
              {level.enemies.map((enemyId, idx) => {
                const enemy = ENEMY_CONFIGS[enemyId];
                const isBoss = enemy?.role === 'boss';
                return (
                  <span
                    key={`${enemyId}-${idx}`}
                    className={`px-2.5 py-1 rounded-xl border font-bold ${
                      isBoss
                        ? 'bg-rose-950/60 border-rose-500/50 text-rose-300'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-300'
                    }`}
                  >
                    {enemy?.name || enemyId}
                    {isBoss && <span className="text-rose-400 ml-1">[首领]</span>}
                  </span>
                );
              })}
            </div>
          </div>

          {/* 首通奖励 */}
          {level.firstClearDrops && (
            <div className="space-y-1.5">
              <div className={`text-[10px] font-bold uppercase tracking-wider px-0.5 ${
                isCleared ? 'text-zinc-500' : 'text-amber-500'
              }`}>
                {isCleared ? '首通额外奖励（已达成领取）' : '首通额外奖励'}
              </div>
              <div className="flex flex-wrap gap-1.5 text-xs">
                {level.firstClearDrops.map((drop, idx) => (
                  <span
                    key={idx}
                    className={`px-2.5 py-1 rounded-xl border font-bold ${
                      isCleared
                        ? 'border-zinc-800 bg-zinc-950 text-zinc-500 line-through opacity-70'
                        : 'border-amber-500/50 bg-amber-950/50 text-amber-300'
                    }`}
                  >
                    首通：{formatDropText(drop)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 战利品掉落 */}
          <div className="space-y-1.5">
            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider px-0.5">
              战利品掉落
            </div>
            <div className="flex flex-wrap gap-1.5 text-xs">
              {level.drops.map((drop, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-300 font-bold"
                >
                  {formatDropText(drop)}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 严格统一为【确认】（左）与【取消】（右），按钮高度 h-9.5，双按钮对称平分 flex-1 */}
        <footer className="flex gap-2 pt-3 border-t border-zinc-800 shrink-0">
          <button
            data-testid="level-detail-confirm-btn"
            onClick={() => {
              if (canConfirm) {
                onConfirm(regionId, level.id);
                onClose();
              }
            }}
            disabled={!canConfirm}
            className={`flex-1 h-9.5 text-xs font-black rounded-xl shadow flex items-center justify-center transition-all ${
              canConfirm
                ? mode === 'idle'
                  ? 'bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white cursor-pointer active:scale-98'
                  : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white cursor-pointer active:scale-98'
                : 'bg-zinc-850 border border-zinc-800 text-zinc-600 cursor-not-allowed opacity-50'
            }`}
          >
            确认
          </button>
          <button
            data-testid="level-detail-cancel-btn"
            onClick={onClose}
            className="flex-1 h-9.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl cursor-pointer flex items-center justify-center active:scale-98 transition-all"
          >
            取消
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
};

export default LevelDetailModal;
