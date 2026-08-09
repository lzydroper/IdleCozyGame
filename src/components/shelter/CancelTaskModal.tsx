import React from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../../context/GameContext';
import { useToast } from '../ToastSystem';
import { AUTO_RECIPES } from '../../data/autoRecipes';
import { ITEMS_CONFIG } from '../../data/items';
import { UI_TOKENS } from '../../data/uiConstants';
import GameIcon from '../GameIcon';
import { resolveDutyBonus, getBatchDiscountedCost } from '../../state/facility';
import { getRecipeDisplayName } from '../../state/workshop';
import type { FacilityType } from '../../data/facilities';
import { X, AlertTriangle } from 'lucide-react';

// 取消任务确认弹窗（issue 08 变体 B）：展示"已产出的 X 批将保留，将退还：材料 ×Y"。
// 退款 = (目标批数 − 已完成批数) × 每批折扣成本（按任务开始时刻快照，扣/退同价）。

interface CancelTaskModalProps {
  type: FacilityType;
  unitIndex: number;
  onClose: () => void;
}

const CancelTaskModal: React.FC<CancelTaskModalProps> = ({ type, unitIndex, onClose }) => {
  const { state, cancelTask, addLog } = useGame();
  const { showToast } = useToast();

  const fac = state.shelter.facilities[type]?.[unitIndex];
  if (!fac || !fac.recipeId) return null;

  const task = AUTO_RECIPES[fac.recipeId];
  const remainingBatches = Math.max(0, fac.targetCount - fac.completedCount);
  // 退款按任务开始时刻的减免快照（旧存档无快照回退当前驻守）
  const costReduction = fac.costReduction ?? resolveDutyBonus(state, type, unitIndex).bonuses.costReduction;
  const refund: Record<string, number> = {};
  if (task) {
    const perBatch = getBatchDiscountedCost({ cost: task.cost }, costReduction);
    Object.entries(perBatch).forEach(([itemId, qty]) => {
      refund[itemId] = qty * remainingBatches;
    });
  }

  const handleConfirm = () => {
    const ok = cancelTask(type, unitIndex);
    if (ok) {
      const name = task ? getRecipeDisplayName(task) : fac.recipeId!;
      showToast(`已取消 ${name}，剩余材料已退还。`, 'success');
      addLog(`取消生产 ${name}（${fac.name}${unitIndex > 0 ? ` ${unitIndex + 1}号` : ''}），退还剩余材料`, 'logistics');
      onClose();
    } else {
      showToast('取消失败：任务已结束或不存在。', 'error');
    }
  };

  return createPortal(
    <div data-testid="cancel-task-backdrop" onClick={onClose} className={UI_TOKENS.modalBackdrop}>
      <div
        data-testid="cancel-task-container"
        onClick={(e) => e.stopPropagation()}
        className={UI_TOKENS.modalContainerCompact}
      >
        {/* Header */}
        <header className={UI_TOKENS.modalHeader}>
          <div className={UI_TOKENS.modalHeaderTitle}>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <h3>取消生产任务</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="关闭取消弹窗"
            className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3 pt-3">
          {/* 当前任务 */}
          <div className="rounded-xl bg-zinc-950/60 border border-zinc-800 px-2.5 py-2 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-200 flex items-center gap-1.5">
                <GameIcon
                  type="item"
                  id={task ? Object.keys(task.reward)[0] || fac.recipeId! : fac.recipeId!}
                  className="w-3.5 h-3.5"
                />
                {task ? getRecipeDisplayName(task) : fac.recipeId}
              </span>
              <span className="text-[10px] text-zinc-400">
                已产 <span className="text-zinc-200 font-bold">{fac.completedCount}</span> / {fac.targetCount} 批
              </span>
            </div>
          </div>

          {/* 退款预览 */}
          <div className="rounded-xl bg-amber-950/20 border border-amber-700/30 px-2.5 py-2 space-y-1.5">
            <p className="text-[11px] text-amber-200 font-bold">已产出的 {fac.completedCount} 批将保留</p>
            <p className="text-[10px] text-zinc-400">将退还：</p>
            <div className="flex flex-wrap gap-1">
              {Object.keys(refund).length === 0 ? (
                <span className="text-[10px] text-zinc-600">
                  {task ? '无（无剩余批次）' : '配方已失效，无法退还'}
                </span>
              ) : (
                Object.entries(refund).map(([item, qty]) => (
                  <span key={item} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-950/40 text-amber-300 border border-amber-600/30">
                    <GameIcon type="item" id={item} className="w-3.5 h-3.5" />
                    {ITEMS_CONFIG[item]?.name || item} ×{qty}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 操作 */}
        <div className="shrink-0 border-t border-zinc-800 pt-3 mt-3 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 font-bold text-sm rounded-xl transition-all active:scale-95 cursor-pointer"
          >
            返回
          </button>
          <button
            data-testid="cancel-task-confirm"
            onClick={handleConfirm}
            className="flex-1 py-2.5 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 font-extrabold text-sm rounded-xl transition-all active:scale-95 cursor-pointer"
          >
            确认取消
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CancelTaskModal;
