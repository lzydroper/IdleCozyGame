import type { GameState } from '../types/game';
import { CROPS_CONFIG } from '../data/crops';
import { GAME_CONSTANTS } from '../data/gameConstants';
import type { UpdateResult } from './types';
import { NO_OP } from './types';

// 种植作物：校验种子与空闲槽位后种下
export const plantCropUpdate = (state: GameState, slotId: number, cropId: string): UpdateResult<boolean> => {
  const cropConfig = CROPS_CONFIG[cropId as keyof typeof CROPS_CONFIG];
  if (!cropConfig) return NO_OP(state);

  const seedId = Object.keys(cropConfig.seedCost)[0];
  const seedQtyNeeded = (cropConfig.seedCost as Record<string, number>)[seedId] || 0;

  const targetSlot = state.greenhouse.slots.find(s => s.id === slotId && s.cropId === null);
  if (!targetSlot) return NO_OP(state);
  if ((state.inventory[seedId] || 0) < seedQtyNeeded) return NO_OP(state);

  return {
    state: {
      ...state,
      inventory: { ...state.inventory, [seedId]: (state.inventory[seedId] || 0) - seedQtyNeeded },
      greenhouse: {
        ...state.greenhouse,
        slots: state.greenhouse.slots.map(s =>
          s.id === slotId
            ? { ...s, cropId, growthProgress: 0, growthTimeLeft: cropConfig.growthTime, isWatered: false }
            : s
        )
      }
    },
    result: true
  };
};

// 给单个槽位浇水（消耗 2 点魔能）
export const waterSlotUpdate = (state: GameState, slotId: number): UpdateResult<boolean> => {
  if (state.player.energy < GAME_CONSTANTS.WATER_ENERGY_COST) return NO_OP(state);

  let success = false;
  const updatedSlots = state.greenhouse.slots.map(slot => {
    if (slot.id === slotId && slot.cropId !== null && !slot.isWatered) {
      success = true;
      return { ...slot, isWatered: true };
    }
    return slot;
  });

  if (!success) return NO_OP(state);

  return {
    state: {
      ...state,
      player: {
        ...state.player,
        energy: Math.max(0, state.player.energy - GAME_CONSTANTS.WATER_ENERGY_COST)
      },
      greenhouse: {
        ...state.greenhouse,
        slots: updatedSlots
      }
    },
    result: true
  };
};

// 一键浇水：批量给所有缺水槽位浇水，返回实际浇灌数量
export const batchWaterUpdate = (state: GameState): UpdateResult<number> => {
  const needWaterSlots = state.greenhouse.slots.filter(s => s.cropId !== null && !s.isWatered);
  if (needWaterSlots.length === 0 || state.player.energy < GAME_CONSTANTS.WATER_ENERGY_COST) {
    return { state, result: 0 };
  }

  const maxWaterable = Math.floor(state.player.energy / GAME_CONSTANTS.WATER_ENERGY_COST);
  const actualWaterCount = Math.min(needWaterSlots.length, maxWaterable);
  if (actualWaterCount <= 0) return { state, result: 0 };

  let energy = state.player.energy;
  const updatedSlots = state.greenhouse.slots.map(slot => {
    if (slot.cropId !== null && !slot.isWatered && energy >= GAME_CONSTANTS.WATER_ENERGY_COST) {
      energy -= GAME_CONSTANTS.WATER_ENERGY_COST;
      return { ...slot, isWatered: true };
    }
    return slot;
  });

  return {
    state: {
      ...state,
      player: { ...state.player, energy },
      greenhouse: { ...state.greenhouse, slots: updatedSlots }
    },
    result: actualWaterCount
  };
};

// 收割单个成熟槽位，返回获得物（失败返回 null）
export const harvestSlotUpdate = (state: GameState, slotId: number): UpdateResult<Record<string, number> | null> => {
  const targetSlot = state.greenhouse.slots.find(s => s.id === slotId);
  if (!targetSlot || !targetSlot.cropId || targetSlot.growthProgress < 100) {
    return { state, result: null };
  }

  const config = CROPS_CONFIG[targetSlot.cropId as keyof typeof CROPS_CONFIG];
  const gatheredItems: Record<string, number> = { ...config.yields };

  const newInventory = { ...state.inventory };
  Object.entries(config.yields).forEach(([item, qty]) => {
    newInventory[item] = (newInventory[item] || 0) + qty;
  });

  const updatedSlots = state.greenhouse.slots.map(s => {
    if (s.id === slotId) {
      return { ...s, cropId: null, growthProgress: 0, growthTimeLeft: 0, isWatered: false };
    }
    return s;
  });

  return {
    state: {
      ...state,
      inventory: newInventory,
      greenhouse: { ...state.greenhouse, slots: updatedSlots }
    },
    result: gatheredItems
  };
};

// 一键收割所有成熟槽位，返回累计收获（无成熟则 null）
export const batchHarvestUpdate = (state: GameState): UpdateResult<Record<string, number> | null> => {
  const slotsToHarvest = state.greenhouse.slots.filter(s => s.cropId !== null && s.growthProgress >= 100);
  if (slotsToHarvest.length === 0) return { state, result: null };

  const accumulatedYields: Record<string, number> = {};
  const newInventory = { ...state.inventory };

  slotsToHarvest.forEach(slot => {
    const config = CROPS_CONFIG[slot.cropId as keyof typeof CROPS_CONFIG];
    Object.entries(config.yields).forEach(([item, qty]) => {
      accumulatedYields[item] = (accumulatedYields[item] || 0) + qty;
      newInventory[item] = (newInventory[item] || 0) + qty;
    });
  });

  const updatedSlots = state.greenhouse.slots.map(s => {
    if (s.cropId !== null && s.growthProgress >= 100) {
      return { ...s, cropId: null, growthProgress: 0, growthTimeLeft: 0, isWatered: false };
    }
    return s;
  });

  return {
    state: {
      ...state,
      inventory: newInventory,
      greenhouse: { ...state.greenhouse, slots: updatedSlots }
    },
    result: accumulatedYields
  };
};

// 一键播种：把空闲槽位全部种上指定作物
export const batchPlantUpdate = (state: GameState, cropId: string): UpdateResult<boolean> => {
  const cropConfig = CROPS_CONFIG[cropId as keyof typeof CROPS_CONFIG];
  if (!cropConfig) return NO_OP(state);

  const seedId = Object.keys(cropConfig.seedCost)[0];
  const seedQtyNeeded = (cropConfig.seedCost as Record<string, number>)[seedId] || 0;

  const freeSlots = state.greenhouse.slots.filter(s => s.cropId === null);
  if (freeSlots.length === 0) return NO_OP(state);
  if ((state.inventory[seedId] || 0) < seedQtyNeeded) return NO_OP(state);

  let availableSeeds = state.inventory[seedId] || 0;
  let plantedCount = 0;

  const updatedSlots = state.greenhouse.slots.map(slot => {
    if (slot.cropId === null && availableSeeds >= seedQtyNeeded) {
      availableSeeds -= seedQtyNeeded;
      plantedCount++;
      return { ...slot, cropId, growthProgress: 0, growthTimeLeft: cropConfig.growthTime, isWatered: false };
    }
    return slot;
  });

  if (plantedCount === 0) return NO_OP(state);

  return {
    state: {
      ...state,
      inventory: { ...state.inventory, [seedId]: availableSeeds },
      greenhouse: { ...state.greenhouse, slots: updatedSlots }
    },
    result: true
  };
};

// 一键收割并补种：先收成熟槽位，再用空槽播种
export const batchHarvestAndReplantUpdate = (
  state: GameState,
  cropId: string
): UpdateResult<{ harvested: Record<string, number> | null; replantedCount: number }> => {
  let harvested: Record<string, number> | null = null;
  let replantedCount = 0;

  // 1. 收割所有成熟槽位
  const slotsToHarvest = state.greenhouse.slots.filter(s => s.cropId !== null && s.growthProgress >= 100);
  const newInventory = { ...state.inventory };

  if (slotsToHarvest.length > 0) {
    harvested = {};
    slotsToHarvest.forEach(slot => {
      const config = CROPS_CONFIG[slot.cropId as keyof typeof CROPS_CONFIG];
      Object.entries(config.yields).forEach(([item, qty]) => {
        harvested![item] = (harvested![item] || 0) + qty;
        newInventory[item] = (newInventory[item] || 0) + qty;
      });
    });
  }

  // 收割后的槽位状态
  const slotsAfterHarvest = state.greenhouse.slots.map(s => {
    if (s.cropId !== null && s.growthProgress >= 100) {
      return { ...s, cropId: null, growthProgress: 0, growthTimeLeft: 0, isWatered: false };
    }
    return s;
  });

  // 2. 播种
  const cropConfig = CROPS_CONFIG[cropId as keyof typeof CROPS_CONFIG];
  if (!cropConfig) {
    return {
      state: {
        ...state,
        inventory: newInventory,
        greenhouse: { ...state.greenhouse, slots: slotsAfterHarvest }
      },
      result: { harvested, replantedCount }
    };
  }

  const seedId = Object.keys(cropConfig.seedCost)[0];
  const seedQtyNeeded = (cropConfig.seedCost as Record<string, number>)[seedId] || 0;
  let availableSeeds = newInventory[seedId] || 0;

  const updatedSlots = slotsAfterHarvest.map(slot => {
    if (slot.cropId === null && availableSeeds >= seedQtyNeeded) {
      availableSeeds -= seedQtyNeeded;
      replantedCount++;
      return { ...slot, cropId, growthProgress: 0, growthTimeLeft: cropConfig.growthTime, isWatered: false };
    }
    return slot;
  });

  return {
    state: {
      ...state,
      inventory: { ...newInventory, [seedId]: availableSeeds },
      greenhouse: { ...state.greenhouse, slots: updatedSlots }
    },
    result: { harvested, replantedCount }
  };
};
