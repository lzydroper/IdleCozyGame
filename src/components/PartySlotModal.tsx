import React, { useState, useEffect } from 'react';
import {
  HEROES_CONFIG,
  HERO_CLASS_LABELS,
  HERO_FACTION_LABELS,
  HERO_CLASS_COLORS
} from '../data/heroes';
import type { HeroState } from '../types/game';
import { Shield, User, Check, X, Lock, Wrench } from 'lucide-react';

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
      heroClass: config?.heroClass || 'guardian',
      faction: config?.faction || 'arcane',
      level: heroState?.level || 1,
      star: heroState?.star || 1,
      isCurrentSlotHero,
      isInLogistics,
      isInOtherSlot,
      isDisabled,
      isSelected: draftParty[targetSlotIndex] === id
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

    // 过滤零散字符串
    setDraftParty(nextParty);
  };

  const handleConfirmSave = () => {
    // 自动清洗空元素并返回
    const cleaned = draftParty.filter(Boolean);
    onConfirm(cleaned);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-zinc-900 border border-zinc-750 rounded-2xl max-w-md w-full p-4 flex flex-col gap-3 shadow-2xl">
        <header className="flex items-center justify-between pb-2 border-b border-zinc-800">
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

        {/* 英雄列表区 */}
        <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-1">
          {heroItems.map((item) => (
            <div
              key={item.id}
              onClick={() => handleToggleSelect(item.id, item.isDisabled)}
              className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                item.isDisabled
                  ? 'bg-zinc-950/60 border-zinc-850 opacity-40 cursor-not-allowed'
                  : item.isSelected
                  ? 'bg-amber-950/40 border-amber-500/60 cursor-pointer shadow-sm shadow-amber-950/30'
                  : 'bg-zinc-850/60 border-zinc-800 hover:border-zinc-700 cursor-pointer'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="relative w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center border border-zinc-700">
                  <User className={`w-5 h-5 ${item.isDisabled ? 'text-zinc-600' : 'text-amber-300'}`} />
                  {item.isDisabled && (
                    <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center">
                      <Lock className="w-3 h-3 text-zinc-400" />
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-black ${item.isDisabled ? 'text-zinc-500' : 'text-zinc-200'}`}>
                      {item.name}
                    </span>
                    <span className="text-[9px] text-zinc-500 font-bold">
                      Lv.{item.level}
                    </span>
                    <span className="text-[9px] text-amber-400 font-bold">
                      ★{item.star}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className={`text-[8px] font-bold px-1 rounded border ${HERO_CLASS_COLORS[item.heroClass]}`}>
                      {HERO_CLASS_LABELS[item.heroClass]}
                    </span>
                    <span className="text-[8px] font-bold px-1 rounded border border-zinc-700 bg-zinc-800 text-zinc-300">
                      {HERO_FACTION_LABELS[item.faction]}
                    </span>
                  </div>
                </div>
              </div>

              {/* 右侧勾选或禁用标记 */}
              <div className="flex items-center gap-2">
                {item.isInLogistics && (
                  <span className="text-[9px] font-bold text-sky-400 bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-500/30 flex items-center gap-1">
                    <Wrench className="w-2.5 h-2.5" /> 后勤中
                  </span>
                )}
                {item.isInOtherSlot && (
                  <span className="text-[9px] font-bold text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                    已上阵
                  </span>
                )}
                {!item.isDisabled && (
                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                      item.isSelected
                        ? 'bg-amber-500 border-amber-400 text-zinc-950 font-black'
                        : 'border-zinc-700 bg-zinc-900'
                    }`}
                  >
                    {item.isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                )}
              </div>
            </div>
          ))}

          {heroItems.length === 0 && (
            <div className="py-8 text-center text-xs text-zinc-500">
              尚无可用英雄
            </div>
          )}
        </div>

        {/* 底部确认 / 取消按钮 */}
        <footer className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-400 bg-zinc-800 hover:bg-zinc-750 transition-colors cursor-pointer"
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
