import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../context/GameContext';
import { useToast } from './ToastSystem';
import { ITEMS_CONFIG } from '../data/items';
import { UI_TOKENS } from '../data/uiConstants';
import GameIcon from './GameIcon';
import { X } from 'lucide-react';
import type { PlayerStats } from '../types/game';

interface ItemDetailModalProps {
  itemId: string;
  onClose: () => void;
}

// 属性名 → 最大属性字段 / 显示标签（ADR-0016）
const STAT_MAX_KEY: Record<string, keyof PlayerStats> = {
  food: 'maxFood',
  energy: 'maxEnergy',
  sanity: 'maxSanity',
};
const STAT_LABEL: Record<string, string> = {
  food: '饱食度',
  energy: '魔能',
  sanity: '理智',
};

// 物品详情弹窗（ADR-0016）：固定尺寸（复用 UI_TOKENS.modalContainerStandard），
// 展示图标/名称/持有数量/介绍；恢复类道具（useEffect.stats）显示使用滑条，
// 上限 = min(拥有数, 主效果属性剩余容量可支撑次数)，显示实际生效值（含封顶）。
const ItemDetailModal: React.FC<ItemDetailModalProps> = ({ itemId, onClose }) => {
  const { state, supplyItem } = useGame();
  const { showToast } = useToast();
  const [useCount, setUseCount] = useState(1);

  const meta = ITEMS_CONFIG[itemId];
  const qty = state.inventory[itemId] || 0;
  const statsEffect = meta?.useEffect?.stats;
  const pollutionEffect = meta?.useEffect?.pollution;
  const capsuleEffect = meta?.useEffect?.capsuleCharge;
  const isRestorative = !!statsEffect && Object.keys(statsEffect).length > 0;
  const isCapsule = !!capsuleEffect && Object.keys(capsuleEffect).length > 0;
  const hasUseArea = isRestorative || isCapsule;

  const name = meta?.name || itemId;
  const description = meta?.description || '';

  // 滑条上限：恢复类 = min(拥有数, 主效果容量)；充能类 = 拥有数（无属性封顶，ADR-0016）
  let maxUse = qty;
  const mainEntry = isRestorative && statsEffect ? Object.entries(statsEffect)[0] : undefined;
  if (mainEntry) {
    const [stat, val] = mainEntry;
    if (val > 0) {
      const current = state.player[stat as keyof PlayerStats] as number;
      const max = state.player[STAT_MAX_KEY[stat]] as number;
      const capacity = Math.max(0, Math.ceil((max - current) / val));
      maxUse = Math.min(maxUse, capacity);
    }
  }
  const safeCount = maxUse > 0 ? Math.min(useCount, maxUse) : 0;

  // 实际生效值（含封顶）：如 81/100 + 30 → +19（已满 100）；胶囊显示梦境充能次数
  const effectText = (n: number): string => {
    if (isCapsule) return `梦境充能 +${n} 次`;
    const parts: string[] = [];
    if (statsEffect) {
      for (const [stat, val] of Object.entries(statsEffect)) {
        const current = state.player[stat as keyof PlayerStats] as number;
        const max = state.player[STAT_MAX_KEY[stat]] as number;
        const rawTarget = current + val * n;
        const target = val > 0 ? Math.min(max, rawTarget) : Math.max(0, rawTarget);
        const delta = target - current;
        const capped = target !== rawTarget;
        parts.push(`${STAT_LABEL[stat] ?? stat} ${delta > 0 ? '+' : ''}${delta}${capped ? '（已满）' : ''}`);
      }
    }
    if (pollutionEffect !== undefined) {
      const current = state.exploration.dreamPollution;
      const rawTarget = current + pollutionEffect * n;
      const target = Math.max(0, rawTarget);
      const delta = target - current;
      const capped = target !== rawTarget;
      parts.push(`污染 ${delta}${capped ? '（已为 0）' : ''}`);
    }
    return parts.join('｜');
  };

  const handleUse = () => {
    if (maxUse <= 0 || safeCount <= 0) return;
    const ok = supplyItem(itemId, safeCount);
    if (ok) showToast(`使用 ${safeCount} 个${name}成功`, 'success');
    // 弹窗停留：数量/滑条由 state 驱动实时更新，计数重置为 1
    setUseCount(1);
  };

  return createPortal(
    <div
      data-testid="item-detail-backdrop"
      onClick={onClose}
      className={UI_TOKENS.modalBackdrop}
    >
      <div
        data-testid="item-detail-container"
        onClick={(e) => e.stopPropagation()}
        className={UI_TOKENS.modalContainerStandard}
      >
        {/* Header：物品名 + 关闭 */}
        <header className="flex items-center justify-between pb-2.5 border-b border-zinc-800 shrink-0">
          <h3 className="text-base font-black text-zinc-100 truncate">{name}</h3>
          <button
            onClick={onClose}
            aria-label="关闭详情"
            className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </header>

        {/* 内容区：大图标 + 持有数量 + 描述（可滚动） */}
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center gap-3">
          <GameIcon type="item" id={itemId} className="w-16 h-16" />
          <span className="text-[10px] font-black text-emerald-400 bg-zinc-900/90 border border-zinc-850 px-2 py-0.5 rounded-md">
            持有 ×{qty}
          </span>
          <p className="text-[11px] text-zinc-300 leading-relaxed text-center px-2">
            {description || '暂无介绍'}
          </p>
        </div>

        {/* 使用区：恢复类/充能类道具显示滑条 + 效果预览 + 使用按钮（ticket 03/04） */}
        {hasUseArea ? (
          <div className="shrink-0 border-t border-zinc-800 pt-3 mt-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-400 font-bold">使用数量</span>
              <span className="text-[10px] font-black text-emerald-400">{safeCount} / {maxUse}</span>
            </div>
            <input
              data-testid="use-count-slider"
              type="range"
              min={1}
              max={Math.max(1, maxUse)}
              value={safeCount}
              disabled={maxUse <= 0}
              onChange={(e) => setUseCount(Number(e.target.value))}
              className="w-full accent-emerald-500"
            />
            <p data-testid="use-effect-text" className="text-[10px] text-zinc-300 text-center">
              {qty <= 0 ? '物品已用完' : !isCapsule && maxUse <= 0 ? '属性已满，无法使用' : effectText(safeCount)}
            </p>
            <button
              data-testid="use-item-button"
              onClick={handleUse}
              disabled={maxUse <= 0}
              className="w-full py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-extrabold text-xs rounded-xl disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95 cursor-pointer"
            >
              使用 ×{safeCount}
            </button>
          </div>
        ) : (
          <div className="shrink-0" />
        )}
      </div>
    </div>,
    document.body
  );
};

export default ItemDetailModal;
