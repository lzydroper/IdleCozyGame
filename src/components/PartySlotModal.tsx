import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { HEROES_CONFIG } from '../data/heroes';
import type { HeroState } from '../types/game';
import { Shield, Check, X, Lock, Wrench, Star } from 'lucide-react';
import GameIcon from './GameIcon';

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
  // 保持与 props 同步：避免首次渲染 1 帧的 draftParty=[] 延迟导致的“全部先未锁定而后闪烁加锁”问题
  const [draftParty, setDraftParty] = useState<string[]>(currentParty);
  const [prevProps, setPrevProps] = useState({ isOpen, targetSlotIndex, currentParty });

  if (
    prevProps.isOpen !== isOpen ||
    prevProps.targetSlotIndex !== targetSlotIndex ||
    prevProps.currentParty !== currentParty
  ) {
    setPrevProps({ isOpen, targetSlotIndex, currentParty });
    setDraftParty([...currentParty]);
  }

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

  const handleConfirmSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    const cleaned = draftParty.filter(Boolean);
    onConfirm(cleaned);
    onClose();
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  const modalContent = (
    /* 使用 createPortal 渲染在 document.body 最顶层
       z-[9999] 全屏遮罩：100% 盖住顶部状态栏、底部 Tab 栏与整个视区 */
    <div
      onClick={onClose}
      className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in fade-in duration-150 select-none"
    >
      {/* 矩形主容器：尺寸放大 h-[460px] max-h-[68vh] w-[92%] max-w-[380px]，居中展示 */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 border border-zinc-750 rounded-2xl w-[92%] max-w-[380px] h-[460px] max-h-[68vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Modal 头部 */}
        <header className="flex items-center justify-between p-3.5 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <Shield className="w-4.5 h-4.5 text-amber-400" />
            <h3 className="text-base font-black text-zinc-100">
              选择槽位 {targetSlotIndex + 1} 上阵英雄
            </h3>
          </div>
          <button
            onClick={handleCancel}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </header>

        {/* 英雄网格内容区 (四周保留充足 p-3.5 边距，防止左右边框被 overflow 截断) */}
        <div className="flex-1 overflow-y-auto p-3.5">
          <div className="grid grid-cols-3 gap-3">
            {heroItems.map((item) => {
              return (
                <div
                  key={item.id}
                  onClick={() => handleToggleSelect(item.id, item.isDisabled)}
                  className={`relative flex flex-col rounded-xl overflow-hidden transition-all ${
                    item.isDisabled
                      ? 'bg-zinc-950/60 border border-zinc-850 opacity-50 cursor-not-allowed'
                      : item.isSelected
                      ? 'bg-amber-950/40 border-2 border-amber-400 shadow-md shadow-amber-950/40 cursor-pointer'
                      : 'bg-zinc-950/80 border border-zinc-800 hover:border-zinc-700 cursor-pointer'
                  }`}
                >
                  {/* 正方形头像区域 (Aspect Square) */}
                  <div className="aspect-square relative w-full overflow-hidden bg-zinc-950 border-b border-zinc-800/80 flex items-center justify-center">
                    <GameIcon type="hero" id={item.id} className="w-full h-full" />

                    {/* 选中遮罩与大号勾选图标 */}
                    {item.isSelected && (
                      <div className="absolute inset-0 bg-amber-500/30 border-2 border-amber-400 flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-amber-500 text-zinc-950 flex items-center justify-center shadow-lg">
                          <Check className="w-6.5 h-6.5 stroke-[3.5]" />
                        </div>
                      </div>
                    )}

                    {/* 禁用/锁定遮罩与状态说明（无淡入动画，直接静态即时呈现） */}
                    {item.isDisabled && (
                      <div className="absolute inset-0 bg-black/80 backdrop-blur-[1px] flex flex-col items-center justify-center p-1 text-center">
                        <Lock className="w-5 h-5 text-zinc-400 mb-1" />
                        <span className="text-xs font-black text-zinc-200 bg-zinc-900/90 px-2 py-0.5 rounded border border-zinc-700 flex items-center gap-1">
                          {item.isInLogistics ? (
                            <>
                              <Wrench className="w-3 h-3 text-sky-400" /> 后勤中
                            </>
                          ) : (
                            '已上阵'
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 底部必要信息区域 */}
                  <div className="p-2 flex flex-col items-center justify-center gap-0.5 bg-zinc-900/90">
                    <span className="text-sm font-black text-zinc-100 truncate max-w-full">
                      {item.name}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-amber-400 font-bold">
                        Lv.{item.level}
                      </span>
                      <span className="text-xs text-amber-300 font-bold">
                        <Star className="w-2.5 h-2.5 inline-block fill-amber-400 text-amber-400 mr-0.5" />{item.star}
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
      </div>

      {/* 确认与取消按钮组：居中放大，在矩形主容器外部下方 */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex items-center justify-center gap-4 pt-4 w-[92%] max-w-[380px]"
      >
        <button
          onClick={handleCancel}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold text-zinc-300 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 transition-all cursor-pointer text-center active:scale-98"
        >
          取消
        </button>
        <button
          onClick={handleConfirmSave}
          className="flex-1 py-2.5 rounded-xl text-sm font-black text-zinc-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 transition-all cursor-pointer text-center shadow-lg shadow-amber-950/50 active:scale-98"
        >
          确认上阵
        </button>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default PartySlotModal;
