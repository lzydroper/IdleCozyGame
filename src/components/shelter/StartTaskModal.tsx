import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../../context/GameContext';
import { useToast } from '../ToastSystem';
import { AUTO_RECIPES } from '../../data/autoRecipes';
import { ITEMS_CONFIG } from '../../data/items';
import { UI_TOKENS } from '../../data/uiConstants';
import GameIcon from '../GameIcon';
import { getActualDuration, resolveDutyBonus, getMaxAffordableBatches, getBatchDiscountedCost } from '../../state/facility';
import { getRecipeName, getRecipeDisplayName } from '../../state/workshop';
import { formatDuration } from '../../utils/gameUtils';
import type { FacilityType } from '../../data/facilities';
import { X, Zap, Hammer } from 'lucide-react';

// 生产弹窗（issue 08 变体 B）：配方选择 + 批次滑条（上限 = floor(材料 / 每批折扣成本)）
// + 消耗 ×N / 产出 ×N 预览（每批产出含驻守产量加成）+「开始生产（扣除全部材料）」。
// 对齐工坊批量合成（CraftBatchModal）心智；开始成功即扣全部材料（state/facility.startTaskUpdate）。

interface StartTaskModalProps {
  type: FacilityType;
  unitIndex: number;
  onClose: () => void;
}

const StartTaskModal: React.FC<StartTaskModalProps> = ({ type, unitIndex, onClose }) => {
  const { state, startTask, addLog } = useGame();
  const { showToast } = useToast();

  const recipes = Object.values(AUTO_RECIPES).filter(r => r.facilityId === type);
  const [recipeId, setRecipeId] = useState<string>(recipes[0]?.id ?? '');
  const [count, setCount] = useState(0);

  const fac = state.shelter.facilities[type]?.[unitIndex];
  if (!fac) return null;

  const level = fac.level || 1;
  const recipe = recipeId ? AUTO_RECIPES[recipeId] : null;
  const { bonuses } = resolveDutyBonus(state, type, unitIndex);
  const costReduction = bonuses.costReduction;
  const yieldMult = bonuses.yieldMultiplier;
  const speedMult = bonuses.speedMultiplier;

  const maxBatch = recipe ? getMaxAffordableBatches(recipe.id, state.inventory, costReduction) : 0;
  const safeCount = Math.max(0, Math.min(count, maxBatch));
  const cycleTime = recipe ? getActualDuration(recipe.id, level, speedMult) : 0;

  // 每批折扣消耗（与开始任务扣料同价）与加成产出
  const perBatchCost = recipe ? getBatchDiscountedCost({ cost: recipe.cost }, costReduction) : {};
  const rewardPerBatch: Record<string, number> = {};
  if (recipe) {
    Object.entries(recipe.reward).forEach(([itemId, qty]) => {
      rewardPerBatch[itemId] = Math.floor(qty * (1 + yieldMult));
    });
  }

  const handleStart = () => {
    if (!recipe || safeCount <= 0) return;
    const ok = startTask(type, unitIndex, recipe.id, safeCount);
    if (ok) {
      showToast(`已开始生产 ${getRecipeName(recipe)} ×${safeCount} 批，材料已扣除。`, 'success');
      addLog(`开始生产 ${getRecipeName(recipe)} ×${safeCount} 批（${fac.name}${unitIndex > 0 ? ` ${unitIndex + 1}号` : ''}）`, 'logistics');
      onClose();
    } else {
      showToast('无法开始生产：材料不足或任务进行中。', 'error');
    }
  };

  return createPortal(
    <div data-testid="start-task-backdrop" onClick={onClose} className={UI_TOKENS.modalBackdrop}>
      <div
        data-testid="start-task-container"
        onClick={(e) => e.stopPropagation()}
        className={UI_TOKENS.modalContainerStandard}
      >
        {/* Header */}
        <header className={UI_TOKENS.modalHeader}>
          <div className={UI_TOKENS.modalHeaderTitle}>
            <Hammer className="w-4 h-4 text-cyan-400" />
            <h3>开始生产 · {fac.name}</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="关闭生产弹窗"
            className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </header>

        {/* 配方选择 + 滑条 */}
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3 pt-3">
          <div>
            <h5 className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider mb-1">选择配方</h5>
            <select
              data-testid="start-task-recipe-select"
              value={recipeId}
              onChange={(e) => { setRecipeId(e.target.value); setCount(0); }}
              className="w-full bg-zinc-900 border border-zinc-700/60 text-zinc-300 px-2.5 py-2 rounded-xl outline-none text-xs focus:border-cyan-500/50 transition-colors"
            >
              {recipes.map((r) => (
                <option key={r.id} value={r.id}>
                  {getRecipeDisplayName(r)}（每批 {getActualDuration(r.id, level, speedMult)}s）
                </option>
              ))}
            </select>
          </div>

          {recipe && (
            <>
              {/* 消耗/产出预览（×N） */}
              <div>
                <h5 className="text-[9px] text-rose-500 font-bold uppercase tracking-wider mb-1">每批消耗（含驻守减免）:</h5>
                <div className="flex flex-wrap gap-1">
                  {Object.keys(perBatchCost).length === 0 ? (
                    <span className="text-[10px] text-zinc-600">无</span>
                  ) : (
                    Object.entries(perBatchCost).map(([item, qty]) => (
                      <span key={item} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700">
                        <GameIcon type="item" id={item} className="w-3.5 h-3.5" />
                        {ITEMS_CONFIG[item]?.name || item} ×{qty * safeCount}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div>
                <h5 className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5" /> 产出（含驻守加成）:
                </h5>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(rewardPerBatch).map(([item, qty]) => (
                    <span key={item} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-950/40 text-emerald-400 border border-emerald-500/20">
                      <GameIcon type="item" id={item} className="w-3.5 h-3.5" />
                      {ITEMS_CONFIG[item]?.name || item} ×{qty * safeCount}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* 滑条 + 开始 */}
        <div className="shrink-0 border-t border-zinc-800 pt-3 mt-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-bold">生产批次</span>
            <span className="text-xs font-black text-cyan-400">{safeCount} / {maxBatch}</span>
          </div>
          {/* 每批耗时与预期总耗时（issue 08 bugfix：选生产时显示预期时间） */}
          <div className="flex items-center justify-between text-[10px] text-zinc-400 px-0.5">
            <span>每批耗时 {formatDuration(cycleTime)}</span>
            <span>预计总耗时 {safeCount > 0 ? formatDuration(cycleTime * safeCount) : '—'}</span>
          </div>
          <input
            data-testid="start-task-slider"
            type="range"
            min={0}
            max={Math.max(1, maxBatch)}
            value={safeCount}
            disabled={maxBatch <= 0}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-full accent-cyan-500"
          />
          <p data-testid="start-task-hint" className="text-[11px] text-zinc-300 text-center">
            {maxBatch <= 0
              ? '材料不足，无法开始生产'
              : safeCount <= 0
                ? '请选择生产批次'
                : `将扣除全部材料，逐批生产 ${getRecipeName(recipe!)} ×${safeCount} 批`}
          </p>
          <button
            data-testid="start-task-button"
            onClick={handleStart}
            disabled={maxBatch <= 0 || safeCount <= 0}
            className="w-full py-2.5 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 font-extrabold text-sm rounded-xl disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95 cursor-pointer"
          >
            开始生产（扣除全部材料）
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default StartTaskModal;
