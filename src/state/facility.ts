import type { AutomationFacility, FacilityType, GameState } from '../types/game';
import { HEROES_CONFIG } from '../data/heroes';
import { AUTO_RECIPES } from '../data/autoRecipes';
import { SHELTER_UPGRADES, FACILITY_EXPANSION } from '../data/shelterUpgrades';
import { GAME_CONSTANTS } from '../data/gameConstants';
import { resolveDutyBonuses, EMPTY_DUTY_BONUS, type DutyResolvedBonus } from './duty';
import type { UpdateResult } from './types';
import { NO_OP } from './types';

// === 产线配方队列（ticket 13）：纯函数状态机 ===

// 基建升级项：单实例（battery/generator/recycler/greenhouse_dock）+ 产线设施（按台索引）
export type UpgradeStatType = 'battery' | 'generator' | 'recycler' | 'greenhouse_dock' | FacilityType;

// 队列容量 = 设施等级（Lv1 = 1 个配方位，Lv5 = 5 个）
export const getQueueCapacity = (level: number): number => Math.max(1, Math.floor(level));

// 单次加工实际耗时：效率随设施等级提升（每级 +10%），驻守英雄 dutyMeta 速度加成乘算叠加
// speedMultiplier = 0 时无加成（向后兼容）
export const getActualDuration = (recipeId: string, level: number, speedMultiplier = 0): number => {
  const recipe = AUTO_RECIPES[recipeId];
  if (!recipe) return 0;
  return Math.max(1, Math.floor((recipe.duration ?? 0) / ((1 + level * 0.1) * (1 + speedMultiplier))));
};

// 解析设施驻守英雄的加成（作用域化：bonuses 中匹配该设备的加成聚合生效）
// targetId 格式 '${facilityType}_${unitIndex}'，反查 state.heroes 找到驻守英雄的 dutyMeta
// 返回驻守英雄 id（供 UI 显示）与聚合后的加成值
export const resolveDutyBonus = (state: GameState, type: FacilityType, unitIndex: number): { heroId: string | null; bonuses: DutyResolvedBonus } => {
  const targetId = `${type}_${unitIndex}`;
  for (const [heroId, hero] of Object.entries(state.heroes)) {
    if (hero.logisticsFacilityId?.type === 'facility' && hero.logisticsFacilityId.targetId === targetId) {
      return {
        heroId,
        bonuses: resolveDutyBonuses(HEROES_CONFIG[heroId]?.dutyMeta, { role: 'facility', facilityType: type })
      };
    }
  }
  return { heroId: null, bonuses: EMPTY_DUTY_BONUS };
};

// dutyMeta 原料消耗减免：max(1, floor(qty * (1 - costReduction)))，最低消耗 1
const canAffordWithReduction = (recipe: { cost: Record<string, number> }, inventory: Record<string, number>, costReduction: number): boolean =>
  Object.entries(recipe.cost).every(([itemId, qty]) => {
    const reducedQty = Math.max(1, Math.floor(qty * (1 - costReduction)));
    return (inventory[itemId] || 0) >= reducedQty;
  });

const consumeInputsWithReduction = (recipe: { cost: Record<string, number> }, inventory: Record<string, number>, costReduction: number): void => {
  Object.entries(recipe.cost).forEach(([itemId, qty]) => {
    const reducedQty = Math.max(1, Math.floor(qty * (1 - costReduction)));
    inventory[itemId] = (inventory[itemId] || 0) - reducedQty;
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
// resolved（必传）：驻守英雄的加成，已按设备作用域解析（无驻守传 EMPTY_DUTY_BONUS）
export function processFacility(
  fac: AutomationFacility,
  inventory: Record<string, number>,
  seconds: number,
  resolved: DutyResolvedBonus = EMPTY_DUTY_BONUS
): FacilityProcessResult {
  const produced: Record<string, number> = {};
  const completed: Record<string, number> = {};
  if (fac.active === false || seconds <= 0) {
    return { facility: fac, produced, completed };
  }

  const speedMult = resolved.speedMultiplier;
  const yieldMult = resolved.yieldMultiplier;
  const costReduction = resolved.costReduction;

  let queue = [...fac.queue];
  let timeLeft = fac.timeLeft;
  // 防御：丢弃配置中已不存在的条目（迁移时已过滤，这里防运行期配置变更）；
  // 若在制队首被丢弃，其已扣原料与进度一并作废，避免白送给下一配方
  if (queue.some(id => !AUTO_RECIPES[id])) {
    queue = queue.filter(id => AUTO_RECIPES[id]);
    if (!AUTO_RECIPES[fac.queue[0]]) timeLeft = 0;
  }
  let headId = queue[0] ?? null;
  let head = headId ? AUTO_RECIPES[headId] : null;
  let remaining = seconds;

  while (remaining > 0 && head) {
    const duration = getActualDuration(head.id, fac.level, speedMult);
    if (timeLeft > 0) {
      // 进行中的一轮
      const consume = Math.min(timeLeft, remaining);
      timeLeft -= consume;
      remaining -= consume;
      if (timeLeft > 0) break; // 本轮未完成，剩余进度保留到下次

      // 一轮完成：产出并入账（dutyMeta 产量加成：floor(qty * (1 + yieldMult))）
      Object.entries(head.reward).forEach(([itemId, qty]) => {
        const boostedQty = Math.floor(qty * (1 + yieldMult));
        inventory[itemId] = (inventory[itemId] || 0) + boostedQty;
        produced[itemId] = (produced[itemId] || 0) + boostedQty;
      });
      completed[head.id] = (completed[head.id] || 0) + 1;
      queue.shift();
      headId = queue[0] ?? null;
      head = headId ? AUTO_RECIPES[headId] : null;
      if (!head) {
        timeLeft = 0;
        break;
      }
      // 尝试启动下一配方（dutyMeta 原料加成：max(1, floor(qty * (1 - costReduction)))）
      if (canAffordWithReduction(head, inventory, costReduction)) {
        consumeInputsWithReduction(head, inventory, costReduction);
        timeLeft = duration;
      } else {
        timeLeft = 0;
        break; // 资源不足：暂停等待（队首保留）
      }
    } else {
      // 空闲：尝试启动队首配方
      if (canAffordWithReduction(head, inventory, costReduction)) {
        consumeInputsWithReduction(head, inventory, costReduction);
        timeLeft = duration;
      } else {
        break; // 资源不足：暂停等待
      }
    }
  }

  const currentHead = headId ? AUTO_RECIPES[headId] : null;
  const currentDuration = currentHead ? getActualDuration(currentHead.id, fac.level, speedMult) : 0;
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
      Object.entries(recipe.cost).forEach(([itemId, qty]) => {
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

// === 基建升级（耗时施工，时间戳驱动）：开始升级扣材料 → 升级中 → resolve 完成应用 ===

// 升级条目 key：单实例升级项 = id；产线设施 = `${type}_${unitIndex}`；扩建 = `expand_${type}`
export const getShelterUpgradeKey = (statType: UpgradeStatType, unitIndex = 0): string =>
  statType === 'smelter' || statType === 'assembler' ? `${statType}_${unitIndex}` : statType;

export const getFacilityExpansionKey = (type: FacilityType): string => `expand_${type}`;

// 当前等级（greenhouse_dock 由已解锁槽位推导：每级 +2 槽，初始 4 槽 = Lv0，旧存档自动换算）
export const getShelterUpgradeLevel = (state: GameState, statType: UpgradeStatType, unitIndex = 0): number => {
  if (statType === 'battery') return state.shelter.batteryLevel || 1;
  if (statType === 'generator') return state.shelter.generatorLevel || 0;
  if (statType === 'recycler') return state.shelter.recyclerLevel || 0;
  if (statType === 'greenhouse_dock') {
    return Math.max(0, Math.floor((state.greenhouse.unlockedSlotsCount - 4) / GAME_CONSTANTS.GREENHOUSE_EXPANSION_INCREMENT));
  }
  return state.shelter.facilities[statType]?.[unitIndex]?.level || 1;
};

// 升级中条目的目标耗时（秒）：升级 → 下一级 duration；扩建 → 对应台数 durations
export const getUpgradeDurationSeconds = (state: GameState, key: string): number | null => {
  if (key.startsWith('expand_')) {
    const type = key.slice('expand_'.length) as FacilityType;
    const cfg = FACILITY_EXPANSION[type];
    const units = state.shelter.facilities[type];
    if (!cfg || !units) return null;
    const duration = cfg.durations[units.length - 1];
    return duration === undefined ? null : duration;
  }
  const parsed = parseUnitUpgradeKey(key);
  if (!parsed) return null;
  const { statType, unitIndex } = parsed;
  const upgrade = SHELTER_UPGRADES[statType];
  if (!upgrade) return null;
  const nextConfig = upgrade.levels.find(l => l.level === getShelterUpgradeLevel(state, statType, unitIndex) + 1);
  return nextConfig ? nextConfig.duration : null;
};

// 解析 `${type}_${index}` 形式的产线设施升级 key；单实例升级项直接返回
function parseUnitUpgradeKey(key: string): { statType: UpgradeStatType; unitIndex: number } | null {
  const m = /^(smelter|assembler)_(\d+)$/.exec(key);
  if (m) return { statType: m[1] as FacilityType, unitIndex: Number(m[2]) };
  if (SHELTER_UPGRADES[key]) return { statType: key as UpgradeStatType, unitIndex: 0 };
  return null;
}

const withUpgrade = (state: GameState, key: string, startTime: number): GameState => ({
  ...state,
  shelter: {
    ...state.shelter,
    upgrades: { ...(state.shelter.upgrades || {}), [key]: { startTime } }
  }
});

const removeUpgrade = (state: GameState, key: string): GameState => {
  const upgrades = { ...(state.shelter.upgrades || {}) };
  delete upgrades[key];
  return { ...state, shelter: { ...state.shelter, upgrades } };
};

// 开始升级（即时扣材料，进入升级中；同一 key 升级中时拒绝重复开始）
export const upgradeShelterStatUpdate = (
  state: GameState,
  statType: UpgradeStatType,
  unitIndex = 0,
  startTime = Date.now()
): UpdateResult<boolean> => {
  const upgrade = SHELTER_UPGRADES[statType];
  if (!upgrade) return NO_OP(state);

  const currentLevel = getShelterUpgradeLevel(state, statType, unitIndex);
  const nextLevelConfig = upgrade.levels.find(l => l.level === currentLevel + 1);
  if (!nextLevelConfig) return NO_OP(state); // 已满级

  const key = getShelterUpgradeKey(statType, unitIndex);
  if (state.shelter.upgrades?.[key]) return NO_OP(state); // 升级施工中

  // 校验所需材料
  const canAffordUpgradeCost = Object.entries(nextLevelConfig.cost).every(([item, qty]) => (state.inventory[item] || 0) >= qty);
  if (!canAffordUpgradeCost) return NO_OP(state);

  // 扣材料并进入升级中
  const currentInventory = { ...state.inventory };
  Object.entries(nextLevelConfig.cost).forEach(([item, qty]) => {
    currentInventory[item] = (currentInventory[item] || 0) - qty;
  });

  return {
    state: { ...withUpgrade(state, key, startTime), inventory: currentInventory },
    result: true
  };
};

// 开始扩建（即时扣材料，进入施工中；同类型扩建中时拒绝重复开始）
export const expandFacilityUpdate = (state: GameState, type: FacilityType, startTime = Date.now()): UpdateResult<boolean> => {
  const cfg = FACILITY_EXPANSION[type];
  const units = getUnits(state, type);
  if (!cfg || !units || units.length === 0) return NO_OP(state);
  const nextIndex = units.length;
  if (nextIndex >= cfg.maxUnits) return NO_OP(state);
  const cost = cfg.costs[nextIndex - 1];
  if (!cost) return NO_OP(state);
  const key = getFacilityExpansionKey(type);
  if (state.shelter.upgrades?.[key]) return NO_OP(state); // 扩建施工中
  if (!canAffordCost(cost, state.inventory)) return NO_OP(state);

  const updatedInventory = { ...state.inventory };
  consumeCost(cost, updatedInventory);

  return {
    state: { ...withUpgrade(state, key, startTime), inventory: updatedInventory },
    result: true
  };
};

// 应用一条已完成的升级/扩建（应用后移除施工条目）
const applyPendingUpgrade = (state: GameState, key: string): { state: GameState; text: string } | null => {
  // 扩建：新增一台同类型设施（Lv1、空队列、默认启用）
  if (key.startsWith('expand_')) {
    const type = key.slice('expand_'.length) as FacilityType;
    const cfg = FACILITY_EXPANSION[type];
    const units = state.shelter.facilities[type];
    if (!cfg || !units || units.length === 0 || units.length >= cfg.maxUnits) return null;
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
    const next = {
      ...state,
      shelter: {
        ...state.shelter,
        facilities: { ...state.shelter.facilities, [type]: [...units, newUnit] }
      }
    };
    return { state: removeUpgrade(next, key), text: `${template?.name || SHELTER_UPGRADES[type]?.name || type} 扩建完成：新增 ${units.length + 1} 号设施` };
  }

  const parsed = parseUnitUpgradeKey(key);
  if (!parsed) return null;
  const { statType, unitIndex } = parsed;
  const upgrade = SHELTER_UPGRADES[statType];
  if (!upgrade) return null;
  const nextConfig = upgrade.levels.find(l => l.level === getShelterUpgradeLevel(state, statType, unitIndex) + 1);
  if (!nextConfig) return null;

  let currentShelter = { ...state.shelter, facilities: { ...state.shelter.facilities } };

  if (statType === 'battery') {
    currentShelter.batteryLevel = nextConfig.level;
    currentShelter.maxOfflineDuration = nextConfig.effectValue;
  } else if (statType === 'generator') {
    currentShelter.generatorLevel = nextConfig.level;
  } else if (statType === 'recycler') {
    currentShelter.recyclerLevel = nextConfig.level;
  } else if (statType === 'greenhouse_dock') {
    // 温室智能扩展坞：每级 +2 培养槽，钳制到上限（原工坊配方逻辑迁移至此）
    const currentCount = state.greenhouse.unlockedSlotsCount;
    const nextCount = Math.min(GAME_CONSTANTS.GREENHOUSE_MAX_SLOTS, currentCount + GAME_CONSTANTS.GREENHOUSE_EXPANSION_INCREMENT);
    const newSlots = [...state.greenhouse.slots];
    for (let i = currentCount + 1; i <= nextCount; i++) {
      newSlots.push({ id: i, cropId: null, growthProgress: 0, growthTimeLeft: 0, isWatered: false });
    }
    const next = {
      ...state,
      greenhouse: { ...state.greenhouse, unlockedSlotsCount: nextCount, slots: newSlots },
      shelter: currentShelter
    };
    return { state: removeUpgrade(next, key), text: `${upgrade.name} 升级至 Lv.${nextConfig.level}（培养槽 ${nextCount} 槽）` };
  } else {
    const units = currentShelter.facilities[statType];
    if (!units?.[unitIndex]) return null;
    currentShelter.facilities = {
      ...currentShelter.facilities,
      [statType]: units.map((u, i) => (i === unitIndex ? { ...u, level: nextConfig.level } : u))
    };
  }

  return {
    state: removeUpgrade({ ...state, shelter: currentShelter }, key),
    text: `${upgrade.name} 升级至 Lv.${nextConfig.level}`
  };
};

export interface ResolvedUpgrade {
  key: string;
  text: string; // 完成提示（日志 / 离线报告）
}

// 结算所有已完成的升级/扩建（时间戳驱动）；未完成的保留施工条目继续计时。
// 在线由 tick 调用；离线回归在 calculateDetailedOfflineProgress 开头调用（先应用再结算产出）。
export const resolveShelterUpgrades = (
  state: GameState,
  now: number
): { state: GameState; completed: ResolvedUpgrade[] } => {
  const pending = state.shelter.upgrades || {};
  if (Object.keys(pending).length === 0) return { state, completed: [] };

  let current = state;
  const completed: ResolvedUpgrade[] = [];

  for (const [key, info] of Object.entries(pending)) {
    const durationSeconds = getUpgradeDurationSeconds(current, key);
    if (durationSeconds === null || durationSeconds <= 0) {
      // 防御：配置失效的施工条目丢弃，并退还开始升级时已扣的材料（尽力而为）
      current = refundPendingUpgrade(current, key);
      continue;
    }
    if (now - info.startTime < durationSeconds * 1000) continue; // 未到完成时刻
    const applied = applyPendingUpgrade(current, key);
    if (applied) {
      current = applied.state;
      completed.push({ key, text: applied.text });
    }
  }

  return { state: current, completed };
};

// 防御：配置失效的施工条目（如升级项被删除/满级）退还已扣材料后丢弃。
// 成本可解析时退还（扩建按当前台数、升级按下一级配置），解析失败则仅丢弃。
const refundPendingUpgrade = (state: GameState, key: string): GameState => {
  const refund: Record<string, number> = {};
  if (key.startsWith('expand_')) {
    const type = key.slice('expand_'.length) as FacilityType;
    const cfg = FACILITY_EXPANSION[type];
    const units = state.shelter.facilities[type];
    const cost = cfg && units ? cfg.costs[units.length - 1] : null;
    if (cost) Object.assign(refund, cost);
  } else {
    const parsed = parseUnitUpgradeKey(key);
    if (parsed) {
      const upgrade = SHELTER_UPGRADES[parsed.statType];
      const nextConfig = upgrade?.levels.find(l => l.level === getShelterUpgradeLevel(state, parsed.statType, parsed.unitIndex) + 1);
      if (nextConfig) Object.assign(refund, nextConfig.cost);
    }
  }
  if (Object.keys(refund).length === 0) return removeUpgrade(state, key);
  const inventory = { ...state.inventory };
  Object.entries(refund).forEach(([item, qty]) => {
    inventory[item] = (inventory[item] || 0) + qty;
  });
  return removeUpgrade({ ...state, inventory }, key);
};
