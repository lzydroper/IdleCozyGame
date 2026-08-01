import React from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../context/GameContext';
import {
  HEROES_CONFIG,
  HERO_CLASS_LABELS,
  HERO_FACTION_LABELS,
  HERO_CLASS_COLORS
} from '../data/heroes';
import { STAR_MAX, starUpShardCost, AWAKEN_CONFIG } from '../data/awakening';
import { getAwakenedName, getStarBonus, getAwakenedPassive } from '../state/awakening';
import { ITEMS_CONFIG } from '../data/equipment';
import { getHeroEquipmentBonus } from '../state/equipment';
import { calculateEntityStats } from '../state/statSystem';
import { useToast } from './ToastSystem';
import { X, Shield, Sword, ShieldAlert, Sparkles, Heart, Zap, Award } from 'lucide-react';
import type { EquipmentSlot } from '../types/game';

export interface HeroDetailModalProps {
  isOpen: boolean;
  heroId: string | null;
  onClose: () => void;
}

export const HeroDetailModal: React.FC<HeroDetailModalProps> = ({
  isOpen,
  heroId,
  onClose
}) => {
  const { state, unequipItem, starUpHero, awakenHero } = useGame();
  const { showToast } = useToast();

  if (!isOpen || !heroId) return null;

  const config = HEROES_CONFIG[heroId];
  const hero = state.heroes[heroId];
  if (!config || !hero) return null;

  const heroEquip = state.heroEquipment?.[heroId] || { weapon: null, armor: null, trinket: null };
  const firstChar = config.name ? config.name[0] : '?';
  const awakenedName = getAwakenedName(heroId, hero) || config.name;

  // 装备加成属性
  const { flat: equipFlat, percent: equipPercent } = getHeroEquipmentBonus(heroEquip);
  const starBonus = getStarBonus(hero);
  const awakenPassive = getAwakenedPassive(heroId, hero);

  // 核心基础面板属性计算
  const calculatedStats = calculateEntityStats({
    baseAttributes: {
      attack: config.baseAttack + (hero.level - 1) * 3 + (equipFlat.attack || 0),
      defense: config.baseDefense + (hero.level - 1) * 1 + (equipFlat.defense || 0),
      maxHp: config.baseHp + (hero.level - 1) * 10 + (equipFlat.hp || 0),
      maxMp: 50 + (equipFlat.mp || 0),
      critRate: 0.05,
      critDmg: 1.50
    }
  });

  const soulCount = state.soulShards?.[heroId] || 0;
  const resonanceCount = state.resonanceShards || 0;
  const shardCost = starUpShardCost(hero.star);
  const totalAvailableShards = soulCount + resonanceCount;
  const hasOrb = (state.inventory.arcane_orb || 0) >= 1;

  // 卸下全部 3 槽装备
  const handleUnequipAll = () => {
    let unequippedCount = 0;
    const slots: EquipmentSlot[] = ['weapon', 'armor', 'trinket'];
    slots.forEach(slot => {
      if (heroEquip[slot]) {
        unequipItem(heroId, slot);
        unequippedCount++;
      }
    });

    if (unequippedCount > 0) {
      showToast(`已卸下【${config.name}】的全部装备！`, 'success');
    } else {
      showToast('当前英雄未穿戴任何装备。', 'info');
    }
  };

  // 升星处理
  const handleStarUp = () => {
    const result = starUpHero(heroId);
    if (result === true) {
      showToast(`⭐ ${config.name} 升星成功！当前星级：★${hero.star + 1}`, 'success');
    } else if (result === 'no_shards') {
      showToast('升星失败：灵魂碎片或共鸣碎片不足！', 'error');
    } else if (result === 'max_star') {
      showToast('已达 5 星上限，请进行觉醒！', 'warning');
    }
  };

  // 觉醒处理
  const handleAwaken = () => {
    const result = awakenHero(heroId);
    if (result === true) {
      showToast(`🌟 觉醒成功！【${awakenedName}】解锁专属技能与觉醒被动！`, 'success');
    } else if (result === 'no_orb') {
      showToast('觉醒失败：需要 1 个【奥术星体】（辐射车间 BOSS 掉落）。', 'error');
    } else if (result === 'not_max_star') {
      showToast('觉醒需先升至 5 星满星。', 'warning');
    }
  };

  // 渲染单个装备槽位
  const renderEquipSlot = (slot: EquipmentSlot, slotLabel: string, IconComponent: any) => {
    const item = heroEquip[slot];
    const itemConfig = item ? ITEMS_CONFIG[item.itemId] : null;

    return (
      <div className="flex flex-col items-center gap-1">
        <div
          className={`w-14 h-14 aspect-square rounded-xl border flex flex-col items-center justify-center relative overflow-hidden transition-all ${
            item
              ? 'bg-zinc-950/90 border-amber-500/40 shadow-sm shadow-amber-950/30'
              : 'bg-zinc-950/40 border-zinc-800 border-dashed'
          }`}
        >
          <IconComponent className={`w-5 h-5 ${item ? 'text-amber-400' : 'text-zinc-600'}`} />
          <span className="text-[9px] font-bold text-zinc-300 max-w-[50px] truncate text-center mt-0.5">
            {itemConfig?.name || slotLabel}
          </span>

          {item && item.enhanceLevel > 0 && (
            <span className="absolute top-0.5 right-0.5 text-[8px] font-black text-amber-300 bg-black/80 px-1 rounded border border-amber-500/30">
              +{item.enhanceLevel}
            </span>
          )}
        </div>
      </div>
    );
  };

  const modalContent = (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-3 animate-in fade-in duration-150 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 border border-zinc-750 rounded-2xl w-[92%] max-w-[380px] max-h-[85vh] p-4 flex flex-col gap-3.5 shadow-2xl overflow-y-auto"
      >
        {/* 顶部 Header */}
        <header className="flex items-center justify-between pb-2.5 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-black text-zinc-100 truncate">
              {awakenedName}
            </h3>
            <span className="text-xs text-amber-400 font-black">
              Lv.{hero.level}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </header>

        {/* 英雄立绘 Showcase 与 surrounding 3 装备槽 */}
        <div className="flex flex-col items-center gap-3 bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80">
          <div className="flex items-center justify-center gap-3 w-full">
            {/* 左侧：武器槽位 */}
            {renderEquipSlot('weapon', '武器', Sword)}

            {/* 中央：正方形英雄头像 */}
            <div className="w-24 h-24 aspect-square rounded-2xl bg-zinc-950 border-2 border-amber-500/40 flex items-center justify-center relative overflow-hidden shadow-lg shadow-amber-950/20">
              {config.avatar ? (
                <img src={config.avatar} alt={config.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-black text-amber-300">{firstChar}</span>
              )}
              {hero.awakened && (
                <div className="absolute top-1 left-1 bg-amber-500 text-zinc-950 text-[8px] font-black px-1 rounded shadow">
                  觉醒
                </div>
              )}
            </div>

            {/* 右侧：防具槽位 */}
            {renderEquipSlot('armor', '防具', Shield)}
          </div>

          {/* 下方：饰品槽位 */}
          <div className="flex items-center justify-center">
            {renderEquipSlot('trinket', '饰品', Sparkles)}
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${HERO_CLASS_COLORS[config.heroClass]}`}>
              {HERO_CLASS_LABELS[config.heroClass]}
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-md border border-purple-500/40 bg-purple-950/40 text-purple-300">
              {HERO_FACTION_LABELS[config.faction]}
            </span>
            <span className="text-xs text-amber-400 font-black">
              {'★'.repeat(hero.star)}
            </span>
          </div>
        </div>

        {/* 核心基础属性面板 */}
        <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-3 flex flex-col gap-2">
          <div className="text-xs font-black text-amber-300 border-b border-zinc-850 pb-1.5 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" /> 核心基础属性
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center justify-between text-zinc-300">
              <span className="text-zinc-500 font-bold flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 text-rose-400" /> 生命上限
              </span>
              <span className="font-black text-rose-300">{calculatedStats.maxHp}</span>
            </div>

            <div className="flex items-center justify-between text-zinc-300">
              <span className="text-zinc-500 font-bold flex items-center gap-1">
                <Sword className="w-3.5 h-3.5 text-amber-400" /> 物理攻击
              </span>
              <span className="font-black text-amber-300">{calculatedStats.attack}</span>
            </div>

            <div className="flex items-center justify-between text-zinc-300">
              <span className="text-zinc-500 font-bold flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-sky-400" /> 物理防御
              </span>
              <span className="font-black text-sky-300">{calculatedStats.defense}</span>
            </div>

            <div className="flex items-center justify-between text-zinc-300">
              <span className="text-zinc-500 font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" /> 暴击率
              </span>
              <span className="font-black text-purple-300">
                {(calculatedStats.critRate * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* 底部按钮交互组 (包含全部卸下、升星/觉醒按钮) */}
        <div className="flex flex-col gap-2 pt-1 border-t border-zinc-800">
          <div className="flex items-center gap-2">
            {/* 全部卸下按钮 */}
            <button
              onClick={handleUnequipAll}
              className="flex-1 py-2 rounded-xl text-xs font-bold text-zinc-300 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 transition-all cursor-pointer text-center active:scale-98"
            >
              全部卸下
            </button>

            {/* 升星 / 觉醒 / 已觉醒 状态按钮 */}
            {hero.star < STAR_MAX ? (
              <button
                onClick={handleStarUp}
                disabled={totalAvailableShards < shardCost}
                className={`flex-1 py-2 rounded-xl text-xs font-black transition-all border text-center cursor-pointer disabled:cursor-not-allowed ${
                  totalAvailableShards >= shardCost
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 border-amber-400 shadow-md shadow-amber-950/40 active:scale-98'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-600'
                }`}
              >
                ⭐ 升星（碎片 ×{shardCost}）
              </button>
            ) : !hero.awakened ? (
              <button
                onClick={handleAwaken}
                disabled={!hasOrb}
                className={`flex-1 py-2 rounded-xl text-xs font-black transition-all border text-center cursor-pointer disabled:cursor-not-allowed ${
                  hasOrb
                    ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white border-purple-400/50 shadow-md shadow-purple-950/40 active:scale-98'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-600'
                }`}
              >
                🌟 觉醒（奥术星体×1）
              </button>
            ) : (
              <button
                disabled
                className="flex-1 py-2 rounded-xl text-xs font-black bg-zinc-950 border border-zinc-800 text-zinc-500 cursor-not-allowed text-center"
                title="英雄已完成觉醒，专属技能与觉醒强效被动已生效"
              >
                已觉醒
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default HeroDetailModal;
