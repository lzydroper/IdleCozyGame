import type { GameState, HeroEquipment, EquippedItem, EquipmentSlot } from '../types/game';
import type { EquipmentStats } from '../data/equipment';
import {
  EQUIPMENT_CONFIG,
  EQUIPMENT_SETS,
  ENHANCE_MAX,
  MYTHIC_STAT_MULTIPLIER,
  enhanceCost,
  FORGE_COST
} from '../data/equipment';
import type { CombatBonus } from '../data/bonds';
import type { UpdateResult } from './types';
import { NO_OP } from './types';

// === 装备系统（ticket 10）：穿戴 / 强化 / 神话锻造 / 套装特效 ===
// 装备实例只存「配置 id + 强化等级 + 神话标记」，属性全部由配置计算（数据驱动）。

export const emptyEquipment = (): HeroEquipment => ({ weapon: null, armor: null, trinket: null });

// 单件装备的总属性：基础 + 强化成长；神话锻造后整体 ×1.5（属性加强，强化等级保留）
export const getEquippedItemStats = (item: EquippedItem): EquipmentStats => {
  const cfg = EQUIPMENT_CONFIG[item.itemId];
  if (!cfg) return {};
  const mult = item.mythic ? MYTHIC_STAT_MULTIPLIER : 1;
  const stats: EquipmentStats = {};
  (['attack', 'defense', 'maxHp'] as const).forEach(key => {
    const total = ((cfg.baseStats[key] || 0) + (cfg.statPerEnhance[key] || 0) * item.enhance) * mult;
    if (total > 0) stats[key] = Math.round(total * 10) / 10;
  });
  return stats;
};

// 三槽装备汇总的平值属性（战斗内直接加在英雄基础属性上）
export const getEquippedFlatStats = (equip: HeroEquipment | null): EquipmentStats => {
  const flat: EquipmentStats = {};
  if (!equip) return flat;
  (['weapon', 'armor', 'trinket'] as const).forEach(slot => {
    const item = equip[slot];
    if (!item) return;
    const stats = getEquippedItemStats(item);
    (['attack', 'defense', 'maxHp'] as const).forEach(key => {
      const v = stats[key] || 0;
      if (v !== 0) flat[key] = (flat[key] || 0) + v;
    });
  });
  return flat;
};

// 套装进度：同系列穿戴装备的强化等级总和（3 槽相加，满编 +30 为 90）
export const getSetEnhanceProgress = (equip: HeroEquipment | null): Record<string, number> => {
  const progress: Record<string, number> = {};
  if (!equip) return progress;
  (['weapon', 'armor', 'trinket'] as const).forEach(slot => {
    const item = equip[slot];
    if (!item) return;
    const cfg = EQUIPMENT_CONFIG[item.itemId];
    if (!cfg) return;
    progress[cfg.set] = (progress[cfg.set] || 0) + item.enhance;
  });
  return progress;
};

// 百分比加成汇总：套装特效（达阈值叠加）+ 神话系列共有词条（任意神话装备生效）
export const getSetBonuses = (equip: HeroEquipment | null): CombatBonus => {
  const bonus: CombatBonus = {};
  if (!equip) return bonus;
  const progress = getSetEnhanceProgress(equip);

  Object.entries(progress).forEach(([setId, total]) => {
    const set = EQUIPMENT_SETS[setId];
    if (!set) return;
    // 套装特效：同系列强化总和 ≥ 阈值即触发，多档叠加
    set.tierEffects.forEach(tier => {
      if (total >= tier.threshold) addBonus(bonus, tier.bonus);
    });
  });

  // 神话词条：穿戴该系列任意神话装备即生效（系列共有词条，每系列仅结算一次）
  const affixGranted = new Set<string>();
  (['weapon', 'armor', 'trinket'] as const).forEach(slot => {
    const item = equip[slot];
    if (!item?.mythic) return;
    const cfg = EQUIPMENT_CONFIG[item.itemId];
    const set = cfg && EQUIPMENT_SETS[cfg.set];
    if (set && !affixGranted.has(set.id)) {
      affixGranted.add(set.id);
      addBonus(bonus, set.mythicAffix);
    }
  });

  return bonus;
};

// 英雄装备加成汇总（平值 + 百分比），战斗计算与 UI 共用
export const getHeroEquipmentBonus = (equip: HeroEquipment | null): { flat: EquipmentStats; percent: CombatBonus } => ({
  flat: getEquippedFlatStats(equip),
  percent: getSetBonuses(equip)
});

const addBonus = (target: CombatBonus, src: CombatBonus): void => {
  if (src.attackPercent) target.attackPercent = (target.attackPercent || 0) + src.attackPercent;
  if (src.defensePercent) target.defensePercent = (target.defensePercent || 0) + src.defensePercent;
  if (src.maxHpPercent) target.maxHpPercent = (target.maxHpPercent || 0) + src.maxHpPercent;
};

const writeEquipment = (state: GameState, heroId: string, equip: HeroEquipment): GameState => ({
  ...state,
  equipment: { ...(state.equipment || {}), [heroId]: equip }
});

// 穿戴装备：从库存消耗 1 件对应槽位装备，原装备（若有）返回库存。
// 注意：背包为计数模型，卸下/换装会重置强化等级 —— 同物品重复穿戴直接拒绝（防误操作损失强化）
export const equipItemUpdate = (state: GameState, heroId: string, slot: EquipmentSlot, itemId: string): UpdateResult<boolean> => {
  const cfg = EQUIPMENT_CONFIG[itemId];
  if (!cfg || cfg.slot !== slot) return NO_OP(state);
  if (!state.heroes[heroId]) return NO_OP(state);
  if ((state.inventory[itemId] || 0) < 1) return NO_OP(state);

  const equip = state.equipment?.[heroId] || emptyEquipment();
  const prev = equip[slot];
  if (prev?.itemId === itemId) return NO_OP(state); // 同物品已在槽位：拒绝重复穿戴
  const nextInventory = { ...state.inventory, [itemId]: (state.inventory[itemId] || 0) - 1 };
  if (prev) nextInventory[prev.itemId] = (nextInventory[prev.itemId] || 0) + 1;

  return {
    state: { ...writeEquipment(state, heroId, { ...equip, [slot]: { itemId, enhance: 0, mythic: false } }), inventory: nextInventory },
    result: true
  };
};

// 卸下装备：装备返回库存
export const unequipItemUpdate = (state: GameState, heroId: string, slot: EquipmentSlot): UpdateResult<boolean> => {
  const equip = state.equipment?.[heroId];
  const item = equip?.[slot];
  if (!item) return NO_OP(state);

  const nextInventory = { ...state.inventory, [item.itemId]: (state.inventory[item.itemId] || 0) + 1 };
  return {
    state: { ...writeEquipment(state, heroId, { ...equip, [slot]: null }), inventory: nextInventory },
    result: true
  };
};

export type EnhanceFailure = 'no_item' | 'mythic' | 'maxed' | 'no_stone';

// 强化：消耗强化魔晶（随等级递增），+1，上限 +30；神话装备不可再强化
export const enhanceItemUpdate = (state: GameState, heroId: string, slot: EquipmentSlot): UpdateResult<EnhanceFailure | true> => {
  const equip = state.equipment?.[heroId];
  const item = equip?.[slot];
  if (!item) return { state, result: 'no_item' as const };
  if (item.mythic) return { state, result: 'mythic' as const };
  if (item.enhance >= ENHANCE_MAX) return { state, result: 'maxed' as const };

  const cost = enhanceCost(item.enhance);
  if ((state.inventory.enhance_stone || 0) < cost) return { state, result: 'no_stone' as const };

  return {
    state: {
      ...writeEquipment(state, heroId, { ...equip, [slot]: { ...item, enhance: item.enhance + 1 } }),
      inventory: { ...state.inventory, enhance_stone: (state.inventory.enhance_stone || 0) - cost }
    },
    result: true
  };
};

export type ForgeFailure = 'no_item' | 'not_maxed' | 'already_mythic' | 'no_materials';

// 神话锻造：+30 装备消耗材料锻造为神话装备（更名 / 属性加强 / 附加系列词条，强化等级保留）
export const forgeMythicUpdate = (state: GameState, heroId: string, slot: EquipmentSlot): UpdateResult<ForgeFailure | true> => {
  const equip = state.equipment?.[heroId];
  const item = equip?.[slot];
  if (!item) return { state, result: 'no_item' as const };
  if (item.mythic) return { state, result: 'already_mythic' as const };
  if (item.enhance < ENHANCE_MAX) return { state, result: 'not_maxed' as const };

  const lacksMaterial = Object.entries(FORGE_COST).some(([itemId, qty]) => (state.inventory[itemId] || 0) < qty);
  if (lacksMaterial) return { state, result: 'no_materials' };

  const nextInventory = { ...state.inventory };
  Object.entries(FORGE_COST).forEach(([itemId, qty]) => { nextInventory[itemId] = (nextInventory[itemId] || 0) - qty; });

  return {
    state: {
      ...writeEquipment(state, heroId, { ...equip, [slot]: { ...item, mythic: true } }),
      inventory: nextInventory
    },
    result: true
  };
};
