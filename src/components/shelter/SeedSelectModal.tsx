import React from 'react';
import { createPortal } from 'react-dom';
import { CROPS_CONFIG } from '../../data/crops';
import { UI_TOKENS } from '../../data/uiConstants';
import { Sprout, X } from 'lucide-react';
import GameIcon from '../GameIcon';

export interface SeedSelectModalProps {
  isOpen: boolean;
  title: string;
  inventory: Record<string, number>;
  onSelect: (cropId: string) => void;
  onClose: () => void;
  selectedCropId?: string | null; // 选种模式：当前选中条目高亮
}

// 统一种子选择弹窗（09）：播种与挂机选种两处共用。
// 走物品系统（条目 icon = 种子物品 GameIcon type="item"）；列表式条目：
// 种子 icon + 作物名/描述/生长时间 + 种子持有数 + 全部产出预览；
// 无种子的作物隐藏，全部无种子时显示空态；selectedCropId 高亮（选种模式）。
export const SeedSelectModal: React.FC<SeedSelectModalProps> = ({
  isOpen,
  title,
  inventory,
  onSelect,
  onClose,
  selectedCropId
}) => {
  if (!isOpen) return null;

  const availableCrops = Object.values(CROPS_CONFIG).filter(crop => {
    const seedId = Object.keys(crop.seedCost)[0];
    return (inventory[seedId] || 0) > 0;
  });

  const modalContent = (
    <div
      data-testid="seed-modal-backdrop"
      onClick={onClose}
      className={UI_TOKENS.modalBackdrop}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={UI_TOKENS.modalContainerScroll}
      >
        <header className={UI_TOKENS.modalHeader}>
          <div className={UI_TOKENS.modalHeaderTitle}>
            <Sprout className="w-4 h-4 text-purple-400" />
            <h3>{title}</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="关闭"
            className={UI_TOKENS.modalCloseButton}
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 min-h-0 space-y-2">
          {availableCrops.length === 0 ? (
            <p className="py-10 text-center text-xs text-zinc-500">暂无可用种子</p>
          ) : (
            availableCrops.map(crop => {
              const seedId = Object.keys(crop.seedCost)[0];
              const seedCount = inventory[seedId] || 0;
              const isSelected = selectedCropId === crop.id;
              return (
                <div
                  key={crop.id}
                  onClick={() => onSelect(crop.id)}
                  className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-purple-950/40 border-purple-500/60 ring-1 ring-purple-500/40'
                      : 'bg-zinc-950 border-zinc-800 hover:border-purple-500/60'
                  }`}
                >
                  <GameIcon id={seedId} type="item" className="w-7 h-7 rounded-lg" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-xs text-white truncate">{crop.name}</h4>
                      <span className="text-[10px] font-bold text-zinc-400 shrink-0">
                        种子 <span className="text-white font-mono">×{seedCount}</span>
                      </span>
                    </div>
                    <p className="text-[9px] text-zinc-500 mt-0.5 line-clamp-1">{crop.description}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[8px] text-purple-400 bg-purple-950/40 px-1.5 py-0.2 rounded">
                        生长 {crop.growthTime}s
                      </span>
                      {/* 全部产出预览：每个产出的物品 icon + 数量 */}
                      <span className="flex items-center gap-1.5">
                        {Object.entries(crop.yields).map(([itemId, qty]) => (
                          <span key={itemId} className="flex items-center gap-0.5 text-[8px] text-zinc-400">
                            <GameIcon id={itemId} type="item" className="w-3.5 h-3.5 rounded" />
                            ×{qty}
                          </span>
                        ))}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default SeedSelectModal;
