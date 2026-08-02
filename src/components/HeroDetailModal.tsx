import React, { useState, useMemo } from 'react';
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
import EquipmentDetailModal from './EquipmentDetailModal';
import EquipSelectorModal from './EquipSelectorModal';
import { UI_TOKENS } from '../data/uiConstants';
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

  const [selectedEquipSlot, setSelectedEquipSlot] = useState<EquipmentSlot | null>(null);
  const [showEquipDetailModal, setShowEquipDetailModal] = useState(false);
  const [showEquipSelectorModal, setShowEquipSelectorModal] = useState(false);

  if (!isOpen || !heroId) return null;

  const heroIds = Object.keys(state.heroes);
  const currentIndex = heroIds.indexOf(heroId);
  const config = HEROES_CONFIG[heroId];
  const hero = state.heroes[heroId];
  if (!config || !hero) return null;

  const heroEquip = state.equipment?.[heroId] || { weapon: null, armor: null, trinket: null };
  const firstChar = config.name ? config.name[0] : '?';
  const awakenedName = getAwakenedName(heroId, hero) || config.name;

  // 装备加成属性（含同阵营 30% 穿戴加成）
  const { flat: equipFlat } = useMemo(
    () => getHeroEquipmentBonus(heroEquip, config.faction),
    [heroEquip, config.faction]
  );

  // 核心基础面板属性计算 (Memoized 避免频繁 Tick 重复计算)
  const calculatedStats = useMemo(
    () =>
      calculateEntityStats({
        baseAttributes: {
          attack: config.baseAttack + (hero.level - 1) * 3 + (equipFlat.attack || 0),
          defense: config.baseDefense + (hero.level - 1) * 1 + (equipFlat.defense || 0),
          maxHp: config.baseHp + (hero.level - 1) * 10 + (equipFlat.maxHp || 0),
          maxMp: 50,
          critRate: 0.05,
          critDmg: 1.50
        }
      }),
    [config.baseAttack, config.baseDefense, config.baseHp, hero.level, equipFlat]
  );

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
      const slots: EquipmentSlot[] = ['weapon', 'armor', 'trinket'];
      slots.forEach(slot => {
        if (heroEquip[slot]) {
          unequipItem(heroId, slot);
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

  const handleEquipSlotClick = (slot: EquipmentSlot) => {
    setSelectedEquipSlot(slot);
    if (heroEquip[slot]) {
      setShowEquipDetailModal(true);
    } else {
      setShowEquipSelectorModal(true);
    }
  };

  // 渲染单个装备槽位 (放大为 w-15 h-15 框，Icon 放大为 w-6 h-6)
  const renderEquipSlot = (slot: EquipmentSlot, slotLabel: string, IconComponent: any) => {
    const item = heroEquip[slot];
    const itemConfig = item ? ITEMS_CONFIG[item.itemId] : null;

    return (
      <div
        onClick={() => handleEquipSlotClick(slot)}
        className="flex flex-col items-center gap-0.5 cursor-pointer group active:scale-95 transition-transform"
        title={item ? `查看【${itemConfig?.name || slotLabel}】装备详情` : `选择【${slotLabel}】装备`}
      >
        <div
          className={`w-15 h-15 aspect-square rounded-xl border flex flex-col items-center justify-center relative overflow-hidden transition-all ${
            item
              ? 'bg-zinc-950/90 border-amber-500/40 shadow-sm shadow-amber-950/30 group-hover:border-amber-400'
              : 'bg-zinc-950/40 border-zinc-800 border-dashed group-hover:border-amber-500/60'
          }`}
        >
          <IconComponent className={`w-6 h-6 ${item ? 'text-amber-400' : 'text-zinc-600 group-hover:text-amber-300'}`} />
          {item && item.enhance > 0 && (
            <span className="absolute top-0.5 right-0.5 text-[7.5px] font-black text-amber-300 bg-black/80 px-1 rounded border border-amber-500/30">
              +{item.enhance}
            </span>
          )}
        </div>
        <span className="text-[8.5px] font-bold text-zinc-300 max-w-[58px] truncate text-center leading-tight mt-0.5 group-hover:text-amber-200">
          {itemConfig?.name || slotLabel}
        </span>
      </div>
    );
  };

  // 渲染技能槽位占位 (放大为 w-15 h-15 框，Icon 放大为 w-6 h-6)
  const renderSkillSlot = (skillIndex: number) => {
    return (
      <div className="flex flex-col items-center gap-0.5">
        <div
          className="w-15 h-15 aspect-square rounded-xl border border-zinc-800 bg-zinc-950/60 flex items-center justify-center relative overflow-hidden"
          title={`技能 ${skillIndex}`}
        >
          <Flame className="w-6 h-6 text-purple-400/70" />
        </div>
        <span className="text-[8.5px] font-bold text-zinc-400 max-w-[58px] truncate text-center leading-tight mt-0.5">
          技能 {skillIndex}
        </span>
      </div>
    );
  };

  const modalContent = (
    <div
      onClick={onClose}
      className={UI_TOKENS.modalBackdrop}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={UI_TOKENS.modalContainerStandard}
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

        {/* 充实饱满的主体区域 */}
        <div className="flex-1 flex flex-col justify-between pt-1 pb-0.5 min-h-0">
          {/* 上半部分三列布局 (装备框/技能框放大为 w-15 h-15，大头像放大为 w-22 h-22) */}
          <div className="grid grid-cols-3 gap-2 items-stretch bg-zinc-950/60 p-2 rounded-xl border border-zinc-800/80 shrink-0">
            {/* 左侧列：三槽装备 + 底部【一键装备/一键卸下】 */}
            <div className="flex flex-col items-center justify-between">
              <div className="flex flex-col gap-0.5 items-center w-full">
                {renderEquipSlot('weapon', '武器', Sword)}
                {renderEquipSlot('armor', '防具', Shield)}
                {renderEquipSlot('trinket', '饰品', Sparkles)}
              </div>
              <button
                onClick={handleToggleEquipAll}
                className="w-full py-1.5 rounded-lg text-[8.5px] font-black text-zinc-200 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 cursor-pointer active:scale-95 truncate mt-1"
              >
                {hasAnyEquip ? '一键卸下' : '一键装备'}
              </button>
            </div>

            {/* 中间列：放大大头像 w-22 h-22、名称、标签、经验条、后勤/简述 + 底部【升级】 */}
            <div className="flex flex-col items-center justify-between text-center gap-1 min-h-0">
              <div className="flex flex-col items-center gap-0.5 w-full">
                {/* 正方形大头像 (w-18 h-18) */}
                <div className="w-18 h-18 aspect-square rounded-2xl bg-zinc-950 border-2 border-amber-500/40 flex items-center justify-center relative overflow-hidden shadow-lg shadow-amber-950/20">
                  {config.avatar ? (
                    <img src={config.avatar} alt={config.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-black text-amber-300">{firstChar}</span>
                  )}
                  {hero.awakened && (
                    <div className="absolute top-0.5 left-0.5 bg-amber-500 text-zinc-950 text-[7px] font-black px-1 rounded shadow">
                      觉醒
                    </div>
                  )}
                </div>

                {/* 名称与等级 */}
                <span className="text-xs font-black text-zinc-100 truncate max-w-[96px] leading-tight">
                  {awakenedName}
                </span>
                <span className="text-[9px] text-amber-400 font-bold leading-tight">
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

              {/* 中间新增：经验进度条 & 后勤驻守/传记卡片 */}
              <div className="w-full flex flex-col gap-1 px-0.5 my-auto">
                {/* 经验进度条 */}
                <div className="w-full bg-zinc-900/90 rounded-lg p-1 border border-zinc-800/80 flex flex-col gap-0.5 text-left shadow-inner">
                  <div className="flex items-center justify-between text-[7.5px] font-bold text-zinc-400 px-0.5">
                    <span className="text-amber-400/90 font-medium">经验值</span>
                    <span className="text-amber-300 font-mono">
                      {hero.exp}/{hero.level * COMBAT_CONFIG.expPerLevel}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-850">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.max(0, (hero.exp / (hero.level * COMBAT_CONFIG.expPerLevel)) * 100))}%`
                      }}
                    />
                  </div>
                </div>

                {/* 后勤驻守特长 / 英雄背景 */}
                <div className="w-full bg-zinc-900/90 rounded-lg p-1 border border-zinc-800/80 text-left flex flex-col gap-0.5 shadow-sm">
                  {config.dutyMeta ? (
                    <>
                      <div className="text-[7.5px] font-black text-amber-400/90 flex items-center gap-1">
                        <Award className="w-2.5 h-2.5 text-amber-400" />
                        后勤驻守特长
                      </div>
                      <div className="text-[7.5px] font-semibold text-zinc-300 leading-tight">
                        {config.dutyMeta.facilitySpeedMultiplier && `⚡ 生产速度 +${Math.round(config.dutyMeta.facilitySpeedMultiplier * 100)}%`}
                        {config.dutyMeta.facilityYieldMultiplier && `🌾 额外产出 +${Math.round(config.dutyMeta.facilityYieldMultiplier * 100)}%`}
                        {config.dutyMeta.facilityCostReduction && `📦 配方消耗 -${Math.round(config.dutyMeta.facilityCostReduction * 100)}%`}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-[7.5px] font-black text-zinc-400 flex items-center gap-1">
                        <Award className="w-2.5 h-2.5 text-zinc-400" />
                        英雄简述
                      </div>
                      <p className="text-[7.5px] text-zinc-400 leading-tight italic line-clamp-2">
                        "{config.backstory}"
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* 中列底部按钮: 升级 */}
              <button
                onClick={handleLevelUp}
                className="w-full py-1.5 rounded-lg text-[8.5px] font-black text-amber-300 bg-amber-950/50 hover:bg-amber-900/60 border border-amber-500/40 cursor-pointer active:scale-95 truncate mt-0.5"
              >
                升级
              </button>
            </div>

            {/* 右侧列：三项技能 + 底部【升星/觉醒】 */}
            <div className="flex flex-col items-center justify-between">
              <div className="flex flex-col gap-0.5 items-center w-full">
                {renderSkillSlot(1)}
                {renderSkillSlot(2)}
                {renderSkillSlot(3)}
              </div>

              {/* 右列底部按钮: 升星 / 觉醒 */}
              {hero.star < STAR_MAX ? (
                <button
                  onClick={handleStarUp}
                  disabled={totalAvailableShards < shardCost}
                  className={`w-full py-1.5 rounded-lg text-[8.5px] font-black transition-all border cursor-pointer truncate disabled:cursor-not-allowed mt-1 ${
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
                  className={`w-full py-1.5 rounded-lg text-[8.5px] font-black transition-all border cursor-pointer truncate disabled:cursor-not-allowed mt-1 ${
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
                  className="w-full py-1.5 rounded-lg text-[8.5px] font-black bg-zinc-950 border border-zinc-800 text-zinc-500 cursor-not-allowed truncate mt-1"
                >
                  已觉醒
                </button>
              )}
            </div>
          </div>

          {/* 下半部分左右布局 (定高 h-[125px] 紧凑面板) */}
          <div className="grid grid-cols-3 gap-2 h-[125px] shrink-0">
            {/* 左侧：天赋树入口 */}
            <div
              onClick={() => setShowTalentModal(true)}
              className="bg-zinc-950/70 border border-zinc-800 hover:border-amber-500/50 rounded-xl p-2.5 flex flex-col items-center justify-center gap-1.5 cursor-pointer group transition-all h-full"
            >
              <div className="w-8.5 h-8.5 rounded-full bg-amber-950/40 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                <Sliders className="w-4 h-4" />
              </div>
              <span className="text-[9.5px] font-black text-zinc-200 group-hover:text-amber-300 transition-colors text-center">
                天赋树入口
              </span>
            </div>

            {/* 右侧：基础属性显示 */}
            <div className="col-span-2 bg-zinc-950/70 border border-zinc-800 rounded-xl p-2 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between text-[9.5px] font-black text-amber-300 border-b border-zinc-800/80 pb-1 px-1 shrink-0">
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

              <div className="grid grid-cols-2 gap-1.5 pt-1 flex-1 items-center">
                {/* 1. 生命 */}
                <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-zinc-900/80 border border-zinc-800/70 text-[8.5px]">
                  <span className="text-zinc-400 font-bold flex items-center gap-1">
                    <Heart className="w-3 h-3 text-rose-400" /> 生命
                  </span>
                  <span className="font-black text-rose-300">{calculatedStats.maxHp}</span>
                </div>

                {/* 2. 攻击 */}
                <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-zinc-900/80 border border-zinc-800/70 text-[8.5px]">
                  <span className="text-zinc-400 font-bold flex items-center gap-1">
                    <Sword className="w-3 h-3 text-amber-400" /> 攻击
                  </span>
                  <span className="font-black text-amber-300">{calculatedStats.attack}</span>
                </div>

                {/* 3. 防御 */}
                <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-zinc-900/80 border border-zinc-800/70 text-[8.5px]">
                  <span className="text-zinc-400 font-bold flex items-center gap-1">
                    <Shield className="w-3 h-3 text-sky-400" /> 防御
                  </span>
                  <span className="font-black text-sky-300">{calculatedStats.defense}</span>
                </div>

                {/* 4. 魔力 */}
                <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-zinc-900/80 border border-zinc-800/70 text-[8.5px]">
                  <span className="text-zinc-400 font-bold flex items-center gap-1">
                    <Wand2 className="w-3 h-3 text-cyan-400" /> 魔力
                  </span>
                  <span className="font-black text-cyan-300">{calculatedStats.maxMp}</span>
                </div>

                {/* 5. 暴击 */}
                <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-zinc-900/80 border border-zinc-800/70 text-[8.5px]">
                  <span className="text-zinc-400 font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-purple-400" /> 暴击
                  </span>
                  <span className="font-black text-purple-300">
                    {(calculatedStats.critRate * 100).toFixed(0)}%
                  </span>
                </div>

                {/* 6. 暴伤 */}
                <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-zinc-900/80 border border-zinc-800/70 text-[8.5px]">
                  <span className="text-zinc-400 font-bold flex items-center gap-1">
                    <Flame className="w-3 h-3 text-amber-500" /> 暴伤
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
            className="bg-zinc-900 border border-zinc-750 rounded-2xl w-[92%] max-w-[380px] h-[460px] max-h-[68vh] p-4 flex flex-col gap-3 shadow-2xl overflow-y-auto"
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

      {/* 装备详情弹窗 */}
      {selectedEquipSlot && heroEquip[selectedEquipSlot] && showEquipDetailModal && (
        <EquipmentDetailModal
          isOpen={showEquipDetailModal}
          heroId={heroId}
          slot={selectedEquipSlot}
          onClose={() => setShowEquipDetailModal(false)}
        />
      )}

      {/* 未装备选择器弹窗 */}
      {selectedEquipSlot && showEquipSelectorModal && (
        <EquipSelectorModal
          isOpen={showEquipSelectorModal}
          heroId={heroId}
          slot={selectedEquipSlot}
          onClose={() => setShowEquipSelectorModal(false)}
          onSelectSuccess={() => setShowEquipSelectorModal(false)}
        />
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default HeroDetailModal;
