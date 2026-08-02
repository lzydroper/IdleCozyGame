import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../context/GameContext';
import { useToast } from './ToastSystem';
import type { EquipmentSlot } from '../types/game';
import {
  EQUIPMENT_CONFIG,
  EQUIPMENT_SETS,
  EQUIPMENT_SLOT_EMOJIS,
  ENHANCE_MAX,
  enhanceCost,
  FORGE_COST
} from '../data/equipment';
import { HEROES_CONFIG, HERO_FACTION_LABELS } from '../data/heroes';
import { ITEMS_CONFIG } from '../data/items';
import { getEquippedItemStats, getSetEnhanceProgress } from '../state/equipment';
import EquipSelectorModal from './EquipSelectorModal';
import {
  X,
  Info,
  Check,
  Repeat,
  Sword,
  Shield,
  Heart,
  Plus,
  Sparkles,
  Zap,
  Hammer
} from 'lucide-react';

export interface EquipmentDetailModalProps {
  isOpen: boolean;
  heroId: string;
  slot: EquipmentSlot;
  onClose: () => void;
}

export const EquipmentDetailModal: React.FC<EquipmentDetailModalProps> = ({
  isOpen,
  heroId,
  slot,
  onClose
}) => {
  const { state, unequipItem, enhanceItem, forgeMythic } = useGame();
  const { showToast } = useToast();
  const [showReplaceModal, setShowReplaceModal] = useState(false);

  if (!isOpen) return null;

  const heroConfig = HEROES_CONFIG[heroId];
  const heroEquip = state.equipment?.[heroId] || { weapon: null, armor: null, trinket: null };
  const item = heroEquip[slot];

  if (!item) return null;

  const cfg = EQUIPMENT_CONFIG[item.itemId];
  if (!cfg) return null;

  const setCfg = EQUIPMENT_SETS[cfg.set];
  const inventory = state.inventory || {};
  const stoneCount = inventory.enhance_stone || 0;
  const cost = enhanceCost(item.enhance);

  // 计算穿戴时装备属性（含 30% 阵营加成）
  const statsWithFaction = getEquippedItemStats(item, heroConfig?.faction);
  // 计算基础 0 强化（无阵营）与强化增加的绝对数值，用于分段展示 (base + enhanceBonus)
  const baseStats = cfg.baseStats;
  const statPerEnhance = cfg.statPerEnhance;
  const mult = item.mythic ? 1.5 : 1.0;
  const factionMult = 1.3;

  // 套装强化进度计算
  const setProgress = getSetEnhanceProgress(heroEquip);
  const currentSetProgress = setProgress[cfg.set] || 0;

  // 装备总战力/分值（ATK + DEF*2 + HP/5）
  const gearScore = Math.round(
    (statsWithFaction.attack || 0) * 10 +
    (statsWithFaction.defense || 0) * 15 +
    (statsWithFaction.maxHp || 0) * 2
  );

  // 1. 【卸下】动作
  const handleUnequip = () => {
    if (unequipItem(heroId, slot)) {
      showToast(`已卸下【${cfg.name}】，装备返回背包。`, 'success');
      onClose();
    }
  };

  // 2. 【强化】动作（100% 成功）
  const handleEnhance = () => {
    if (item.enhance >= ENHANCE_MAX) {
      if (!item.mythic) {
        // 尝试神话锻造
        const result = forgeMythic(heroId, slot);
        if (result === true) {
          showToast(`🌟 锻造成功！【${cfg.mythicName}】诞生！`, 'success');
        } else if (result === 'no_materials') {
          const need = Object.entries(FORGE_COST)
            .map(([id, q]) => `${ITEMS_CONFIG[id]?.name || id}×${q}`)
            .join('、');
          showToast(`锻造失败：需要 ${need}。`, 'error');
        }
      } else {
        showToast('装备已达神话最高等级！', 'warning');
      }
      return;
    }

    const res = enhanceItem(heroId, slot);
    if (res === true) {
      showToast(`✨ 强化成功！【${cfg.name}】等级提升至 +${item.enhance + 1}！`, 'success');
    } else if (res === 'no_stone') {
      showToast(`强化魔晶不足：需要 强化魔晶 ×${cost}。`, 'error');
    }
  };

  // 渲染属性行 (base + enhanceBonus)
  const renderStatRow = (
    label: string,
    IconComponent: any,
    baseVal: number | undefined,
    perEnhanceVal: number | undefined,
    textColor: string
  ) => {
    if (!baseVal && !perEnhanceVal) return null;
    const base = Math.round((baseVal || 0) * mult * factionMult * 10) / 10;
    const enhanceBonus = Math.round((perEnhanceVal || 0) * item.enhance * mult * factionMult * 10) / 10;

    return (
      <div className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-zinc-900/80 border border-zinc-800/80">
        <div className="flex items-center gap-1.5 font-bold text-zinc-300">
          <IconComponent className={`w-3.5 h-3.5 ${textColor}`} />
          <span>{label}</span>
        </div>
        <div className="font-mono font-black text-right">
          <span className="text-zinc-100">{base}</span>
          {enhanceBonus > 0 && (
            <span className="text-emerald-400 text-[11px] ml-1">
              +{enhanceBonus} <span className="text-[9px] text-zinc-500 font-normal">(强化)</span>
            </span>
          )}
        </div>
      </div>
    );
  };

  const modalContent = (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[10001] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in duration-150 select-none pointer-events-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 border-2 border-amber-600/40 rounded-2xl w-[92%] max-w-[370px] max-h-[85vh] p-3.5 flex flex-col justify-between shadow-2xl overflow-y-auto"
      >
        {/* Header */}
        <header className="flex items-center justify-between pb-2 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-1.5">
            <Info className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-black text-zinc-100">装备详情</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </header>

        <div className="flex-1 flex flex-col gap-2.5 py-2">
          {/* Top Card: Icon, Name, Level, Power & Swap Button */}
          <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-2.5 flex items-center gap-3 relative shadow-inner">
            {/* Icon Box */}
            <div className="w-16 h-16 rounded-xl bg-zinc-900 border-2 border-amber-500/40 relative flex items-center justify-center text-2xl shadow-md shrink-0">
              {ITEMS_CONFIG[item.itemId]?.emoji || EQUIPMENT_SLOT_EMOJIS[slot]}
              {/* Level Badge Overlay */}
              <span className="absolute -bottom-1 -right-1 text-[8.5px] font-black text-amber-300 bg-amber-950 border border-amber-500/60 px-1.5 py-0.5 rounded-md shadow">
                +{item.enhance}
              </span>
              {/* Equipped Hero Avatar Badge Overlay */}
              <div
                className="absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full border-2 border-amber-400 bg-zinc-900 overflow-hidden flex items-center justify-center shadow"
                title={`穿戴英雄: ${heroConfig?.name}`}
              >
                {heroConfig?.avatar ? (
                  <img src={heroConfig.avatar} alt={heroConfig.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] font-black text-amber-300">
                    {heroConfig?.name?.[0] || '?' }
                  </span>
                )}
              </div>
            </div>

            {/* Name, Level & Power */}
            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className={`text-sm font-black truncate ${item.mythic ? 'text-amber-300' : 'text-amber-100'}`}>
                  {item.mythic ? cfg.mythicName : cfg.name}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-zinc-400 font-bold">
                  Lv. {item.enhance}/{ENHANCE_MAX}
                </span>
                <span className="text-[10px] font-black text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30 flex items-center gap-1">
                  🏰 {gearScore}
                </span>
              </div>
            </div>

            {/* Top Right Swap Shortcut Button */}
            <button
              onClick={() => setShowReplaceModal(true)}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sky-400 border border-zinc-700 cursor-pointer active:scale-95 transition-all shrink-0"
              title="替换装备"
            >
              <Repeat className="w-4 h-4" />
            </button>
          </div>

          {/* Faction Affinity Tag (阵营加成标签) */}
          <div className="bg-sky-950/40 border border-sky-500/40 rounded-xl px-3 py-2 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-1.5 text-xs font-black text-sky-300">
              <Shield className="w-4 h-4 text-sky-400 shrink-0" />
              <span>
                【{HERO_FACTION_LABELS[heroConfig.faction]}】英雄穿戴后，装备属性增加30%
              </span>
            </div>
            <div className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0 ml-1">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
          </div>

          {/* Set Info Section (套装羁绊与属性) */}
          <div className="bg-zinc-950/70 border border-zinc-800/90 rounded-xl p-2.5 flex flex-col gap-1.5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-black text-amber-300 border-b border-zinc-800 pb-1">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                {setCfg.name} (强化 {Math.min(currentSetProgress, 30)}/30)
              </span>
              <Info className="w-3.5 h-3.5 text-zinc-500" />
            </div>

            <div className="flex flex-col gap-1 pt-0.5 text-[11px]">
              {setCfg.tierEffects.map((tier, idx) => {
                const active = currentSetProgress >= tier.threshold;
                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between px-2 py-1 rounded-lg border text-[10.5px] font-bold ${
                      active
                        ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                        : 'bg-zinc-900/40 border-zinc-800/60 text-zinc-500'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-black ${
                        active ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-800 text-zinc-600'
                      }`}>
                        {tier.threshold}
                      </span>
                      <span>{tier.description}</span>
                    </span>
                    {active ? (
                      <span className="text-[10px] text-amber-400 font-black">已激活</span>
                    ) : (
                      <span className="text-[9.5px] text-zinc-600">未激活</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Equipment Base & Enhanced Stats ("装备属性") */}
          <div className="bg-zinc-950/70 border border-zinc-800/90 rounded-xl p-2.5 flex flex-col gap-1.5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-black text-zinc-200 border-b border-zinc-800 pb-1">
              <span className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" /> 装备属性
              </span>
              <span className="text-[10px] text-sky-400 font-bold bg-sky-950/50 px-1.5 py-0.5 rounded border border-sky-500/30">
                +30% 阵营加成已应用
              </span>
            </div>

            <div className="flex flex-col gap-1 pt-0.5">
              {renderStatRow('装备攻击', Sword, baseStats.attack, statPerEnhance.attack, 'text-amber-400')}
              {renderStatRow('装备生命', Heart, baseStats.maxHp, statPerEnhance.maxHp, 'text-rose-400')}
              {renderStatRow('装备防御', Shield, baseStats.defense, statPerEnhance.defense, 'text-sky-400')}
            </div>
          </div>

          {/* Milestone Reward Section ("强化等级奖励") */}
          <div className="bg-zinc-950/70 border border-zinc-800/90 rounded-xl p-2.5 flex flex-col gap-1.5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-black text-amber-300 border-b border-zinc-800 pb-1">
              <span className="flex items-center gap-1">
                <Hammer className="w-3.5 h-3.5 text-amber-400" /> 强化等级奖励
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 pt-0.5">
              {[
                { lvl: 10, label: '属性+10%' },
                { lvl: 20, label: '属性+20%' },
                { lvl: 30, label: '可神话锻造' }
              ].map(({ lvl, label }) => {
                const reached = item.enhance >= lvl;
                return (
                  <div
                    key={lvl}
                    className={`flex flex-col items-center justify-center p-1.5 rounded-lg border text-center ${
                      reached
                        ? 'bg-amber-950/40 border-amber-500/50 text-amber-300'
                        : 'bg-zinc-900/40 border-zinc-800 text-zinc-600'
                    }`}
                  >
                    <span className="text-[10px] font-black font-mono">[{lvl}]</span>
                    <span className="text-[9px] font-bold mt-0.5">{label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Enhancement Cost Bar */}
          {item.enhance < ENHANCE_MAX && !item.mythic && (
            <div className="bg-zinc-950/90 border border-zinc-800 rounded-xl p-2 flex items-center justify-between shadow-inner">
              <div className="flex items-center gap-2">
                <span className="text-sm">🔷</span>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-zinc-400 leading-tight">
                    强化魔晶消耗
                  </span>
                  <span className={`text-xs font-black font-mono leading-tight ${
                    stoneCount >= cost ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {stoneCount}/{cost}
                  </span>
                </div>
              </div>
              <button
                onClick={() => showToast('强化魔晶可通过工坊合成或战斗/梦境探索掉落获取！', 'info')}
                className="w-6 h-6 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-zinc-700 flex items-center justify-center cursor-pointer transition-colors"
                title="获取途径说明"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Action Buttons: 卸下, 强化, 替换 */}
        <footer className="pt-2 border-t border-zinc-800 grid grid-cols-3 gap-2 shrink-0">
          {/* 1. 卸下 */}
          <button
            onClick={handleUnequip}
            className="py-2 rounded-xl text-xs font-black text-rose-300 bg-rose-950/60 hover:bg-rose-900/80 border border-rose-500/50 cursor-pointer active:scale-95 transition-all text-center"
          >
            卸下
          </button>

          {/* 2. 强化 (100% 成功) */}
          <button
            onClick={handleEnhance}
            disabled={item.enhance < ENHANCE_MAX && stoneCount < cost}
            className={`py-2 rounded-xl text-xs font-black transition-all text-center border active:scale-95 cursor-pointer disabled:cursor-not-allowed ${
              item.enhance < ENHANCE_MAX
                ? stoneCount >= cost
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 border-emerald-400 shadow-md shadow-emerald-950/50'
                  : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                : !item.mythic
                  ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 border-amber-400 shadow-md'
                  : 'bg-zinc-800 text-zinc-500 border-zinc-700'
            }`}
          >
            {item.enhance < ENHANCE_MAX
              ? '强化'
              : !item.mythic
                ? '锻造神话'
                : '已满级'}
          </button>

          {/* 3. 替换 */}
          <button
            onClick={() => setShowReplaceModal(true)}
            className="py-2 rounded-xl text-xs font-black text-white bg-sky-600 hover:bg-sky-500 border border-sky-400 cursor-pointer active:scale-95 transition-all text-center shadow-md shadow-sky-950/50"
          >
            替换
          </button>
        </footer>
      </div>

      {/* 装备替换 Modal */}
      {showReplaceModal && (
        <EquipSelectorModal
          isOpen={showReplaceModal}
          heroId={heroId}
          slot={slot}
          onClose={() => setShowReplaceModal(false)}
          onSelectSuccess={() => {
            setShowReplaceModal(false);
            onClose();
          }}
        />
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default EquipmentDetailModal;
