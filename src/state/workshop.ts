import type { GameState, PlayerStats } from '../types/game';
import { RECIPES_CONFIG } from '../data/recipes';
import { ITEMS_CONFIG } from '../data/items';
import { GAME_CONSTANTS } from '../data/gameConstants';
import type { UpdateResult } from './types';
import { NO_OP } from './types';

// 工坊制造：校验材料后扣费，处理胶囊充能/温室扩建等特殊配方
export const craftItemUpdate = (state: GameState, recipeId: string): UpdateResult<boolean> => {
  const recipe = RECIPES_CONFIG[recipeId];
  if (!recipe) return NO_OP(state);

  if (recipe.special === 'greenhouse_expansion' && state.greenhouse.unlockedSlotsCount >= GAME_CONSTANTS.GREENHOUSE_MAX_SLOTS) {
    return NO_OP(state);
  }

  // 图纸解锁（ticket 10）：配方需先获得对应图纸（背包持有，知识类物品不消耗）
  if (recipe.blueprintId && (state.inventory[recipe.blueprintId] || 0) < 1) {
    return NO_OP(state);
  }

  // 校验材料
  const hasEnough = Object.entries(recipe.cost).every(([item, qty]) => (state.inventory[item] || 0) >= qty);
  if (!hasEnough) return NO_OP(state);

  // 执行更新
  const newInventory = { ...state.inventory };
  Object.entries(recipe.cost).forEach(([item, qty]) => { newInventory[item] = (newInventory[item] || 0) - qty; });

  const newExploration = { ...state.exploration };
  if (recipe.special === 'capsule_charge' && recipe.capsuleTarget) {
    newExploration.capsulesCharge = {
      ...state.exploration.capsulesCharge,
      [recipe.capsuleTarget]: (state.exploration.capsulesCharge[recipe.capsuleTarget] || 0) + (recipe.capsuleAmount || 3)
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
        greenhouse: { ...state.greenhouse, unlockedSlotsCount: nextCount, slots: newSlots }
      },
      result: true
    };
  } else {
    Object.entries(recipe.reward).forEach(([item, qty]) => { newInventory[item] = (newInventory[item] || 0) + qty; });
  }

  return {
    state: { ...state, inventory: newInventory, exploration: newExploration },
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
