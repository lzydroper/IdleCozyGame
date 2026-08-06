import React from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../context/GameContext';
import { ITEMS_CONFIG } from '../data/items';
import { UI_TOKENS } from '../data/uiConstants';
import GameIcon from './GameIcon';
import { X } from 'lucide-react';

interface ItemDetailModalProps {
  itemId: string;
  onClose: () => void;
}

// 物品详情弹窗（ADR-0016）：固定尺寸（复用 UI_TOKENS.modalContainerStandard），
// 展示图标/名称/持有数量/介绍，描述区可滚动；使用区由后续票据按类型接入。
const ItemDetailModal: React.FC<ItemDetailModalProps> = ({ itemId, onClose }) => {
  const { state } = useGame();
  const meta = ITEMS_CONFIG[itemId];
  const qty = state.inventory[itemId] || 0;

  const name = meta?.name || itemId;
  const description = meta?.description || '';

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

        {/* 底部占位（使用区由 ticket 03/04/05 按类型接入） */}
        <div className="shrink-0" />
      </div>
    </div>,
    document.body
  );
};

export default ItemDetailModal;
