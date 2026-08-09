import type { AutomationFacility, GameState } from '../types/game';
import { HEROES_CONFIG } from '../data/heroes';
import { AUTO_RECIPES } from '../data/autoRecipes';
import { SHELTER_UPGRADES } from '../data/shelterUpgrades';
import { FACILITIES_CONFIG, isFacilityType, type FacilityType } from '../data/facilities';
import type { UpgradeLevel } from '../types/config';
import { GAME_CONSTANTS } from '../data/gameConstants';
import { resolveDutyBonuses, EMPTY_DUTY_BONUS, type DutyResolvedBonus } from './duty';
import type { UpdateResult } from './types';
import { NO_OP } from './types';

// === 产线单任务批量生产（issue 06）：纯函数状态机 ===

// 基建升级项：单实例（battery/generator/recycler/greenhouse_dock）+ 产线设施（按台索引）
// 设施部分由 FACILITIES_CONFIG 推导（新增设备种类自动扩展）；单实例部分为全局升级
export type UpgradeStatType = 'battery' | 'generator' | 'recycler' | 'greenhouse_dock' | FacilityType;

// 配置源分派：设施类型读 FACILITIES_CONFIG，全局类型读 SHELTER_UPGRADES
const getUpgradeLevels = (statType: UpgradeStatType): UpgradeLevel[] =>
  isFacilityType(statType) ? FACILITIES_CONFIG[statType].levels : (SHELTER_UPGRADES[statType]?.levels ?? []);

const getUpgradeName = (statType: UpgradeStatType): string | undefined =>
  isFacilityType(statType) ? FACILITIES_CONFIG[statType].name : SHELTER_UPGRADES[statType]?.name;

// 单次加工实际耗时：效率随设备等级提升（累计加成 = 配置表 levels.effectValue，Lv1 = 100% x1），
// 驻守英雄 dutyMeta 速度加成乘算叠加；speedMultiplier = 0 时无加成（向后兼容）
export const getActualDuration = (recipeId: string, level: number, speedMultiplier = 0): number => {
  const recipe = AUTO_RECIPES[recipeId];
  if (!recipe) return 0;
  const effBonus = recipe.facilityId
    ? (FACILITIES_CONFIG[recipe.facilityId]?.levels.find(l => l.level === level)?.effectValue ?? 0)
    : 0;
  return Math.max(1, Math.floor((recipe.duration ?? 0) / ((1 + effBonus) * (1 + speedMultiplier))));
};

// 每批折扣成本（issue 06）：dutyMeta 原料减免 max(1, floor(qty * (1 - costReduction)))，最低 1
// 开始任务扣料与取消退款共用同一折扣单价（扣/退同价，退款不赚差价）
export const getBatchDiscountedCost = (recipe: { cost: Record<string, number> }, costReduction: number): Record<string, number> => {
  const out: Record<string, number> = {};
  Object.entries(recipe.cost).forEach(([itemId, qty]) => {
    out[itemId] = Math.max(1, Math.floor(qty * (1 - costReduction)));
  });
  return out;
};

// 给定库存可支撑的批次数：floor(库存 / 每批折扣成本)，材料不足时上限为 0（UI 滑条用）
export const getMaxAffordableBatches = (recipeId: string, inventory: Record<string, number>, costReduction = 0): number => {
  const recipe = AUTO_RECIPES[recipeId];
  if (!recipe) return 0;
  const perBatch = getBatchDiscountedCost(recipe, costReduction);
  const perBatchEntries = Object.entries(perBatch);
  if (perBatchEntries.length === 0) return 0; // 无成本配方（防御 Infinity）
  return Math.floor(
    Math.min(...perBatchEntries.map(([itemId, qty]) => (inventory[itemId] || 0) / qty))
  );
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

// 推进一台设施运转 seconds 秒（在线 tick 传经过秒数，离线结算传总秒数）。
// 单任务批量模型（issue 06）：recipeId 为 null（待机）时直接返回；
// 每完成一批 completedCount + 1 并产出入账（yield 加成 floor(qty × (1 + yield))），
// 达到 targetCount 自动回待机；时间不足则保留 timeLeft 进度。
// inventory 就地修改；resolved（必传）：驻守英雄的加成，已按设备作用域解析（无驻守传 EMPTY_DUTY_BONUS）
export function processFacility(
  fac: AutomationFacility,
  inventory: Record<string, number>,
  seconds: number,
  resolved: DutyResolvedBonus = EMPTY_DUTY_BONUS
): FacilityProcessResult {
  const produced: Record<string, number> = {};
  const completed: Record<string, number> = {};
  if (seconds <= 0 || !fac.recipeId) {
    return { facility: fac, produced, completed };
  }

  const recipe = AUTO_RECIPES[fac.recipeId];
  if (!recipe) {
    // 防御：配置中已删除的配方 → 任务作废（材料已扣无法精确退还，直接清空回待机）
    return {
      facility: { ...fac, recipeId: null, targetCount: 0, completedCount: 0, timeLeft: 0, currentProgress: 0, costReduction: undefined },
      produced,
      completed
    };
  }

  const speedMult = resolved.speedMultiplier;
  const yieldMult = resolved.yieldMultiplier;
  const duration = getActualDuration(fac.recipeId, fac.level, speedMult);
  let timeLeft = fac.timeLeft;
  let remaining = seconds;
  let completedCount = fac.completedCount;

  while (remaining > 0 && timeLeft > 0) {
    const consume = Math.min(timeLeft, remaining);
    timeLeft -= consume;
    remaining -= consume;
    if (timeLeft > 0) break; // 当前批未完成，剩余进度保留到下次

    // 一批完成：产出并入账（dutyMeta 产量加成：floor(qty * (1 + yieldMult))）
    Object.entries(recipe.reward).forEach(([itemId, qty]) => {
      const boostedQty = Math.floor(qty * (1 + yieldMult));
      inventory[itemId] = (inventory[itemId] || 0) + boostedQty;
      produced[itemId] = (produced[itemId] || 0) + boostedQty;
    });
    completedCount += 1;
    completed[fac.recipeId] = (completed[fac.recipeId] || 0) + 1;

    if (completedCount >= fac.targetCount) {
      timeLeft = 0; // 达到目标批数：任务完成
      break;
    }
    timeLeft = duration; // 继续下一批
  }

  const done = completedCount >= fac.targetCount;
  const progress = timeLeft > 0 && duration > 0
    ? Math.min(100, Math.round(((duration - timeLeft) / duration) * 100))
    : 0;

  return {
    facility: {
      ...fac,
      recipeId: done ? null : fac.recipeId,
      targetCount: done ? 0 : fac.targetCount,
      completedCount: done ? 0 : completedCount, // 完成回待机：任务字段一并清空
      timeLeft: done ? 0 : timeLeft,
      currentProgress: progress,
      costReduction: done ? undefined : fac.costReduction // 完成回待机：清除减免快照残留
    },
    produced,
    completed
  };
}

// === 单任务批量生产（issue 06）：开始任务 / 取消任务 ===

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

// === 单任务批量生产（issue 06）：开始任务 / 取消任务 ===
// 每台设备同时只跑一个「配方 × 批次」任务；已在生产中时拒绝开始新任务。

// 开始任务：校验 目标批次数 × 每批折扣成本 足够 → 扣全部材料（折扣价）→ 置任务。
// 拒绝：未知配方 / 配方不属于该设备 / 台索引无效 / 已在生产中 / 批次非法 / 材料不足（均不扣料）
export const startTaskUpdate = (
  state: GameState,
  type: FacilityType,
  unitIndex: number,
  recipeId: string,
  targetCount: number
): UpdateResult<boolean> => {
  const recipe = AUTO_RECIPES[recipeId];
  if (!recipe || recipe.facilityId !== type) return NO_OP(state);
  const units = getUnits(state, type);
  if (!units || !units[unitIndex]) return NO_OP(state);
  const fac = units[unitIndex];
  if (fac.recipeId) return NO_OP(state); // 已在生产中
  const target = Math.floor(targetCount);
  if (!Number.isFinite(targetCount) || target <= 0) return NO_OP(state);

  const { bonuses } = resolveDutyBonus(state, type, unitIndex);
  const perBatch = getBatchDiscountedCost(recipe, bonuses.costReduction);
  const canAfford = Object.entries(perBatch).every(([itemId, qty]) => (state.inventory[itemId] || 0) >= qty * target);
  if (!canAfford) return NO_OP(state);

  // 扣全部材料（折扣价）并置任务：当前批从首批耗时开始计时
  // costReduction 快照：取消退款按任务开始时刻的减免单价（扣/退同价，换驻守不赚差价）
  const updatedInventory = { ...state.inventory };
  Object.entries(perBatch).forEach(([itemId, qty]) => {
    updatedInventory[itemId] = (updatedInventory[itemId] || 0) - qty * target;
  });
  const updatedUnits = units.map((u, i) =>
    i === unitIndex
      ? {
          ...u,
          recipeId,
          targetCount: target,
          completedCount: 0,
          timeLeft: getActualDuration(recipeId, fac.level, bonuses.speedMultiplier),
          currentProgress: 0,
          costReduction: bonuses.costReduction
        }
      : u
  );
  return {
    state: { ...withUnits(state, type, updatedUnits), inventory: updatedInventory },
    result: true
  };
};

// 取消任务：退款 = (目标批数 − 已完成批数) × 每批折扣成本（未开始 + 进行中批次全额退）。
// 已产出批次保留；退款不赚差价（与扣款同折扣单价）。待机时拒绝。
export const cancelTaskUpdate = (state: GameState, type: FacilityType, unitIndex: number): UpdateResult<boolean> => {
  const units = getUnits(state, type);
  if (!units || !units[unitIndex]) return NO_OP(state);
  const fac = units[unitIndex];
  if (!fac.recipeId) return NO_OP(state); // 待机无任务可取消

  const recipe = AUTO_RECIPES[fac.recipeId];
  // 退款按任务开始时刻的减免快照（扣/退同价）；旧存档无快照时回退当前驻守减免
  const costReduction = fac.costReduction ?? resolveDutyBonus(state, type, unitIndex).bonuses.costReduction;
  const remainingBatches = Math.max(0, fac.targetCount - fac.completedCount);
  const updatedInventory = { ...state.inventory };
  if (recipe && remainingBatches > 0) {
    const perBatch = getBatchDiscountedCost(recipe, costReduction);
    Object.entries(perBatch).forEach(([itemId, qty]) => {
      updatedInventory[itemId] = (updatedInventory[itemId] || 0) + qty * remainingBatches;
    });
  }

  const updatedUnits = units.map((u, i) =>
    i === unitIndex
      ? { ...u, recipeId: null, targetCount: 0, completedCount: 0, timeLeft: 0, currentProgress: 0, costReduction: undefined }
      : u
  );
  return {
    state: { ...withUnits(state, type, updatedUnits), inventory: updatedInventory },
    result: true
  };
};

// === 基建升级（耗时施工，时间戳驱动）：开始升级扣材料 → 升级中 → resolve 完成应用 ===

// 升级条目 key：单实例升级项 = id；产线设施 = `${type}_${unitIndex}`；扩建 = `expand_${type}`
export const getShelterUpgradeKey = (statType: UpgradeStatType, unitIndex = 0): string =>
  isFacilityType(statType) ? `${statType}_${unitIndex}` : statType;

export const getFacilityExpansionKey = (type: FacilityType): string => `expand_${type}`;

// 当前等级（greenhouse_dock 由已解锁槽位推导：每级 +2 槽，初始 4 槽 = Lv0，旧存档自动换算）
export const getShelterUpgradeLevel = (state: GameState, statType: UpgradeStatType, unitIndex = 0): number => {
  if (statType === 'battery') return state.shelter.batteryLevel || 1;
  if (statType === 'generator') return state.shelter.generatorLevel || 0;
  if (statType === 'recycler') return state.shelter.recyclerLevel || 0;
  if (statType === 'greenhouse_dock') {
    return Math.max(0, Math.floor((state.greenhouse.unlockedSlotsCount - 4) / GAME_CONSTANTS.GREENHOUSE_EXPANSION_INCREMENT));
  }
  // 设施类型：读设备配置表（按台索引取等级）
  return state.shelter.facilities[statType]?.[unitIndex]?.level || 1;
};

// 升级中条目的目标耗时（秒）：升级 → 下一级 duration；扩建 → 对应台数 durations
// 配置源分派：expand_ 前缀读设备配置表的 expansion；其余按 statType 分派设备/全局升级表
export const getUpgradeDurationSeconds = (state: GameState, key: string): number | null => {
  if (key.startsWith('expand_')) {
    const type = key.slice('expand_'.length);
    if (!isFacilityType(type)) return null;
    const cfg = FACILITIES_CONFIG[type].expansion;
    const units = state.shelter.facilities[type];
    if (!units) return null;
    const duration = cfg.durations[units.length - 1];
    return duration === undefined ? null : duration;
  }
  const parsed = parseUnitUpgradeKey(key);
  if (!parsed) return null;
  const { statType, unitIndex } = parsed;
  const nextConfig = getUpgradeLevels(statType).find(l => l.level === getShelterUpgradeLevel(state, statType, unitIndex) + 1);
  return nextConfig ? nextConfig.duration : null;
};

// 解析 `${type}_${index}` 形式的产线设施升级 key；单实例升级项直接返回
function parseUnitUpgradeKey(key: string): { statType: UpgradeStatType; unitIndex: number } | null {
  const m = /^(.*)_(\d+)$/.exec(key);
  if (m && isFacilityType(m[1])) return { statType: m[1], unitIndex: Number(m[2]) };
  if (isFacilityType(key) || key in SHELTER_UPGRADES) return { statType: key as UpgradeStatType, unitIndex: 0 };
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
// 配置源分派：设施类型读设备配置表，全局类型读 SHELTER_UPGRADES
// 返回 UpdateResult<boolean>：false = 拒绝（配置缺失/满级/施工中/材料不足）
export const upgradeShelterStatUpdate = (
  state: GameState,
  statType: UpgradeStatType,
  unitIndex = 0,
  startTime = Date.now()
): UpdateResult<boolean> => {
  const levels = getUpgradeLevels(statType);
  if (levels.length === 0) return NO_OP(state);

  const currentLevel = getShelterUpgradeLevel(state, statType, unitIndex);
  const nextLevelConfig = levels.find(l => l.level === currentLevel + 1);
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
// 扩建配置内聚于设备配置表（FACILITIES_CONFIG[type].expansion）
export const expandFacilityUpdate = (state: GameState, type: FacilityType, startTime = Date.now()): UpdateResult<boolean> => {
  const cfg = FACILITIES_CONFIG[type]?.expansion;
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
  // 扩建：新增一台同类型设施（Lv1、待机、默认启用）
  if (key.startsWith('expand_')) {
    const type = key.slice('expand_'.length);
    if (!isFacilityType(type)) return null;
    const cfg = FACILITIES_CONFIG[type].expansion;
    const units = state.shelter.facilities[type];
    if (!cfg || !units || units.length === 0 || units.length >= cfg.maxUnits) return null;
    const template = units[0];
    const newUnit: AutomationFacility = {
      id: type,
      name: template?.name || FACILITIES_CONFIG[type].name || '产线设施',
      level: 1,
      recipeId: null,
      targetCount: 0,
      completedCount: 0,
      timeLeft: 0,
      currentProgress: 0
    };
    const next = {
      ...state,
      shelter: {
        ...state.shelter,
        facilities: { ...state.shelter.facilities, [type]: [...units, newUnit] }
      }
    };
    return { state: removeUpgrade(next, key), text: `${template?.name || FACILITIES_CONFIG[type].name || type} 扩建完成：新增 ${units.length + 1} 号设施` };
  }

  const parsed = parseUnitUpgradeKey(key);
  if (!parsed) return null;
  const { statType, unitIndex } = parsed;
  const levels = getUpgradeLevels(statType);
  const nextConfig = levels.find(l => l.level === getShelterUpgradeLevel(state, statType, unitIndex) + 1);
  if (!nextConfig) return null;

  let currentShelter = { ...state.shelter, facilities: { ...state.shelter.facilities } };
  let displayName = getUpgradeName(statType) || statType;

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
    return { state: removeUpgrade(next, key), text: `${displayName} 升级至 Lv.${nextConfig.level}（培养槽 ${nextCount} 槽）` };
  } else {
    if (!isFacilityType(statType)) return null;
    const units = currentShelter.facilities[statType];
    if (!units?.[unitIndex]) return null;
    currentShelter.facilities = {
      ...currentShelter.facilities,
      [statType]: units.map((u, i) => (i === unitIndex ? { ...u, level: nextConfig.level } : u))
    };
  }

  return {
    state: removeUpgrade({ ...state, shelter: currentShelter }, key),
    text: `${displayName} 升级至 Lv.${nextConfig.level}`
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
    const type = key.slice('expand_'.length);
    if (isFacilityType(type)) {
      const cfg = FACILITIES_CONFIG[type].expansion;
      const units = state.shelter.facilities[type];
      const cost = cfg && units ? cfg.costs[units.length - 1] : null;
      if (cost) Object.assign(refund, cost);
    }
  } else {
    const parsed = parseUnitUpgradeKey(key);
    if (parsed) {
      const nextConfig = getUpgradeLevels(parsed.statType).find(l => l.level === getShelterUpgradeLevel(state, parsed.statType, parsed.unitIndex) + 1);
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
