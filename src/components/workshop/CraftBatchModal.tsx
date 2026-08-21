import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../../context/GameContext';
import { useToast } from '../ToastSystem';
import type { Recipe } from '../../types/config';
import { getRecipeDisplayName, getRecipeMainReward, computeMaxBatch } from '../../state/workshop';
import { ITEMS_CONFIG } from '../../data/items';
import { UI_TOKENS } from '../../data/uiConstants';
import GameIcon from '../GameIcon';
import { WORKSHOP_TOASTS } from './constants';
import { X, Zap } from 'lucide-react';

// 批量合成弹窗（ticket 04）：数量滑条 0~maxBatch（材料上限）+ 消耗/产出 ×N 预览 + 合成按钮；
// 对齐背包 ItemDetailModal 的批量使用心智；充能配方显示梦境充能次数
interface CraftBatchModalProps {
  recipe: Recipe;
  onClose: () => void;
}

const CraftBatchModal: React.FC<CraftBatchModalProps> = ({ recipe, onClose }) => {
  const { state, craftItem } = useGame();
  const { showToast } = useToast();
  const [useCount, setUseCount] = useState(0);

  const maxBatch = computeMaxBatch(state, recipe);
  const safeCount = maxBatch > 0 ? Math.min(useCount, maxBatch) : 0;

  const handleCraft = () => {
    if (safeCount <= 0) return;
    const ok = craftItem(recipe.id, safeCount);
    if (ok) {
      showToast(WORKSHOP_TOASTS.batchSuccess, 'success');
      setUseCount(0); // 弹窗停留：数量由 state 驱动刷新，计数重置
    } else {
      showToast(WORKSHOP_TOASTS.craftFail, 'error');
    }
  };

  // 实际生效预览：充能配方显示梦境充能次数；普通配方显示合成产物 ×N
  const effectText = (n: number): string => {
    if (recipe.special === 'capsule_charge') return `梦境充能 +${(recipe.capsuleAmount || 3) * n} 次`;
    const main = getRecipeMainReward(recipe);
    if (main) {
      const label = ITEMS_CONFIG[main[0]]?.name || main[0];
      return `合成 ${label} ×${main[1] * n}`;
    }
    return '';
  };

  return createPortal(
    <div data-testid="batch-modal-backdrop" onClick={onClose} className={UI_TOKENS.modalBackdrop}>
      <div
        data-testid="batch-modal-container"
        onClick={(e) => e.stopPropagation()}
        className={UI_TOKENS.modalContainerStandard}
      >
        {/* Header：配方名 + 关闭 */}
        <header className="flex items-center justify-between pb-2.5 border-b border-zinc-800 shrink-0">
          <h3 className="text-base font-black text-zinc-100 truncate">{getRecipeDisplayName(recipe)}</h3>
          <button
            onClick={onClose}
            aria-label="关闭批量合成"
            className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </header>

        {/* 预览区：消耗 ×N / 产出 ×N */}
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3 pt-4">
          <div>
            <h5 className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider mb-1">所需消耗:</h5>
            <div className="flex flex-wrap gap-1">
              {Object.entries(recipe.cost).map(([item, qty]) => (
                <span key={item} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700">
                  <GameIcon type="item" id={item} className="w-3.5 h-3.5" />
                  {ITEMS_CONFIG[item]?.name || item} x{qty * safeCount}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h5 className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
              <Zap className="w-2.5 h-2.5" /> 产出:
            </h5>
            <div className="flex flex-wrap gap-1">
              {recipe.special === 'capsule_charge' ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-950/40 text-emerald-400 border border-emerald-500/20">
                  梦境充能 +{(recipe.capsuleAmount || 3) * safeCount} 次
                </span>
              ) : (
                Object.entries(recipe.reward).map(([item, qty]) => (
                  <span key={item} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-950/40 text-emerald-400 border border-emerald-500/20">
                    <GameIcon type="item" id={item} className="w-3.5 h-3.5" />
                    {ITEMS_CONFIG[item]?.name || item} x{qty * safeCount}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 滑条 + 合成 */}
        <div className="shrink-0 border-t border-zinc-800 pt-3 mt-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-bold">合成数量</span>
            <span className="text-xs font-black text-emerald-400">{safeCount} / {maxBatch}</span>
          </div>
          <input
            data-testid="batch-count-slider"
            type="range"
            min={0}
            max={Math.max(1, maxBatch)}
            value={safeCount}
            disabled={maxBatch <= 0}
            onChange={(e) => setUseCount(Number(e.target.value))}
            className="w-full accent-emerald-500"
          />
          <p data-testid="batch-effect-text" className="text-[11px] text-zinc-300 text-center">
            {maxBatch <= 0
              ? '材料不足，无法批量合成'
              : safeCount <= 0
                ? '请选择合成数量'
                : effectText(safeCount)}
          </p>
          <button
            data-testid="batch-craft-button"
            onClick={handleCraft}
            disabled={maxBatch <= 0 || safeCount <= 0}
            className="w-full py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-extrabold text-sm rounded-xl disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95 cursor-pointer"
          >
            批量合成
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CraftBatchModal;
