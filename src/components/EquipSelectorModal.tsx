import React from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../context/GameContext';
import { useToast } from './ToastSystem';
import type { EquipmentSlot } from '../types/game';
import {
  EQUIPMENT_CONFIG,
  EQUIPMENT_SETS,
  EQUIPMENT_SLOT_LABELS,
  EQUIPMENT_SLOT_EMOJIS
} from '../data/equipment';
import { ITEMS_CONFIG } from '../data/items';
import { getEquippedItemStats } from '../state/equipment';
import { HEROES_CONFIG } from '../data/heroes';
import { X, Shield, Sword, Sparkles, PackageOpen } from 'lucide-react';

export interface EquipSelectorModalProps {
  isOpen: boolean;
  heroId: string;
  slot: EquipmentSlot;
  onClose: () => void;
  onSelectSuccess?: () => void;
}

export const EquipSelectorModal: React.FC<EquipSelectorModalProps> = ({
  isOpen,
  heroId,
  slot,
  onClose,
  onSelectSuccess
}) => {
  const { state, equipItem } = useGame();
  const { showToast } = useToast();

  if (!isOpen) return null;

  const heroConfig = HEROES_CONFIG[heroId];
  const inventory = state.inventory || {};

  // 背包中符合槽位条件的未穿戴装备候选列表
  const candidates = Object.entries(inventory)
    .filter(([itemId, qty]) => qty > 0 && EQUIPMENT_CONFIG[itemId]?.slot === slot)
    .sort(([a], [b]) => {
      const setA = EQUIPMENT_CONFIG[a]?.set || '';
      const setB = EQUIPMENT_CONFIG[b]?.set || '';
      return setA.localeCompare(setB);
    });

  const handleEquip = (itemId: string) => {
    const ok = equipItem(heroId, slot, itemId);
    if (ok) {
      const itemCfg = ITEMS_CONFIG[itemId];
      showToast(`⚔️ 【${heroConfig?.name || '英雄'}】已装备【${itemCfg?.name || itemId}】！`, 'success');
      if (onSelectSuccess) onSelectSuccess();
      onClose();
    } else {
      showToast('装备失败：背包中没有该物品或条件不符。', 'error');
    }
  };

  const getSlotIcon = () => {
    switch (slot) {
      case 'weapon': return <Sword className="w-4 h-4 text-amber-400" />;
      case 'armor': return <Shield className="w-4 h-4 text-sky-400" />;
      case 'trinket': return <Sparkles className="w-4 h-4 text-purple-400" />;
    }
  };

  const modalContent = (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[10002] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in duration-150 select-none pointer-events-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 border border-zinc-750 rounded-2xl w-[92%] max-w-[360px] max-h-[75vh] p-4 flex flex-col justify-between shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <header className="flex items-center justify-between pb-3 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            {getSlotIcon()}
            <h3 className="text-sm font-black text-zinc-100 flex items-center gap-1">
              选择{EQUIPMENT_SLOT_LABELS[slot]}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </header>

        {/* 候选装备列表 */}
        <div className="flex-1 overflow-y-auto py-3 flex flex-col gap-2 min-h-[160px] max-h-[50vh] pr-1">
          {candidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-6 gap-2 my-auto">
              <PackageOpen className="w-10 h-10 text-zinc-600 animate-pulse" />
              <p className="text-xs font-bold text-zinc-400">
                背包中暂无可用的【{EQUIPMENT_SLOT_LABELS[slot]}】
              </p>
              <p className="text-[10px] text-zinc-600 leading-relaxed max-w-[240px]">
                可以通过工坊合成、梦境探索或区域 BOSS 战掉落获取高阶装备。
              </p>
            </div>
          ) : (
            candidates.map(([itemId, qty]) => {
              const eqCfg = EQUIPMENT_CONFIG[itemId];
              const setCfg = EQUIPMENT_SETS[eqCfg.set];
              const stats = getEquippedItemStats({ itemId, enhance: 0, mythic: false }, heroConfig?.faction);

              const statSummary = [
                stats.attack ? `攻击 +${stats.attack}` : null,
                stats.defense ? `防御 +${stats.defense}` : null,
                stats.maxHp ? `生命 +${stats.maxHp}` : null
              ].filter(Boolean).join('  ');

              return (
                <div
                  key={itemId}
                  className="bg-zinc-950/70 border border-zinc-800 hover:border-amber-500/50 rounded-xl p-2.5 flex items-center justify-between gap-2 transition-all shadow-sm"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-11 h-11 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center text-xl shrink-0">
                      {ITEMS_CONFIG[itemId]?.emoji || EQUIPMENT_SLOT_EMOJIS[slot]}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-xs font-black text-amber-200 truncate">
                          {eqCfg.name}
                        </span>
                        <span className="text-[9px] font-bold text-amber-500/90 bg-amber-950/40 px-1 rounded border border-amber-500/20 shrink-0">
                          {setCfg.name}
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-zinc-400 mt-0.5 truncate">
                        {statSummary || '基础装备'}
                      </span>
                      <span className="text-[8.5px] text-zinc-500">拥有数量：×{qty}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleEquip(itemId)}
                    className="px-3 py-1.5 rounded-lg text-xs font-black text-zinc-950 bg-amber-400 hover:bg-amber-300 border border-amber-300 shadow active:scale-95 cursor-pointer shrink-0"
                  >
                    装备
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <footer className="pt-2 border-t border-zinc-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="w-full py-1.5 rounded-xl text-xs font-bold text-zinc-400 bg-zinc-800 hover:bg-zinc-700 transition-colors cursor-pointer"
          >
            取消
          </button>
        </footer>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default EquipSelectorModal;
