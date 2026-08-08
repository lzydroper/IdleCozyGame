import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../context/GameContext';
import { useToast } from './ToastSystem';
import type { EquipmentSlot } from '../types/game';
import {
  EQUIPMENT_CONFIG,
  EQUIPMENT_SETS,
  ENHANCE_MAX,
  FACTION_EQUIPMENT_BONUS_PERCENT,
  enhanceCost,
  FORGE_COST
} from '../data/equipment';
import { HEROES_CONFIG, HERO_FACTION_LABELS } from '../data/heroes';
import { ITEMS_CONFIG } from '../data/items';
import { getEquippedItemStats, getEquippedStatParts, getSetEnhanceProgress } from '../state/equipment';
import { formatModifiers, type StatKey } from '../state/statSystem';
import EquipSelectorModal from './EquipSelectorModal';
import { UI_TOKENS } from '../data/uiConstants';
import GameIcon from './GameIcon';
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
  Hammer,
  Castle,
  Lock,
  Lightbulb,
  Flame,
  Snowflake,
  Gem
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

  const isFactionMatched = Boolean(heroConfig?.faction && cfg.faction === heroConfig.faction);

  // 计算穿戴时装备属性（只有同阵营英雄穿戴才触发 30% 阵营加成）
  const statsWithFaction = getEquippedItemStats(item, heroConfig?.faction);

  // 套装强化进度计算
  const setProgress = getSetEnhanceProgress(heroEquip);
  const currentSetProgress = setProgress[cfg.set] || 0;

  // 当前英雄已穿戴的同系列装备数量
  const equippedSetItems = (['weapon', 'armor', 'trinket'] as const).filter(s => {
    const itemOnSlot = heroEquip[s];
    if (!itemOnSlot) return false;
    const itemCfg = EQUIPMENT_CONFIG[itemOnSlot.itemId];
    return itemCfg?.set === cfg.set;
  });
  const equippedSetCount = equippedSetItems.length;
  const activeTierModifiers = setCfg.tierEffects
    .filter(t => currentSetProgress >= t.threshold)
    .map(t => formatModifiers(t.bonus));

  // 装备总战力/分值（ATK + DEF*2 + HP/5）
  const gearScore = Math.round(
    (statsWithFaction.find(m => m.stat === 'attack')?.value ?? 0) * 10 +
    (statsWithFaction.find(m => m.stat === 'defense')?.value ?? 0) * 15 +
    (statsWithFaction.find(m => m.stat === 'maxHp')?.value ?? 0) * 2
  );

  // 1. 【卸下】动作
  const handleUnequip = () => {
    if (unequipItem(heroId, slot)) {
      showToast(`已卸下【${cfg.name}】`, 'success');
      onClose();
    }
  };

  // 2. 【强化】动作（100% 成功）
  const handleEnhance = () => {
    if (item.enhance >= ENHANCE_MAX) {
      if (!item.mythic) {
        const result = forgeMythic(heroId, slot);
        if (result === true) {
          showToast(`锻造成功！【${cfg.mythicName}】诞生！`, 'success');
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

    if (stoneCount < cost) {
      showToast(`强化魔晶不足！需要 ${cost} 个，当前剩余 ${stoneCount} 个。`, 'error');
      return;
    }
    const res = enhanceItem(heroId, slot);
    if (res === true) {
      showToast(`强化成功！【${cfg.name}】提升至 +${item.enhance + 1}`, 'success');
    } else if (res === 'no_stone') {
      showToast(`强化魔晶不足：需要 强化魔晶 ×${cost}。`, 'error');
    }
  };

  // 渲染属性行（base + 强化成长；数据源与聚合共用 getEquippedStatParts）
  const renderStatRow = (
    label: string,
    IconComp: React.ComponentType<{ className?: string }>,
    stat: StatKey,
    colorClass: string = 'text-amber-400'
  ) => {
    const { base, enhance } = getEquippedStatParts(item, stat, heroConfig?.faction);
    if (!base && !enhance) return null;
    const baseDisp = Math.round(base * 10) / 10;
    const enhanceDisp = Math.round(enhance * 10) / 10;

    return (
      <div className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
        <div className="flex items-center gap-1.5 font-bold text-zinc-300">
          <IconComp className={`w-3.5 h-3.5 ${colorClass}`} />
          <span>{label}</span>
        </div>
        <div className="font-mono font-black text-right">
          <span className="text-zinc-100">{baseDisp}</span>
          {enhanceDisp > 0 && (
            <span className="text-emerald-400 text-[11px] ml-1">
              +{enhanceDisp} <span className="text-[9px] text-zinc-500 font-normal">(强化)</span>
            </span>
          )}
        </div>
      </div>
    );
  };

  const modalContent = (
    <div
      onClick={onClose}
      className={UI_TOKENS.modalBackdropChild}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={UI_TOKENS.modalContainerEquipment}
      >
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
          <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-2.5 flex items-center gap-3 relative shadow-inner">
            <div className="w-16 h-16 rounded-xl bg-zinc-900 border-2 border-amber-500/40 relative flex items-center justify-center shadow-md shrink-0">
              <GameIcon type="item" id={item.itemId} className="w-11 h-11" />
              <span className="absolute -bottom-1 -right-1 text-[9px] font-black text-amber-300 bg-amber-950 border border-amber-500/60 px-1.5 py-0.5 rounded-md shadow">
                +{item.enhance}
              </span>
            </div>

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
                  <Castle className="w-3 h-3" /> {gearScore}
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowReplaceModal(true)}
              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sky-400 border border-zinc-700 cursor-pointer active:scale-95 transition-all shrink-0"
              title="替换装备"
            >
              <Repeat className="w-4 h-4" />
            </button>
          </div>

          {isFactionMatched ? (
            /* 已激活状态 */
            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-2.5 flex items-start justify-between gap-2 shadow-sm">
              <div className="flex items-start gap-2 min-w-0">
                <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-black text-emerald-300">
                      【{HERO_FACTION_LABELS[cfg.faction]}】阵营加成已激活
                    </span>
                    <span className="px-1.5 py-0.2 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30 font-mono">
                      +{FACTION_EQUIPMENT_BONUS_PERCENT}%
                    </span>
                  </div>
                  <p className="text-[10px] text-emerald-400/70 mt-0.5">
                    同阵营英雄穿戴，装备基础属性获得额外提升
                  </p>
                </div>
              </div>
              <div className="w-5 h-5 rounded-full bg-emerald-900/80 border border-emerald-500/50 flex items-center justify-center text-emerald-300 shrink-0 mt-0.5">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            </div>
          ) : (
            /* 未激活状态 */
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-2.5 flex items-start justify-between gap-2 shadow-sm">
              <div className="flex items-start gap-2 min-w-0">
                <Shield className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-zinc-300">
                      【{HERO_FACTION_LABELS[cfg.faction]}】阵营装备
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      (未激活 +{FACTION_EQUIPMENT_BONUS_PERCENT}% 加成)
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-0.5">
                    需要【{HERO_FACTION_LABELS[cfg.faction]}】阵营英雄穿戴，当前：{HERO_FACTION_LABELS[heroConfig.faction]}
                  </p>
                </div>
              </div>
              <div className="w-5 h-5 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-600 shrink-0 mt-0.5">
                <Lock className="w-3 h-3" />
              </div>
            </div>
          )}

          <div className="bg-zinc-950/70 border border-zinc-800/90 rounded-xl p-2.5 flex flex-col gap-1.5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-black text-amber-300 border-b border-zinc-800 pb-1">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                {setCfg.name} (已穿戴 {equippedSetCount}/3 件 · 强化总和: {currentSetProgress}/30)
              </span>
              <Info className="w-3.5 h-3.5 text-zinc-500" />
            </div>

            <div className="text-[10px] text-zinc-400 bg-zinc-900/60 p-2 rounded-lg border border-zinc-800/70 leading-relaxed font-medium">
              <Lightbulb className="w-3 h-3 inline-block mr-1 -mt-0.5 text-amber-400 shrink-0" />
              <span className="text-amber-300/90 font-bold">套装说明：</span>
              穿戴同系列装备并提升强化等级，强化等级总和达 10/20/30 级时解锁对应属性加成。

              <div className="mt-1 font-bold">
                {activeTierModifiers.length > 0 ? (
                  <span className="text-amber-400 inline-flex items-center gap-1">
                    <Flame className="w-3 h-3 shrink-0" />
                    <span>当前已生效：{activeTierModifiers.join('、')}</span>
                  </span>
                ) : (
                  <span className="text-zinc-500 inline-flex items-center gap-1">
                    <Snowflake className="w-3 h-3 shrink-0" />
                    <span>当前已生效：无（需强化等级总和 ≥ 10）</span>
                  </span>
                )}
              </div>
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
                      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-black ${
                        active ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-800 text-zinc-600'
                      }`}>
                        {tier.threshold}
                      </span>
                      <span>{formatModifiers(tier.bonus)}</span>
                    </span>
                    {active ? (
                      <span className="text-[10px] text-amber-400 font-black flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> 已激活
                      </span>
                    ) : (
                      <span className="text-[9.5px] text-zinc-600">未激活</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-zinc-950/70 border border-zinc-800/90 rounded-xl p-2.5 flex flex-col gap-1.5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-black text-zinc-200 border-b border-zinc-800 pb-1">
              <span className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" /> 装备属性
              </span>
              {isFactionMatched ? (
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-500/30">
                  +30% 阵营加成已应用
                </span>
              ) : (
                <span className="text-[10px] text-zinc-500 font-bold bg-zinc-900/80 px-1.5 py-0.5 rounded border border-zinc-800">
                  未激活阵营加成
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1 pt-0.5">
              {renderStatRow('装备攻击', Sword, 'attack', 'text-amber-400')}
              {renderStatRow('装备生命', Heart, 'maxHp', 'text-rose-400')}
              {renderStatRow('装备防御', Shield, 'defense', 'text-sky-400')}
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
                <Gem className="w-3.5 h-3.5" />
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
