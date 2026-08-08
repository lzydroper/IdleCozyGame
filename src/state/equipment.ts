import type { GameState, HeroEquipment, EquippedItem, EquipmentSlot, HeroFaction } from '../types/game';
import type { EquipmentStats } from '../data/equipment';
import {
  EQUIPMENT_CONFIG,
  EQUIPMENT_SETS,
  ENHANCE_MAX,
  MYTHIC_STAT_MULTIPLIER,
  FACTION_EQUIPMENT_BONUS_MULTIPLIER,
  enhanceCost,
  FORGE_COST
} from '../data/equipment';
import type { StatModifier } from './statSystem';
import type { UpdateResult } from './types';
import { NO_OP } from './types';

// 可穿戴装备判定（ADR-0014 修订）：EQUIPMENT_CONFIG 中定义的系列装备才实例化；
// 强化魔晶/图纸等装备生态物品仍为计数物品。
export const isWearableEquipment = (itemId: string): boolean => !!EQUIPMENT_CONFIG[itemId];

// 物品入账（ADR-0014 修订）：可穿戴装备 → equipmentInventory 追加 +0 实例；其余 → inventory 计数。
// 返回新的 inventory 与 equipmentInventory，供调用方 spread 进 state。
export const addItemRewards = (
  inventory: Record<string, number>,
  equipmentInventory: Record<string, EquippedItem[]>,
  items: Record<string, number>
): { inventory: Record<string, number>; equipmentInventory: Record<string, EquippedItem[]> } => {
  const nextInventory = { ...inventory };
  const nextEquipmentInventory = { ...equipmentInventory };
  for (const [id, qty] of Object.entries(items)) {
    if (qty === 0) continue;
    if (isWearableEquipment(id)) {
      const list = nextEquipmentInventory[id] ? [...nextEquipmentInventory[id]] : [];
      for (let i = 0; i < qty; i++) list.push({ itemId: id, enhance: 0, mythic: false });
      nextEquipmentInventory[id] = list;
    } else {
      nextInventory[id] = (nextInventory[id] || 0) + qty;
    }
  }
  return { inventory: nextInventory, equipmentInventory: nextEquipmentInventory };
};

// === 装备系统（ticket 10）：穿戴 / 强化 / 神话锻造 / 套装特效 ===
// 装备实例只存「配置 id + 强化等级 + 神话标记」，属性全部由配置计算（数据驱动）。

export const emptyEquipment = (): HeroEquipment => ({ weapon: null, armor: null, trinket: null });

// 单件装备单属性拆分（基础值 / 强化成长，含神话倍率与阵营加成），UI 属性行与聚合共用
export const getEquippedStatParts = (
  item: EquippedItem,
  stat: keyof EquipmentStats,
  heroFaction?: HeroFaction
): { base: number; enhance: number } => {
  const cfg = EQUIPMENT_CONFIG[item.itemId];
  if (!cfg) return { base: 0, enhance: 0 };
  const mult = item.mythic ? MYTHIC_STAT_MULTIPLIER : 1;
  const isFactionMatched = Boolean(heroFaction && cfg.faction === heroFaction);
  const factionMult = isFactionMatched ? FACTION_EQUIPMENT_BONUS_MULTIPLIER : 1.0;
  return {
    base: (cfg.baseStats[stat] || 0) * mult * factionMult,
    enhance: (cfg.statPerEnhance[stat] || 0) * item.enhance * mult * factionMult
  };
};

// 单件装备的总属性：基础 + 强化成长；神话锻造后整体 ×1.5；英雄穿戴同阵营装备时附带阵营加成 (+30%)
export const getEquippedItemStats = (item: EquippedItem, heroFaction?: HeroFaction): EquipmentStats => {
  const stats: EquipmentStats = {};
  (['attack', 'defense', 'maxHp'] as const).forEach(key => {
    const { base, enhance } = getEquippedStatParts(item, key, heroFaction);
    const total = base + enhance;
    if (total > 0) stats[key] = Math.round(total * 10) / 10;
  });
  return stats;
};

// 三槽装备汇总的平值属性（战斗内直接加在英雄基础属性上）
export const getEquippedFlatStats = (equip: HeroEquipment | null, heroFaction?: HeroFaction): EquipmentStats => {
  const flat: EquipmentStats = {};
  if (!equip) return flat;
  (['weapon', 'armor', 'trinket'] as const).forEach(slot => {
    const item = equip[slot];
    if (!item) return;
    const stats = getEquippedItemStats(item, heroFaction);
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
export const getSetBonuses = (equip: HeroEquipment | null): StatModifier[] => {
  const bonus: StatModifier[] = [];
  if (!equip) return bonus;
  const progress = getSetEnhanceProgress(equip);

  Object.entries(progress).forEach(([setId, total]) => {
    const set = EQUIPMENT_SETS[setId];
    if (!set) return;
    // 套装特效：同系列强化总和 ≥ 阈值即触发，多档叠加
    set.tierEffects.forEach(tier => {
      if (total >= tier.threshold) bonus.push(...tier.bonus);
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
      bonus.push(...set.mythicAffix);
    }
  });

  return bonus;
};

// 英雄装备加成汇总（平值 + 百分比统一为修饰符数组），战斗计算与 UI 共用
// （stat-bonus-unification 03：EquipmentStats 仅保留为装备静态属性定义，加成输出统一 StatModifier[]）
export const getHeroEquipmentBonus = (equip: HeroEquipment | null, heroFaction?: HeroFaction): StatModifier[] => {
  const flat = getEquippedFlatStats(equip, heroFaction);
  const mods: StatModifier[] = [];
  if (flat.attack) mods.push({ stat: 'attack', kind: 'flat', value: flat.attack });
  if (flat.defense) mods.push({ stat: 'defense', kind: 'flat', value: flat.defense });
  if (flat.maxHp) mods.push({ stat: 'maxHp', kind: 'flat', value: flat.maxHp });
  return [...mods, ...getSetBonuses(equip)];
};

const writeEquipment = (state: GameState, heroId: string, equip: HeroEquipment): GameState => ({
  ...state,
  equipment: { ...(state.equipment || {}), [heroId]: equip }
});

// === 背包装备实例（ADR-0014 修订） ===

// 从背包装备实例中取出一件（index 提供时按索引取；缺省取强化最高者），返回新实例表与被取实例
const takeInstance = (
  equipmentInventory: Record<string, EquippedItem[]>,
  itemId: string,
  index?: number
): { equipmentInventory: Record<string, EquippedItem[]>; instance: EquippedItem | null } => {
  const list = equipmentInventory[itemId] || [];
  if (list.length === 0) return { equipmentInventory, instance: null };
  // 显式非法 index（越界/非整数）→ 返回失败，暴露调用方状态漂移
  if (index !== undefined && (!Number.isInteger(index) || index < 0 || index >= list.length)) {
    return { equipmentInventory, instance: null };
  }
  const sorted = [...list].sort((a, b) => b.enhance - a.enhance || Number(b.mythic) - Number(a.mythic));
  const bestIndex = list.indexOf(sorted[0]);
  const pickIndex = index !== undefined ? index : bestIndex;
  const instance = list[pickIndex];
  const nextList = [...list];
  nextList.splice(pickIndex, 1);
  const next = { ...equipmentInventory };
  if (nextList.length > 0) next[itemId] = nextList;
  else delete next[itemId];
  return { equipmentInventory: next, instance };
};

// 把一件装备实例放回背包（卸下/换装时保留强化等级与神话状态）
const addInstanceBack = (
  equipmentInventory: Record<string, EquippedItem[]>,
  instance: EquippedItem
): Record<string, EquippedItem[]> => {
  const next = { ...equipmentInventory };
  const list = next[instance.itemId] ? [...next[instance.itemId]] : [];
  list.push({ ...instance });
  next[instance.itemId] = list;
  return next;
};

// 穿戴装备（ADR-0014 修订）：从背包实例表取一件（index 缺省取最高强化）并穿戴，
// 原槽位装备（若有）连强化等级一并返回背包；同物品换装允许（强化随实例保留）
export const equipItemUpdate = (
  state: GameState,
  heroId: string,
  slot: EquipmentSlot,
  itemId: string,
  index?: number
): UpdateResult<boolean> => {
  const cfg = EQUIPMENT_CONFIG[itemId];
  if (!cfg || cfg.slot !== slot) return NO_OP(state);
  if (!state.heroes[heroId]) return NO_OP(state);

  const taken = takeInstance(state.equipmentInventory || {}, itemId, index);
  if (!taken.instance) return NO_OP(state); // 背包无该装备实例

  const equip = state.equipment?.[heroId] || emptyEquipment();
  const prev = equip[slot];
  let nextEquipmentInventory = taken.equipmentInventory;
  if (prev) nextEquipmentInventory = addInstanceBack(nextEquipmentInventory, prev);

  return {
    state: {
      ...writeEquipment(state, heroId, { ...equip, [slot]: taken.instance }),
      equipmentInventory: nextEquipmentInventory
    },
    result: true
  };
};

// 卸下装备（ADR-0014 修订）：装备实例（含强化/神话）返回背包，不丢失强化
export const unequipItemUpdate = (state: GameState, heroId: string, slot: EquipmentSlot): UpdateResult<boolean> => {
  const equip = state.equipment?.[heroId];
  const item = equip?.[slot];
  if (!item) return NO_OP(state);

  const nextEquipmentInventory = addInstanceBack(state.equipmentInventory || {}, item);
  return {
    state: { ...writeEquipment(state, heroId, { ...equip, [slot]: null }), equipmentInventory: nextEquipmentInventory },
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
