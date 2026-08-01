import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../context/GameContext';
import {
  HEROES_CONFIG,
  HERO_CLASS_LABELS,
  HERO_FACTION_LABELS,
  HERO_CLASS_COLORS
} from '../data/heroes';
import { STAR_MAX, starUpShardCost } from '../data/awakening';
import { getAwakenedName } from '../state/awakening';
import { ITEMS_CONFIG } from '../data/items';
import { EQUIPMENT_CONFIG } from '../data/equipment';
import { getHeroEquipmentBonus } from '../state/equipment';
import { applyHeroExp } from '../state/combat';
import { COMBAT_CONFIG } from '../data/combatConfig';
import { calculateEntityStats } from '../state/statSystem';
import { useToast } from './ToastSystem';
import DetailedStatsModal from './DetailedStatsModal';
import HeroTalentPanel from './HeroTalentPanel';
import {
  X,
  Shield,
  Sword,
  Sparkles,
  Heart,
  Zap,
  Award,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Flame,
  Wand2
} from 'lucide-react';
import type { EquipmentSlot } from '../types/game';

export interface HeroDetailModalProps {
  isOpen: boolean;
  heroId: string | null;
  onSelectHero?: (heroId: string) => void;
  onClose: () => void;
}

export const HeroDetailModal: React.FC<HeroDetailModalProps> = ({
  isOpen,
  heroId,
  onSelectHero,
  onClose
}) => {
  const { state, setState, equipItem, unequipItem, starUpHero, awakenHero } = useGame();
  const { showToast } = useToast();
  const [showDetailedStats, setShowDetailedStats] = useState(false);
  const [showTalentModal, setShowTalentModal] = useState(false);

  if (!isOpen || !heroId) return null;

  const heroIds = Object.keys(state.heroes);
  const currentIndex = heroIds.indexOf(heroId);
  const config = HEROES_CONFIG[heroId];
  const hero = state.heroes[heroId];
  if (!config || !hero) return null;

  const heroEquip = state.equipment?.[heroId] || { weapon: null, armor: null, trinket: null };
  const firstChar = config.name ? config.name[0] : '?';
  const awakenedName = getAwakenedName(heroId, hero) || config.name;

  // 装备加成属性
  const { flat: equipFlat } = getHeroEquipmentBonus(heroEquip);

  // 核心基础面板属性计算 (严格按 CONTEXT.md 6 项基础属性: 攻击、防御、生命、魔力、暴击、暴伤)
  const calculatedStats = calculateEntityStats({
    baseAttributes: {
      attack: config.baseAttack + (hero.level - 1) * 3 + (equipFlat.attack || 0),
      defense: config.baseDefense + (hero.level - 1) * 1 + (equipFlat.defense || 0),
      maxHp: config.baseHp + (hero.level - 1) * 10 + (equipFlat.maxHp || 0),
      maxMp: 50,
      critRate: 0.05,
      critDmg: 1.50
    }
  });

  const soulCount = state.soulShards?.[heroId] || 0;
  const resonanceCount = state.resonanceShards || 0;
  const shardCost = starUpShardCost(hero.star);
  const totalAvailableShards = soulCount + resonanceCount;
  const hasOrb = (state.inventory.arcane_orb || 0) >= 1;

  // 左右切换英雄 (居中在 Header 内)
  const handlePrevHero = () => {
    if (heroIds.length <= 1) return;
    const prevIdx = (currentIndex - 1 + heroIds.length) % heroIds.length;
    if (onSelectHero) onSelectHero(heroIds[prevIdx]);
  };

  const handleNextHero = () => {
    if (heroIds.length <= 1) return;
    const nextIdx = (currentIndex + 1) % heroIds.length;
    if (onSelectHero) onSelectHero(heroIds[nextIdx]);
  };

  // 1. 【一键装备 / 一键卸下】
  const hasAnyEquip = Boolean(heroEquip.weapon || heroEquip.armor || heroEquip.trinket);

  const handleToggleEquipAll = () => {
    if (hasAnyEquip) {
      let unequippedCount = 0;
      const slots: EquipmentSlot[] = ['weapon', 'armor', 'trinket'];
      slots.forEach(slot => {
        if (heroEquip[slot]) {
          unequipItem(heroId, slot);
          unequippedCount++;
        }
      });
      showToast(`已卸下【${config.name}】的全部装备！`, 'success');
    } else {
      let equippedCount = 0;
      const slots: EquipmentSlot[] = ['weapon', 'armor', 'trinket'];
      const inv = state.inventory || {};
      slots.forEach(slot => {
        if (!heroEquip[slot]) {
          const matchItemId = Object.keys(inv).find(itemId => (inv[itemId] || 0) > 0 && EQUIPMENT_CONFIG[itemId]?.slot === slot);
          if (matchItemId) {
            equipItem(heroId, slot, matchItemId);
            equippedCount++;
          }
        }
      });
      if (equippedCount > 0) {
        showToast(`已为【${config.name}】自动穿戴装备！`, 'success');
      } else {
        showToast('背包中暂无可用装备可穿戴。', 'info');
      }
    }
  };

  // 2. 【升级】
  const handleLevelUp = () => {
    setState(prev => {
      const h = prev.heroes[heroId];
      if (!h) return prev;
      const leveled = applyHeroExp(h, config, h.level * COMBAT_CONFIG.expPerLevel);
      return {
        ...prev,
        heroes: {
          ...prev.heroes,
          [heroId]: leveled
        }
      };
    });
    showToast(`⬆ 【${config.name}】升级到 Lv.${hero.level + 1}！`, 'success');
  };

  // 3. 【升星 / 觉醒】
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

  // 渲染单个装备槽位 (放大为 w-13 h-13 框，下方独立文字)
  const renderEquipSlot = (slot: EquipmentSlot, slotLabel: string, IconComponent: any) => {
    const item = heroEquip[slot];
    const itemConfig = item ? ITEMS_CONFIG[item.itemId] : null;

    return (
      <div className="flex flex-col items-center gap-0.5">
        <div
          className={`w-13 h-13 aspect-square rounded-xl border flex flex-col items-center justify-center relative overflow-hidden transition-all ${
            item
              ? 'bg-zinc-950/90 border-amber-500/40 shadow-sm shadow-amber-950/30'
              : 'bg-zinc-950/40 border-zinc-800 border-dashed'
          }`}
        >
          <IconComponent className={`w-5 h-5 ${item ? 'text-amber-400' : 'text-zinc-600'}`} />
          {item && item.enhance > 0 && (
            <span className="absolute top-0.5 right-0.5 text-[7.5px] font-black text-amber-300 bg-black/80 px-1 rounded border border-amber-500/30">
              +{item.enhance}
            </span>
          )}
        </div>
        <span className="text-[8.5px] font-bold text-zinc-300 max-w-[56px] truncate text-center leading-tight mt-0.5">
          {itemConfig?.name || slotLabel}
        </span>
      </div>
    );
  };

  // 渲染技能槽位占位 (放大为 w-13 h-13 框，下方独立文字 技能 1, 2, 3)
  const renderSkillSlot = (skillIndex: number) => {
    return (
      <div className="flex flex-col items-center gap-0.5">
        <div
          className="w-13 h-13 aspect-square rounded-xl border border-zinc-800 bg-zinc-950/60 flex items-center justify-center relative overflow-hidden"
          title={`技能 ${skillIndex}`}
        >
          <Flame className="w-5 h-5 text-purple-400/70" />
        </div>
        <span className="text-[8.5px] font-bold text-zinc-400 max-w-[56px] truncate text-center leading-tight mt-0.5">
          技能 {skillIndex}
        </span>
      </div>
    );
  };

  const modalContent = (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[10000] bg-transparent flex flex-col items-center justify-center p-3 animate-in fade-in duration-150 select-none pointer-events-auto"
    >
      {/* 自适应紧凑 Modal 容器尺寸: w-[92%] max-w-[380px] h-auto max-h-[85vh] */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 border border-zinc-750 rounded-2xl w-[92%] max-w-[380px] h-auto max-h-[85vh] p-3.5 flex flex-col gap-3 shadow-2xl overflow-y-auto"
      >
        {/* 顶部 Header: 标题与切换箭头居中 (< 🏅 英雄详情 >) */}
        <header className="flex items-center justify-between pb-2 border-b border-zinc-800 shrink-0 relative">
          <div className="flex-1 flex items-center justify-center gap-2">
            {heroIds.length > 1 && (
              <button
                onClick={handlePrevHero}
                className="p-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-400 cursor-pointer transition-colors"
                title="上一个英雄"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <Award className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-black text-zinc-100 truncate">
              英雄详情
            </h3>
            {heroIds.length > 1 && (
              <button
                onClick={handleNextHero}
                className="p-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-400 cursor-pointer transition-colors"
                title="下一个英雄"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors cursor-pointer absolute right-0 top-0"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </header>

        {/* 紧凑贴合的主体内容区域 */}
        <div className="flex flex-col gap-3 pt-0.5">
          {/* 上半部分三列布局 (消除中列标签至升级按钮间悬空空隙) */}
          <div className="grid grid-cols-3 gap-2 items-stretch bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/80 shrink-0">
            {/* 左侧列：三槽装备 + 底部【一键装备/一键卸下】 */}
            <div className="flex flex-col items-center justify-between">
              <div className="flex flex-col gap-1 items-center w-full">
                {renderEquipSlot('weapon', '武器', Sword)}
                {renderEquipSlot('armor', '防具', Shield)}
                {renderEquipSlot('trinket', '饰品', Sparkles)}
              </div>
              <button
                onClick={handleToggleEquipAll}
                className="w-full py-1.5 rounded-lg text-[8.5px] font-black text-zinc-200 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 cursor-pointer active:scale-95 truncate mt-1.5"
              >
                {hasAnyEquip ? '一键卸下' : '一键装备'}
              </button>
            </div>

            {/* 中间列：放大大头像 w-20 h-20、名称、标签 + 底部【升级】(紧凑无空隙) */}
            <div className="flex flex-col items-center justify-between text-center">
              <div className="flex flex-col items-center gap-1">
                {/* 放大正方形大头像 (w-20 h-20) */}
                <div className="w-20 h-20 aspect-square rounded-2xl bg-zinc-950 border-2 border-amber-500/40 flex items-center justify-center relative overflow-hidden shadow-lg shadow-amber-950/20">
                  {config.avatar ? (
                    <img src={config.avatar} alt={config.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-black text-amber-300">{firstChar}</span>
                  )}
                  {hero.awakened && (
                    <div className="absolute top-0.5 left-0.5 bg-amber-500 text-zinc-950 text-[7.5px] font-black px-1 rounded shadow">
                      觉醒
                    </div>
                  )}
                </div>

                {/* 名称与等级 */}
                <span className="text-xs font-black text-zinc-100 truncate max-w-[96px] mt-0.5">
                  {awakenedName}
                </span>
                <span className="text-[9.5px] text-amber-400 font-bold">
                  Lv.{hero.level} {'★'.repeat(hero.star)}
                </span>

                {/* 职阶/阵营 */}
                <div className="flex items-center gap-1">
                  <span className={`text-[7.5px] font-bold px-1 py-0.5 rounded border ${HERO_CLASS_COLORS[config.heroClass]}`}>
                    {HERO_CLASS_LABELS[config.heroClass]}
                  </span>
                  <span className="text-[7.5px] font-bold px-1 py-0.5 rounded border border-purple-500/40 bg-purple-950/40 text-purple-300">
                    {HERO_FACTION_LABELS[config.faction]}
                  </span>
                </div>
              </div>

              {/* 中列底部按钮: 升级 */}
              <button
                onClick={handleLevelUp}
                className="w-full py-1.5 rounded-lg text-[8.5px] font-black text-amber-300 bg-amber-950/50 hover:bg-amber-900/60 border border-amber-500/40 cursor-pointer active:scale-95 truncate mt-1.5"
              >
                升级
              </button>
            </div>

            {/* 右侧列：三项技能 + 底部【升星/觉醒】 */}
            <div className="flex flex-col items-center justify-between">
              <div className="flex flex-col gap-1 items-center w-full">
                {renderSkillSlot(1)}
                {renderSkillSlot(2)}
                {renderSkillSlot(3)}
              </div>

              {/* 右列底部按钮: 升星 / 觉醒 */}
              {hero.star < STAR_MAX ? (
                <button
                  onClick={handleStarUp}
                  disabled={totalAvailableShards < shardCost}
                  className={`w-full py-1.5 rounded-lg text-[8.5px] font-black transition-all border cursor-pointer truncate disabled:cursor-not-allowed mt-1.5 ${
                    totalAvailableShards >= shardCost
                      ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 border-amber-400 shadow-sm active:scale-95'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-600'
                  }`}
                >
                  ⭐ 升星({shardCost})
                </button>
              ) : !hero.awakened ? (
                <button
                  onClick={handleAwaken}
                  disabled={!hasOrb}
                  className={`w-full py-1.5 rounded-lg text-[8.5px] font-black transition-all border cursor-pointer truncate disabled:cursor-not-allowed mt-1.5 ${
                    hasOrb
                      ? 'bg-purple-600 hover:bg-purple-500 text-white border-purple-400 shadow-sm active:scale-95'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-600'
                  }`}
                >
                  🌟 觉醒
                </button>
              ) : (
                <button
                  disabled
                  className="w-full py-1.5 rounded-lg text-[8.5px] font-black bg-zinc-950 border border-zinc-800 text-zinc-500 cursor-not-allowed truncate mt-1.5"
                >
                  已觉醒
                </button>
              )}
            </div>
          </div>

          {/* 下半部分左右布局 (消除【基础属性】标题与【生命】第一行数据之间的悬空) */}
          <div className="grid grid-cols-3 gap-2 shrink-0">
            {/* 左侧：天赋树入口 */}
            <div
              onClick={() => setShowTalentModal(true)}
              className="bg-zinc-950/70 border border-zinc-800 hover:border-amber-500/50 rounded-xl p-2.5 flex flex-col items-center justify-center gap-1.5 cursor-pointer group transition-all"
            >
              <div className="w-8.5 h-8.5 rounded-full bg-amber-950/40 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                <Sliders className="w-4 h-4" />
              </div>
              <span className="text-[9.5px] font-black text-zinc-200 group-hover:text-amber-300 transition-colors text-center">
                天赋树入口
              </span>
            </div>

            {/* 右侧：基础属性显示 (紧凑 gap-1.5 布局，数据紧贴标题线下方) */}
            <div className="col-span-2 bg-zinc-950/70 border border-zinc-800 rounded-xl p-2.5 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[9.5px] font-black text-amber-300 border-b border-zinc-850 pb-1.5 shrink-0">
                <span className="flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-400" /> 基础属性
                </span>
                <button
                  onClick={() => setShowDetailedStats(true)}
                  className="text-[8.5px] font-bold text-amber-400 hover:underline cursor-pointer flex items-center gap-0.5"
                >
                  详细属性 ›
                </button>
              </div>

              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[8.5px] pt-0.5">
                {/* 1. 生命 */}
                <div className="flex items-center justify-between text-zinc-300">
                  <span className="text-zinc-500 font-bold flex items-center gap-0.5">
                    <Heart className="w-2.5 h-2.5 text-rose-400" /> 生命
                  </span>
                  <span className="font-black text-rose-300">{calculatedStats.maxHp}</span>
                </div>

                {/* 2. 攻击 */}
                <div className="flex items-center justify-between text-zinc-300">
                  <span className="text-zinc-500 font-bold flex items-center gap-0.5">
                    <Sword className="w-2.5 h-2.5 text-amber-400" /> 攻击
                  </span>
                  <span className="font-black text-amber-300">{calculatedStats.attack}</span>
                </div>

                {/* 3. 防御 */}
                <div className="flex items-center justify-between text-zinc-300">
                  <span className="text-zinc-500 font-bold flex items-center gap-0.5">
                    <Shield className="w-2.5 h-2.5 text-sky-400" /> 防御
                  </span>
                  <span className="font-black text-sky-300">{calculatedStats.defense}</span>
                </div>

                {/* 4. 魔力 */}
                <div className="flex items-center justify-between text-zinc-300">
                  <span className="text-zinc-500 font-bold flex items-center gap-0.5">
                    <Wand2 className="w-2.5 h-2.5 text-cyan-400" /> 魔力
                  </span>
                  <span className="font-black text-cyan-300">{calculatedStats.maxMp}</span>
                </div>

                {/* 5. 暴击 */}
                <div className="flex items-center justify-between text-zinc-300">
                  <span className="text-zinc-500 font-bold flex items-center gap-0.5">
                    <Sparkles className="w-2.5 h-2.5 text-purple-400" /> 暴击
                  </span>
                  <span className="font-black text-purple-300">
                    {(calculatedStats.critRate * 100).toFixed(0)}%
                  </span>
                </div>

                {/* 6. 暴伤 */}
                <div className="flex items-center justify-between text-zinc-300">
                  <span className="text-zinc-500 font-bold flex items-center gap-0.5">
                    <Flame className="w-2.5 h-2.5 text-amber-500" /> 暴伤
                  </span>
                  <span className="font-black text-amber-200">
                    {(calculatedStats.critDmg * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 详细属性弹窗 */}
      <DetailedStatsModal
        isOpen={showDetailedStats}
        heroName={awakenedName}
        stats={calculatedStats}
        onClose={() => setShowDetailedStats(false)}
      />

      {/* 天赋树弹窗 */}
      {showTalentModal && (
        <div
          onClick={() => setShowTalentModal(false)}
          className="fixed inset-0 z-[10001] bg-transparent flex items-center justify-center p-3 animate-in fade-in duration-150 pointer-events-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-900 border border-zinc-700 rounded-2xl w-[92%] max-w-[380px] h-[460px] max-h-[68vh] p-4 flex flex-col gap-3 shadow-2xl overflow-y-auto"
          >
            <header className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h3 className="text-sm font-black text-amber-300 flex items-center gap-1.5">
                <Sliders className="w-4 h-4" /> 【{config.name}】天赋树
              </h3>
              <button
                onClick={() => setShowTalentModal(false)}
                className="p-1 text-zinc-400 hover:text-zinc-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </header>
            <HeroTalentPanel heroId={heroId} />
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default HeroDetailModal;
