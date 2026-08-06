import type { GameState, PlayerStats } from '../types/game';
import type { Recipe } from '../types/config';
import type { ItemCategory } from '../data/items';
import { RECIPES_CONFIG } from '../data/recipes';
import { ITEMS_CONFIG } from '../data/items';
import { GAME_CONSTANTS } from '../data/gameConstants';
import { addItemRewards } from './equipment';
import type { UpdateResult } from './types';
import { NO_OP } from './types';

// === 配方文案/分类推导（ticket 01：name/description 已删除，从产出物完全推导） ===

// reward 主产物：数量最大者（现有配方均为单产物）
export const getRecipeMainReward = (recipe: Recipe): [string, number] | null => {
  const entries = Object.entries(recipe.reward || {});
  if (entries.length === 0) return null;
  return entries.reduce((a, b) => (b[1] > a[1] ? b : a));
};

// 显示名：「合成 {主产物名} ×N」；无 reward 配方兜底（充能 → capsuleTarget 产物名；其他 → displayName）
export const getRecipeDisplayName = (recipe: Recipe): string => {
  const main = getRecipeMainReward(recipe);
  if (main) {
    const label = ITEMS_CONFIG[main[0]]?.name || main[0];
    return `合成 ${label} ×${main[1]}`;
  }
  if (recipe.special === 'capsule_charge' && recipe.capsuleTarget) {
    const label = ITEMS_CONFIG[recipe.capsuleTarget]?.name || recipe.capsuleTarget;
    return `合成 ${label}`;
  }
  return `合成 ${recipe.displayName || recipe.id}`;
};

// 描述：取主产物的物品描述；无 reward 配方用显式 description 兜底（如建筑类温室扩建）
export const getRecipeDescription = (recipe: Recipe): string => {
  const main = getRecipeMainReward(recipe);
  return main ? ITEMS_CONFIG[main[0]]?.description || '' : recipe.description || '';
};

// 分类：显式 category 优先，否则从 reward 主产物的物品类别推导
export const getRecipeCategory = (recipe: Recipe): ItemCategory | 'building' => {
  if (recipe.category) return recipe.category;
  const main = getRecipeMainReward(recipe);
  return (main ? ITEMS_CONFIG[main[0]]?.category : undefined) ?? 'resource';
};

// 批量上限（ticket 04）：每种 cost 材料可支撑的份数取最小；温室扩建固定 1；
// 配方是否可见由 isRecipeVisible 负责，此函数仅计算批量滑条上限
export const computeMaxBatch = (state: GameState, recipe: Recipe): number => {
  if (recipe.special === 'greenhouse_expansion') return 1;
  const costEntries = Object.entries(recipe.cost);
  if (costEntries.length === 0) return 1;
  return Math.min(...costEntries.map(([item, qty]) => Math.floor((state.inventory[item] || 0) / qty)));
};

// 配方可见性（ticket 03）：配方可见 ⟺ 存在合成可能性——
// 蓝图锁定（未获得图纸）与温室扩建已达上限 → 隐藏；材料不足不影响可见性
export const isRecipeVisible = (state: GameState, recipe: Recipe): boolean => {
  if (recipe.blueprintId && (state.inventory[recipe.blueprintId] || 0) < 1) return false;
  if (
    recipe.special === 'greenhouse_expansion' &&
    state.greenhouse.unlockedSlotsCount >= GAME_CONSTANTS.GREENHOUSE_MAX_SLOTS
  ) {
    return false;
  }
  return true;
};

// 工坊制造：校验材料后扣费，处理胶囊充能/温室扩建等特殊配方；count 支持原子批量（ticket 04）
export const craftItemUpdate = (state: GameState, recipeId: string, count = 1): UpdateResult<boolean> => {
  const recipe = RECIPES_CONFIG[recipeId];
  if (!recipe || count <= 0) return NO_OP(state);

  if (recipe.special === 'greenhouse_expansion') {
    if (state.greenhouse.unlockedSlotsCount >= GAME_CONSTANTS.GREENHOUSE_MAX_SLOTS) return NO_OP(state);
    if (count !== 1) return NO_OP(state); // 禁批量（ticket 04）
  }

  // 图纸解锁（ticket 10）：配方需先获得对应图纸（背包持有，知识类物品不消耗）
  if (recipe.blueprintId && (state.inventory[recipe.blueprintId] || 0) < 1) {
    return NO_OP(state);
  }

  // 校验材料（批量按 cost × count，不足则整体拒绝、无部分扣料）
  const hasEnough = Object.entries(recipe.cost).every(([item, qty]) => (state.inventory[item] || 0) >= qty * count);
  if (!hasEnough) return NO_OP(state);

  // 执行更新
  const newInventory = { ...state.inventory };
  const newEquipmentInventory = { ...state.equipmentInventory };
  Object.entries(recipe.cost).forEach(([item, qty]) => { newInventory[item] = (newInventory[item] || 0) - qty * count; });

  const newExploration = { ...state.exploration };
  if (recipe.special === 'capsule_charge' && recipe.capsuleTarget) {
    newExploration.capsulesCharge = {
      ...state.exploration.capsulesCharge,
      [recipe.capsuleTarget]: (state.exploration.capsulesCharge[recipe.capsuleTarget] || 0) + (recipe.capsuleAmount || 3) * count
    };
  } else if (recipe.special === 'greenhouse_expansion') {
    const currentCount = state.greenhouse.unlockedSlotsCount;
    const nextCount = currentCount + GAME_CONSTANTS.GREENHOUSE_EXPANSION_INCREMENT;
    const newSlots = [...state.greenhouse.slots];
    for (let i = currentCount + 1; i <= nextCount; i++) {
      newSlots.push({ id: i, cropId: null, growthProgress: 0, growthTimeLeft: 0, isWatered: false });
    }
    return {
      state: {
        ...state,
        inventory: newInventory,
        equipmentInventory: newEquipmentInventory,
        greenhouse: { ...state.greenhouse, unlockedSlotsCount: nextCount, slots: newSlots }
      },
      result: true
    };
  } else {
    // 批量产出：reward 各项 ×count 后一次入账（装备实例化由 addItemRewards 处理）
    const scaledReward = Object.fromEntries(
      Object.entries(recipe.reward).map(([k, v]) => [k, v * count])
    );
    const rewards = addItemRewards(newInventory, newEquipmentInventory, scaledReward);
    return {
      state: { ...state, inventory: rewards.inventory, equipmentInventory: rewards.equipmentInventory, exploration: newExploration },
      result: true
    };
  }

  return {
    state: { ...state, inventory: newInventory, equipmentInventory: newEquipmentInventory, exploration: newExploration },
    result: true
  };
};

// 使用生存补给品：应用其 useEffect（恢复属性/调整污染度）；qty 支持批量（ADR-0016）
export const applySupplyItemUpdate = (state: GameState, itemId: string, qty = 1): UpdateResult<boolean> => {
  const currentQty = state.inventory[itemId] || 0;
  if (currentQty <= 0 || qty <= 0) return NO_OP(state);

  const meta = ITEMS_CONFIG[itemId];
  if (!meta?.useEffect) return NO_OP(state);

  const useQty = Math.min(qty, currentQty);

  const newInventory = { ...state.inventory };
  newInventory[itemId] = currentQty - useQty;

  const newPlayer = { ...state.player };
  const newExploration = { ...state.exploration };

  // 属性上限统一读角色最大属性（ADR-0016，消除 isNovaPresent 硬编码的 100/130）
  const STAT_MAX: Record<string, number> = {
    food: state.player.maxFood,
    energy: state.player.maxEnergy,
    sanity: state.player.maxSanity
  };

  if (meta.useEffect.stats) {
    Object.entries(meta.useEffect.stats).forEach(([stat, val]) => {
      const key = stat as keyof PlayerStats;
      const max = STAT_MAX[stat] ?? 100;
      newPlayer[key] = Math.min(max, Math.max(0, (newPlayer[key] as number) + val * useQty)) as never;
    });
  }

  if (meta.useEffect.pollution !== undefined) {
    newExploration.dreamPollution = Math.max(0, newExploration.dreamPollution + meta.useEffect.pollution * useQty);
  }

  // 梦境充能（ADR-0016）：消耗 1 个胶囊 → 对应 capsulesCharge +1 次（不可变更新，防共享引用污染）
  if (meta.useEffect.capsuleCharge) {
    Object.entries(meta.useEffect.capsuleCharge).forEach(([key, val]) => {
      newExploration.capsulesCharge = {
        ...newExploration.capsulesCharge,
        [key]: (newExploration.capsulesCharge[key] || 0) + val * useQty
      };
    });
  }

  return {
    state: {
      ...state,
      inventory: newInventory,
      player: newPlayer,
      exploration: newExploration
    },
    result: true
  };
};
