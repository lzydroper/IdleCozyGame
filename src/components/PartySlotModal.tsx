import React, { useState, useEffect } from 'react';
import { HEROES_CONFIG } from '../data/heroes';
import type { HeroState } from '../types/game';
import { Shield, Check, X, Lock, Wrench } from 'lucide-react';

export interface PartySlotModalProps {
  isOpen: boolean;
  targetSlotIndex: number;
  currentParty: string[];
  heroes: Record<string, HeroState>;
  onConfirm: (newParty: string[]) => void;
  onClose: () => void;
}

export const PartySlotModal: React.FC<PartySlotModalProps> = ({
  isOpen,
  targetSlotIndex,
  currentParty,
  heroes,
  onConfirm,
  onClose
}) => {
  const [draftParty, setDraftParty] = useState<string[]>([]);

  useEffect(() => {
    setDraftParty([...currentParty]);
  }, [currentParty, isOpen]);

  if (!isOpen) return null;

  const ownedHeroIds = Object.keys(heroes);

  // 整理并构建带有排序梯度的英雄列表
  const heroItems = ownedHeroIds.map((id) => {
    const config = HEROES_CONFIG[id];
    const heroState = heroes[id];

    const isCurrentSlotHero = draftParty[targetSlotIndex] === id;
    const isInLogistics = Boolean(heroState?.logisticsFacilityId);
    const isInOtherSlot = draftParty.includes(id) && !isCurrentSlotHero;
    const isDisabled = isInLogistics || isInOtherSlot;

    return {
      id,
      name: config?.name || id,
      avatar: config?.avatar,
      emoji: config?.emoji,
      heroClass: config?.heroClass || 'guardian',
      level: heroState?.level || 1,
      star: heroState?.star || 1,
      isCurrentSlotHero,
      isInLogistics,
      isInOtherSlot,
      isDisabled,
      isSelected: isCurrentSlotHero
    };
  });

  // 排序优先级：
  // 1. 当前槽位已选中 (Top)
  // 2. 可选择的空闲英雄 (Middle)
  // 3. 后勤中或处于其他槽位的禁用英雄 (最末端置底)
  heroItems.sort((a, b) => {
    if (a.isCurrentSlotHero && !b.isCurrentSlotHero) return -1;
    if (!a.isCurrentSlotHero && b.isCurrentSlotHero) return 1;

    if (!a.isDisabled && b.isDisabled) return -1;
    if (a.isDisabled && !b.isDisabled) return 1;

    return 0;
  });

  const handleToggleSelect = (id: string, isDisabled: boolean) => {
    if (isDisabled) {
      // 需求规定：后勤或已上阵的英雄点击无反应、无提示
      return;
    }

    const nextParty = [...draftParty];
    if (nextParty[targetSlotIndex] === id) {
      // 取消勾选当前英雄 (留空)
      nextParty[targetSlotIndex] = '';
    } else {
      // 勾选该英雄填入当前槽位
      nextParty[targetSlotIndex] = id;
    }

    setDraftParty(nextParty);
  };

  const handleConfirmSave = () => {
    const cleaned = draftParty.filter(Boolean);
    onConfirm(cleaned);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-zinc-900 border border-zinc-750 rounded-2xl max-w-lg w-full h-[520px] max-h-[85vh] p-4 flex flex-col shadow-2xl">
        {/* Modal 头部 */}
        <header className="flex items-center justify-between pb-3 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-black text-zinc-100">
              选择槽位 {targetSlotIndex + 1} 上阵英雄
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* 英雄网格内容区 (固定高度，支持上下滚动) */}
        <div className="flex-1 overflow-y-auto py-3 pr-1">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
            {heroItems.map((item) => {
              const firstChar = item.name ? item.name[0] : '?';

              return (
                <div
                  key={item.id}
                  onClick={() => handleToggleSelect(item.id, item.isDisabled)}
                  className={`relative flex flex-col rounded-xl overflow-hidden border transition-all select-none ${
                    item.isDisabled
                      ? 'bg-zinc-950/60 border-zinc-850 opacity-50 cursor-not-allowed'
                      : item.isSelected
                      ? 'bg-amber-950/40 border-amber-400 shadow-md shadow-amber-950/40 cursor-pointer scale-102'
                      : 'bg-zinc-950/80 border-zinc-800 hover:border-zinc-700 cursor-pointer'
                  }`}
                >
                  {/* 正方形头像区域 (Aspect Square) */}
                  <div className="aspect-square relative w-full overflow-hidden bg-zinc-900 border-b border-zinc-800/80 flex items-center justify-center">
                    {item.avatar ? (
                      <img
                        src={item.avatar}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-black text-amber-300">
                        {firstChar}
                      </span>
                    )}

                    {/* 选中遮罩与勾选图标 */}
                    {item.isSelected && (
                      <div className="absolute inset-0 bg-amber-500/25 border-2 border-amber-400 flex items-center justify-center animate-in fade-in duration-100">
                        <div className="w-8 h-8 rounded-full bg-amber-500 text-zinc-950 flex items-center justify-center shadow-lg">
                          <Check className="w-5 h-5 stroke-[3]" />
                        </div>
                      </div>
                    )}

                    {/* 禁用/锁定遮罩与状态说明 */}
                    {item.isDisabled && (
                      <div className="absolute inset-0 bg-black/75 backdrop-blur-[1px] flex flex-col items-center justify-center p-1 text-center">
                        <Lock className="w-5 h-5 text-zinc-400 mb-0.5" />
                        <span className="text-[9px] font-black text-zinc-300 bg-zinc-900/90 px-1.5 py-0.5 rounded border border-zinc-700 flex items-center gap-0.5">
                          {item.isInLogistics ? (
                            <>
                              <Wrench className="w-2.5 h-2.5 text-sky-400" /> 后勤中
                            </>
                          ) : (
                            '已上阵'
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 底部必要信息区域 */}
                  <div className="p-1.5 flex flex-col items-center justify-center gap-0.5 bg-zinc-900/90">
                    <span className="text-xs font-black text-zinc-100 truncate max-w-full">
                      {item.name}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] text-amber-400 font-bold">
                        Lv.{item.level}
                      </span>
                      <span className="text-[9px] text-amber-300 font-bold">
                        ★{item.star}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {heroItems.length === 0 && (
            <div className="py-12 text-center text-xs text-zinc-500">
              尚无可用英雄
            </div>
          )}
        </div>

        {/* 底部确认 / 取消按钮 */}
        <footer className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800 shrink-0">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-zinc-400 bg-zinc-800 hover:bg-zinc-750 transition-colors cursor-pointer"
          >
            取消
          </button>
          <button
            onClick={handleConfirmSave}
            className="px-4 py-1.5 rounded-xl text-xs font-black text-zinc-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 transition-all cursor-pointer shadow-md shadow-amber-950/40"
          >
            确认上阵
          </button>
        </footer>
      </div>
    </div>
  );
};

export default PartySlotModal;
