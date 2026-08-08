import type { GameState } from '../types/game';
import { CROPS_CONFIG } from '../data/crops';
import { GAME_CONSTANTS } from '../data/gameConstants';
import type { UpdateResult } from './types';
import { NO_OP } from './types';
import { HEROES_CONFIG } from '../data/heroes';
import type { HeroDutyMeta } from '../data/heroes';

// 反查温室驻守（浇水岗）英雄的 dutyMeta 特殊加成（07）：
// facilitySpeedMultiplier → 生长速度；facilityYieldMultiplier → 收割产量；成本减免不应用于温室
export const resolveWatererBonus = (state: GameState): HeroDutyMeta | null => {
  const watererId = state.shelter.assignedWatererId;
  if (!watererId) return null;
  return HEROES_CONFIG[watererId]?.dutyMeta ?? null;
};

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
  // 驻守产量加成（07）：驻守期间所有收割 floor(qty × (1 + yieldMult))
  const yieldMult = resolveWatererBonus(state)?.facilityYieldMultiplier ?? 0;
  const gatheredItems: Record<string, number> = {};

  const newInventory = { ...state.inventory };
  Object.entries(config.yields).forEach(([item, qty]) => {
    const boosted = Math.floor(qty * (1 + yieldMult));
    gatheredItems[item] = boosted;
    newInventory[item] = (newInventory[item] || 0) + boosted;
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
  // 驻守产量加成（07）：驻守期间所有收割 floor(qty × (1 + yieldMult))
  const yieldMult = resolveWatererBonus(state)?.facilityYieldMultiplier ?? 0;

  slotsToHarvest.forEach(slot => {
    const config = CROPS_CONFIG[slot.cropId as keyof typeof CROPS_CONFIG];
    Object.entries(config.yields).forEach(([item, qty]) => {
      const boosted = Math.floor(qty * (1 + yieldMult));
      accumulatedYields[item] = (accumulatedYields[item] || 0) + boosted;
      newInventory[item] = (newInventory[item] || 0) + boosted;
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

// 自动收割播种的播种策略（07）：'original' = 补种原作物（驻守默认）；
// { cropId } = 播种指定作物到所有空槽（T08 挂机）
export type ReplantStrategy = 'original' | { cropId: string };

// 驻守自动收割并播种（07）：收割所有成熟槽（含驻守产量加成），
// 然后按策略播种——'original' 只补种刚收割槽位的原作物（种子不足留空）
export const autoHarvestAndReplantUpdate = (
  state: GameState,
  replantStrategy: ReplantStrategy
): UpdateResult<{ harvested: Record<string, number> | null }> => {
  const yieldMult = resolveWatererBonus(state)?.facilityYieldMultiplier ?? 0;
  const harvested: Record<string, number> = {};
  const newInventory = { ...state.inventory };
  const harvestedSlots: { slotId: number; cropId: string }[] = [];

  // 1. 收割所有成熟槽
  const slotsAfterHarvest = state.greenhouse.slots.map(slot => {
    if (!slot.cropId || slot.growthProgress < 100) return slot;
    const config = CROPS_CONFIG[slot.cropId];
    if (!config) return slot;
    Object.entries(config.yields).forEach(([item, qty]) => {
      const boosted = Math.floor(qty * (1 + yieldMult));
      harvested[item] = (harvested[item] || 0) + boosted;
      newInventory[item] = (newInventory[item] || 0) + boosted;
    });
    harvestedSlots.push({ slotId: slot.id, cropId: slot.cropId });
    return { ...slot, cropId: null, growthProgress: 0, growthTimeLeft: 0, isWatered: false };
  });

  // 2. 播种
  let slotsAfterPlant = slotsAfterHarvest;
  let finalInventory = newInventory;
  if (replantStrategy === 'original') {
    // 补种刚收割槽位的原作物（种子不足留空）
    slotsAfterPlant = slotsAfterHarvest.map(slot => {
      const entry = harvestedSlots.find(h => h.slotId === slot.id);
      if (!entry || slot.cropId !== null) return slot;
      const cropConfig = CROPS_CONFIG[entry.cropId];
      if (!cropConfig) return slot;
      const seedId = Object.keys(cropConfig.seedCost)[0];
      const seedQty = cropConfig.seedCost[seedId];
      if ((finalInventory[seedId] || 0) < seedQty) return slot;
      finalInventory = { ...finalInventory, [seedId]: finalInventory[seedId] - seedQty };
      return { ...slot, cropId: entry.cropId, growthProgress: 0, growthTimeLeft: cropConfig.growthTime, isWatered: false };
    });
  } else {
    // { cropId }（T08 挂机）：播种指定作物到所有空槽
    const cropConfig = CROPS_CONFIG[replantStrategy.cropId];
    if (cropConfig) {
      const seedId = Object.keys(cropConfig.seedCost)[0];
      const seedQty = cropConfig.seedCost[seedId];
      slotsAfterPlant = slotsAfterHarvest.map(slot => {
        if (slot.cropId !== null || (finalInventory[seedId] || 0) < seedQty) return slot;
        finalInventory = { ...finalInventory, [seedId]: finalInventory[seedId] - seedQty };
        return { ...slot, cropId: cropConfig.id, growthProgress: 0, growthTimeLeft: cropConfig.growthTime, isWatered: false };
      });
    }
  }

  const hasHarvested = Object.keys(harvested).length > 0;
  return {
    state: {
      ...state,
      inventory: finalInventory,
      greenhouse: { ...state.greenhouse, slots: slotsAfterPlant }
    },
    result: { harvested: hasHarvested ? harvested : null }
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

// 离线推进温室自动化 seconds 秒（07）：循环「自动浇水 → 生长推进 → 收割+播种」，
// 使驻守自动收割播种在离线期间按多轮作物循环结算（与在线 tick 语义一致）
export const advanceGreenhouseAutomation = (
  state: GameState,
  seconds: number,
  replantStrategy: ReplantStrategy
): UpdateResult<{ harvested: Record<string, number> | null }> => {
  let cur = state;
  let remaining = seconds;
  const accumulated: Record<string, number> = {};
  const speedMult = resolveWatererBonus(state)?.facilitySpeedMultiplier ?? 0;

  // 收割离线开始时就已成熟的槽位（code-review should-fix）：
  // 在线按 growthProgress >= 100 收割，离线循环按 growthTimeLeft > 0 推进，
  // 若离线开始时作物已成熟（growthTimeLeft=0）必须先收割，否则整段离线不结算
  const initialR = autoHarvestAndReplantUpdate(cur, replantStrategy);
  cur = initialR.state;
  if (initialR.result.harvested) {
    Object.entries(initialR.result.harvested).forEach(([itemId, qty]) => {
      accumulated[itemId] = (accumulated[itemId] || 0) + qty;
    });
  }

  while (remaining > 0) {
    // 自动浇水（驻守免费）：有作物的未湿润槽位置 true（维持生长）
    cur = autoWaterGreenhouse(cur);

    // 无作物 → 无进展可推进
    if (!cur.greenhouse.slots.some(s => s.cropId)) break;

    // 推进到最早成熟的湿润作物（含速度加成）；全部湿润则推进剩余时间
    let advance = remaining;
    let hasWateredCrop = false;
    for (const slot of cur.greenhouse.slots) {
      if (slot.cropId && slot.isWatered && slot.growthTimeLeft > 0) {
        hasWateredCrop = true;
        advance = Math.min(advance, Math.ceil(slot.growthTimeLeft / (1 + speedMult)));
      }
    }
    if (!hasWateredCrop) break; // 防御：autoWater 后仍无湿润作物

    cur = advanceGreenhouseGrowth(cur, advance, speedMult);
    remaining -= advance;

    // 收割成熟槽 + 按策略播种
    const r = autoHarvestAndReplantUpdate(cur, replantStrategy);
    cur = r.state;
    if (r.result.harvested) {
      Object.entries(r.result.harvested).forEach(([itemId, qty]) => {
        accumulated[itemId] = (accumulated[itemId] || 0) + qty;
      });
    }
  }

  return {
    state: cur,
    result: { harvested: Object.keys(accumulated).length > 0 ? accumulated : null }
  };
};

// 推进温室作物生长 seconds 秒（06/07）：湿润作物 1x × 驻守速度加成，未湿润停滞
const advanceGreenhouseGrowth = (state: GameState, seconds: number, speedMult: number): GameState => {
  const updatedSlots = state.greenhouse.slots.map(slot => {
    if (!slot.cropId) return slot;
    const config = CROPS_CONFIG[slot.cropId];
    if (!config) return slot;
    const timeReduced = slot.isWatered ? seconds * (1 + speedMult) : 0;
    const newTimeLeft = Math.max(0, slot.growthTimeLeft - timeReduced);
    const progress = Math.min(100, Math.round(((config.growthTime - newTimeLeft) / config.growthTime) * 100));
    return { ...slot, growthTimeLeft: newTimeLeft, growthProgress: progress };
  });
  return { ...state, greenhouse: { ...state.greenhouse, slots: updatedSlots } };
};

// 自动浇水（驻守免费）：有作物的未湿润槽位置 true
const autoWaterGreenhouse = (state: GameState): GameState => ({
  ...state,
  greenhouse: {
    ...state.greenhouse,
    slots: state.greenhouse.slots.map(slot =>
      slot.cropId && !slot.isWatered ? { ...slot, isWatered: true } : slot
    )
  }
});

// 挂机选种（08）：设置/清除挂机作物（无前置，随时可存；null = 清除）
export const setAutoFarmCropUpdate = (state: GameState, cropId: string | null): UpdateResult<boolean> => {
  if (cropId && !CROPS_CONFIG[cropId]) return NO_OP(state);
  return {
    state: {
      ...state,
      greenhouse: {
        ...state.greenhouse,
        autoFarm: { ...state.greenhouse.autoFarm, cropId }
      }
    },
    result: true
  };
};

// 挂机开关（08）：开启必须已驻守（否则失败）；关闭无前置
export const setAutoFarmEnabledUpdate = (state: GameState, enabled: boolean): UpdateResult<boolean> => {
  if (enabled && !state.shelter.assignedWatererId) return NO_OP(state);
  return {
    state: {
      ...state,
      greenhouse: {
        ...state.greenhouse,
        autoFarm: { ...state.greenhouse.autoFarm, enabled }
      }
    },
    result: true
  };
};

// 挂机种子耗光检查（08）：挂机开启且选定作物种子不足以播种 1 槽 → 自动停止
// tick/offline 每次自动收割播种后调用
export const maybeStopAutoFarmOnSeedDepletion = (state: GameState): GameState => {
  const autoFarm = state.greenhouse.autoFarm;
  if (!autoFarm.enabled || !autoFarm.cropId) return state;
  const cropConfig = CROPS_CONFIG[autoFarm.cropId];
  if (!cropConfig) return state;
  const seedId = Object.keys(cropConfig.seedCost)[0];
  const seedQty = cropConfig.seedCost[seedId];
  if ((state.inventory[seedId] || 0) < seedQty) {
    return {
      ...state,
      greenhouse: { ...state.greenhouse, autoFarm: { ...autoFarm, enabled: false } }
    };
  }
  return state;
};
