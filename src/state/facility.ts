import type { AutomationFacility, FacilityType, GameState } from '../types/game';
import { AUTO_RECIPES } from '../data/autoRecipes';
import { SHELTER_UPGRADES, FACILITY_EXPANSION } from '../data/shelterUpgrades';
import type { UpdateResult } from './types';
import { NO_OP } from './types';

// === 产线配方队列（ticket 13）：纯函数状态机 ===

type UpgradeStatType = 'battery' | 'generator' | 'recycler' | FacilityType;

// 队列容量 = 设施等级（Lv1 = 1 个配方位，Lv5 = 5 个）
export const getQueueCapacity = (level: number): number => Math.max(1, Math.floor(level));

// 单次加工实际耗时：效率随设施等级提升（每级 +10%，与 shelterUpgrades 配置一致）
export const getActualDuration = (recipeId: string, level: number): number => {
  const recipe = AUTO_RECIPES[recipeId];
  if (!recipe) return 0;
  return Math.max(1, Math.floor(recipe.duration / (1 + level * 0.1)));
};

const canAfford = (recipe: { input: Record<string, number> }, inventory: Record<string, number>): boolean =>
  Object.entries(recipe.input).every(([itemId, qty]) => (inventory[itemId] || 0) >= qty);

const consumeInputs = (recipe: { input: Record<string, number> }, inventory: Record<string, number>): void => {
  Object.entries(recipe.input).forEach(([itemId, qty]) => {
    inventory[itemId] = (inventory[itemId] || 0) - qty;
  });
};

// 平坦费用表（扩建/升级成本）：{ itemId: qty }
const canAffordCost = (cost: Record<string, number>, inventory: Record<string, number>): boolean =>
  Object.entries(cost).every(([itemId, qty]) => (inventory[itemId] || 0) >= qty);

const consumeCost = (cost: Record<string, number>, inventory: Record<string, number>): void => {
  Object.entries(cost).forEach(([itemId, qty]) => {
    inventory[itemId] = (inventory[itemId] || 0) - qty;
  });
};

export interface FacilityProcessResult {
  facility: AutomationFacility;
  produced: Record<string, number>;   // 本次结算产出汇总（已写入 inventory）
  completed: Record<string, number>;  // recipeId -> 完成批次数（供日志）
}

// 推进一台设施运转 seconds 秒（在线 tick 传 1，离线结算传总秒数）。
// inventory 就地修改（启动扣料、完成加产出）；资源不足时暂停等待，队首不跳过。
export function processFacility(
  fac: AutomationFacility,
  inventory: Record<string, number>,
  seconds: number
): FacilityProcessResult {
  const produced: Record<string, number> = {};
  const completed: Record<string, number> = {};
  if (fac.active === false || seconds <= 0) {
    return { facility: fac, produced, completed };
  }

  let queue = [...fac.queue];
  // 防御：丢弃配置中已不存在的队首条目
  while (queue.length > 0 && !AUTO_RECIPES[queue[0]]) queue.shift();
  let headId = queue[0] ?? null;
  let head = headId ? AUTO_RECIPES[headId] : null;
  let timeLeft = fac.timeLeft;
  let remaining = seconds;

  while (remaining > 0 && head) {
    const duration = getActualDuration(head.id, fac.level);
    if (timeLeft > 0) {
      // 进行中的一轮
      const consume = Math.min(timeLeft, remaining);
      timeLeft -= consume;
      remaining -= consume;
      if (timeLeft > 0) break; // 本轮未完成，剩余进度保留到下次

      // 一轮完成：产出并入账，队首出队
      Object.entries(head.output).forEach(([itemId, qty]) => {
        inventory[itemId] = (inventory[itemId] || 0) + qty;
        produced[itemId] = (produced[itemId] || 0) + qty;
      });
      completed[head.id] = (completed[head.id] || 0) + 1;
      queue.shift();
      headId = queue[0] ?? null;
      head = headId ? AUTO_RECIPES[headId] : null;
      if (!head) {
        timeLeft = 0;
        break;
      }
      // 尝试启动下一配方
      if (canAfford(head, inventory)) {
        consumeInputs(head, inventory);
        timeLeft = duration;
      } else {
        timeLeft = 0;
        break; // 资源不足：暂停等待（队首保留）
      }
    } else {
      // 空闲：尝试启动队首配方
      if (canAfford(head, inventory)) {
        consumeInputs(head, inventory);
        timeLeft = duration;
      } else {
        break; // 资源不足：暂停等待
      }
    }
  }

  const currentHead = headId ? AUTO_RECIPES[headId] : null;
  const currentDuration = currentHead ? getActualDuration(currentHead.id, fac.level) : 0;
  const progress = timeLeft > 0 && currentDuration > 0
    ? Math.min(100, Math.round(((currentDuration - timeLeft) / currentDuration) * 100))
    : 0;

  return {
    facility: { ...fac, queue, timeLeft, currentProgress: progress },
    produced,
    completed
  };
}

// === 队列操作（入队/移除/启停/扩建/升级） ===

const getUnits = (state: GameState, type: FacilityType): AutomationFacility[] | undefined =>
  state.shelter.facilities[type];

const withUnits = (state: GameState, type: FacilityType, units: AutomationFacility[]): GameState => ({
  ...state,
  shelter: {
    ...state.shelter,
    facilities: {
      ...state.shelter.facilities,
      [type]: units
    }
  }
});

// 配方入队：FIFO 尾部追加；队列已满（容量 = 等级）或配方不属于该设施类型时拒绝
export const enqueueRecipeUpdate = (
  state: GameState,
  type: FacilityType,
  unitIndex: number,
  recipeId: string
): UpdateResult<boolean> => {
  const recipe = AUTO_RECIPES[recipeId];
  if (!recipe || recipe.facilityId !== type) return NO_OP(state);
  const units = getUnits(state, type);
  if (!units || !units[unitIndex]) return NO_OP(state);
  const fac = units[unitIndex];
  if (fac.queue.length >= getQueueCapacity(fac.level)) return NO_OP(state);

  const updatedUnits = units.map((u, i) =>
    i === unitIndex ? { ...u, queue: [...u.queue, recipeId] } : u
  );
  return { state: withUnits(state, type, updatedUnits), result: true };
};

// 移除队列条目：队首在生产中时退还该配方已扣除的原料；移除队首后重置进度
export const removeQueueEntryUpdate = (
  state: GameState,
  type: FacilityType,
  unitIndex: number,
  queueIndex: number
): UpdateResult<boolean> => {
  const units = getUnits(state, type);
  if (!units || !units[unitIndex]) return NO_OP(state);
  const fac = units[unitIndex];
  if (queueIndex < 0 || queueIndex >= fac.queue.length) return NO_OP(state);

  let updatedInventory = { ...state.inventory };
  const removingHead = queueIndex === 0;
  if (removingHead && fac.timeLeft > 0) {
    const recipe = AUTO_RECIPES[fac.queue[0]];
    if (recipe) {
      Object.entries(recipe.input).forEach(([itemId, qty]) => {
        updatedInventory[itemId] = (updatedInventory[itemId] || 0) + qty;
      });
    }
  }

  const updatedUnits = units.map((u, i) => {
    if (i !== unitIndex) return u;
    const queue = u.queue.filter((_, idx) => idx !== queueIndex);
    return {
      ...u,
      queue,
      // 队首被移除：重置进度，新队首从下一 tick 起按需启动
      timeLeft: removingHead ? 0 : u.timeLeft,
      currentProgress: removingHead ? 0 : u.currentProgress
    };
  });

  return {
    state: { ...withUnits(state, type, updatedUnits), inventory: updatedInventory },
    result: true
  };
};

// 启用/停用设施（纯自动运转开关，无需指派人员）
export const setFacilityActiveUpdate = (
  state: GameState,
  type: FacilityType,
  unitIndex: number,
  active: boolean
): UpdateResult<boolean> => {
  const units = getUnits(state, type);
  if (!units || !units[unitIndex]) return NO_OP(state);
  const updatedUnits = units.map((u, i) => (i === unitIndex ? { ...u, active } : u));
  return { state: withUnits(state, type, updatedUnits), result: true };
};

// 扩建：新增一台同类型设施（Lv1、空队列、默认启用），费用按已有台数递增
export const expandFacilityUpdate = (state: GameState, type: FacilityType): UpdateResult<boolean> => {
  const cfg = FACILITY_EXPANSION[type];
  const units = getUnits(state, type);
  if (!cfg || !units || units.length === 0) return NO_OP(state);
  const nextIndex = units.length;
  if (nextIndex >= cfg.maxUnits) return NO_OP(state);
  const cost = cfg.costs[nextIndex - 1];
  if (!cost) return NO_OP(state);
  if (!canAffordCost(cost, state.inventory)) return NO_OP(state);

  const updatedInventory = { ...state.inventory };
  consumeCost(cost, updatedInventory);

  const template = units[0];
  const newUnit: AutomationFacility = {
    id: type,
    name: template?.name || SHELTER_UPGRADES[type]?.name || '产线设施',
    level: 1,
    queue: [],
    currentProgress: 0,
    timeLeft: 0,
    active: true
  };

  return {
    state: {
      ...withUnits(state, type, [...units, newUnit]),
      inventory: updatedInventory
    },
    result: true
  };
};

// 升级避难所设施（蓄电池/发电机/回收站/冶炼炉/组装台）；产线设施按台索引升级
export const upgradeShelterStatUpdate = (
  state: GameState,
  statType: UpgradeStatType,
  unitIndex = 0
): UpdateResult<boolean> => {
  const upgrade = SHELTER_UPGRADES[statType];
  if (!upgrade) return NO_OP(state);

  let currentLevel = 1;
  if (statType === 'battery') currentLevel = state.shelter.batteryLevel || 1;
  else if (statType === 'generator') currentLevel = state.shelter.generatorLevel || 0;
  else if (statType === 'recycler') currentLevel = state.shelter.recyclerLevel || 0;
  else if (statType === 'smelter' || statType === 'assembler') {
    const fac = getUnits(state, statType)?.[unitIndex];
    if (!fac) return NO_OP(state);
    currentLevel = fac.level || 1;
  }

  const nextLevelConfig = upgrade.levels.find(l => l.level === currentLevel + 1);
  if (!nextLevelConfig) return NO_OP(state);

  // 校验所需材料
  const canAffordCost = Object.entries(nextLevelConfig.cost).every(([item, qty]) => (state.inventory[item] || 0) >= qty);
  if (!canAffordCost) return NO_OP(state);

  // 扣材料并应用升级
  const currentInventory = { ...state.inventory };
  Object.entries(nextLevelConfig.cost).forEach(([item, qty]) => {
    currentInventory[item] = (currentInventory[item] || 0) - qty;
  });

  const nextLevel = nextLevelConfig.level;
  let currentShelter = { ...state.shelter, facilities: { ...state.shelter.facilities } };

  if (statType === 'battery') {
    currentShelter.batteryLevel = nextLevel;
    currentShelter.maxOfflineDuration = nextLevelConfig.effectValue;
  } else if (statType === 'generator') {
    currentShelter.generatorLevel = nextLevel;
  } else if (statType === 'recycler') {
    currentShelter.recyclerLevel = nextLevel;
  } else if (statType === 'smelter' || statType === 'assembler') {
    const units = currentShelter.facilities[statType];
    currentShelter.facilities = {
      ...currentShelter.facilities,
      [statType]: units.map((u, i) => (i === unitIndex ? { ...u, level: nextLevel } : u))
    };
  }

  return {
    state: { ...state, inventory: currentInventory, shelter: currentShelter },
    result: true
  };
};
