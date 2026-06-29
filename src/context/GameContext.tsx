import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { GameState, GreenhouseSlot, PlayerStats, AutoRecipe, OfflineReport, ShelterStats, AutomationFacility } from '../types/game';
import cropGlowGrass from '../assets/crop_glow_grass.jpg';
import cropAetherBerry from '../assets/crop_aether_berry.jpg';
import cropSteelSunflower from '../assets/crop_steel_sunflower.jpg';
import cropMagmaPepper from '../assets/crop_magma_pepper.jpg';
import cropFrostBell from '../assets/crop_frost_bell.jpg';
import cropPlasmaPumpkin from '../assets/crop_plasma_pumpkin.jpg';
import cropVoidLotus from '../assets/crop_void_lotus.jpg';
import { RECIPES_CONFIG } from '../data/recipes';

export const AUTO_RECIPES: Record<string, AutoRecipe> = {
  smelt_alloy: { id: 'smelt_alloy', name: '提炼合金金属板', input: { scrap_metal: 2 }, output: { alloy_plate: 1 }, duration: 30 },
  smelt_sunflower: { id: 'smelt_sunflower', name: '钢纹花瓣熔炼', input: { steel_petal: 3, scrap_metal: 1 }, output: { alloy_plate: 2 }, duration: 45 },
  assemble_ration: { id: 'assemble_ration', name: '自动合成压缩口粮', input: { glow_fiber: 3 }, output: { ration: 1 }, duration: 20 },
  assemble_energy: { id: 'assemble_energy', name: '能量补充剂组装', input: { glow_fiber: 2, scrap_metal: 1 }, output: { energy_refill: 1 }, duration: 40 },
  assemble_turret: { id: 'assemble_turret', name: '防御炮塔装配', input: { scrap_metal: 3, glow_fiber: 3 }, output: { defensive_turret: 1 }, duration: 90 }
};

export const EXPEDITION_LOCATIONS = {
  radar_station: {
    id: 'radar_station',
    name: '雷达站废墟',
    requiredRole: null,
    scavengeInterval: 300,
    lootTable: [
      { itemId: 'scrap_metal', chance: 0.7, minQty: 1, maxQty: 2 },
      { itemId: 'energy_refill', chance: 0.1, minQty: 1, maxQty: 1 },
      { itemId: 'seed_glow_grass', chance: 0.2, minQty: 1, maxQty: 1 }
    ]
  },
  subway_station: {
    id: 'subway_station',
    name: '坍塌地铁站',
    requiredRole: 'scout',
    scavengeInterval: 240,
    lootTable: [
      { itemId: 'scrap_metal', chance: 0.8, minQty: 1, maxQty: 3 },
      { itemId: 'steel_petal', chance: 0.3, minQty: 1, maxQty: 2 },
      { itemId: 'seed_aether_berry', chance: 0.15, minQty: 1, maxQty: 1 }
    ]
  },
  bio_lab: {
    id: 'bio_lab',
    name: '生化实验室',
    requiredRole: 'engineer',
    scavengeInterval: 360,
    lootTable: [
      { itemId: 'mana_dust', chance: 0.5, minQty: 1, maxQty: 2 },
      { itemId: 'dream_shard', chance: 0.2, minQty: 1, maxQty: 1 },
      { itemId: 'purifying_serum', chance: 0.05, minQty: 1, maxQty: 1 }
    ]
  }
};


// 静态作物配置表
export const CROPS_CONFIG = {
  glow_grass: {
    id: "glow_grass",
    name: "辐射荧光草",
    growthTime: 30, // 30秒
    yields: { glow_fiber: 2, mana_dust: 1 },
    seedCost: { seed_glow_grass: 1 },
    description: "能在微弱辐射下散发冷光的杂草，蕴含微量魔力。",
    image: cropGlowGrass
  },
  aether_berry: {
    id: "aether_berry",
    name: "以太浆果",
    growthTime: 120, // 2分钟
    yields: { aether_pulp: 3, dream_shard: 1 },
    seedCost: { seed_aether_berry: 1 },
    description: "呈淡紫色的多汁浆果，能引起轻微的心灵共鸣。",
    image: cropAetherBerry
  },
  steel_sunflower: {
    id: "steel_sunflower",
    name: "钢纹向日葵",
    growthTime: 600, // 10分钟
    yields: { steel_petal: 4, alloy_plate: 1 },
    seedCost: { seed_steel_sunflower: 1 },
    description: "花瓣带金属纹路的植物，可提取出废土合金材料。",
    image: cropSteelSunflower
  },
  magma_pepper: {
    id: "magma_pepper",
    name: "熔岩椒",
    growthTime: 240, // 4分钟
    yields: { magma_core: 2, glow_fiber: 1 },
    seedCost: { seed_magma_pepper: 1 },
    description: "表皮滚烫，蕴含大量热能的变异辣椒。",
    image: cropMagmaPepper
  },
  frost_bell: {
    id: "frost_bell",
    name: "霜冻风铃草",
    growthTime: 480, // 8分钟
    yields: { frost_crystal: 2, mana_dust: 1 },
    seedCost: { seed_frost_bell: 1 },
    description: "发出清脆魔能共鸣的低温花卉。",
    image: cropFrostBell
  },
  plasma_pumpkin: {
    id: "plasma_pumpkin",
    name: "等离子南瓜",
    growthTime: 720, // 12分钟
    yields: { plasma_cell: 2, alloy_plate: 1 },
    seedCost: { seed_plasma_pumpkin: 1 },
    description: "外皮流淌金色电弧，可用于提炼应急能源。",
    image: cropPlasmaPumpkin
  },
  void_lotus: {
    id: "void_lotus",
    name: "虚空魔莲",
    growthTime: 1200, // 20分钟
    yields: { void_essence: 3, dream_shard: 2 },
    seedCost: { seed_void_lotus: 1 },
    description: "生长在心灵裂隙边缘的幽紫色花朵，能调和脑电波。",
    image: cropVoidLotus
  }
};


const INITIAL_PLAYER_STATS: PlayerStats = {
  hp: 100,
  maxHp: 100,
  food: 100,
  maxFood: 100,
  energy: 100,
  maxEnergy: 100,
  sanity: 100,
  maxSanity: 100,
  days: 1
};

const INITIAL_STATE: GameState = {
  player: INITIAL_PLAYER_STATS,
  inventory: {
    seed_glow_grass: 5,   // 初始赠送5个种子
    seed_aether_berry: 2,
    ration: 5,            // 5份口粮
    scrap_metal: 10,       // 10个废铁
    dream_shard: 5        // 5个梦境碎片用于初期制造梦胶囊
  },
  greenhouse: {
    slots: [
      { id: 1, cropId: null, growthProgress: 0, growthTimeLeft: 0, isWatered: false },
      { id: 2, cropId: null, growthProgress: 0, growthTimeLeft: 0, isWatered: false },
      { id: 3, cropId: null, growthProgress: 0, growthTimeLeft: 0, isWatered: false },
      { id: 4, cropId: null, growthProgress: 0, growthTimeLeft: 0, isWatered: false }
    ],
    unlockedSlotsCount: 4
  },
  survivors: {},
  exploration: {
    inRealityExploration: false,
    realitySteps: 0,
    realityLocationId: null,
    realityBag: {},
    realityEventId: null,
    inDreamExploration: false,
    dreamSteps: 0,
    dreamPollution: 0,
    dreamBag: {},
    dreamEventId: null,
    capsulesCharge: {
      sanity_capsule: 3, // 默认解锁并充能3次
      warp_capsule: 0    // 未解锁/无充能
    },
    survivorResonance: {}
  },
  discoveredBlueprints: [
    'filter_refill',
    'ration_pack',
    'sanity_capsule',
    'hot_stew',
    'nanite_injector',
    'purifying_serum',
    'energy_refill_advanced',
    'shield_battery_recipe',
    'greenhouse_expansion'
  ],
  activeAlert: {
    type: null,
    hp: 0
  },
  lastTick: Date.now(),
  dayStartTime: Date.now(),
  logs: [
    { id: 'init', text: '▶ 避难所系统启动。欢迎来到废土魔导温室，生存者。', timestamp: Date.now(), type: 'system' }
  ],
  shelter: {
    maxOfflineDuration: 14400, // 4小时
    batteryLevel: 1,
    generatorLevel: 0, // 初始未启用自动发电机
    recyclerLevel: 0,  // 初始未启用物资回收站
    facilities: {
      smelter: {
        id: 'smelter',
        name: '魔导冶炼炉',
        level: 1,
        activeRecipeId: null,
        currentProgress: 0,
        timeLeft: 0,
        assignedSurvivorId: null
      },
      assembler: {
        id: 'assembler',
        name: '微型芯片组装台',
        level: 1,
        activeRecipeId: null,
        currentProgress: 0,
        timeLeft: 0,
        assignedSurvivorId: null
      }
    },
    assignedWatererId: null,
    assignedExplorerId: null,
    expedition: {
      locationId: null,
      startTime: null,
      lastScavengeTime: null
    },
    accumulatedEnergy: 0,
    accumulatedScrap: 0
  },
  lastOfflineReport: null
};

// 纯函数：计算离线或Tick生长时间扣减
export function calculateOfflineProgress(
  slots: GreenhouseSlot[],
  elapsedSeconds: number,
  cropsConfig: Record<string, { growthTime: number }> = CROPS_CONFIG
): GreenhouseSlot[] {
  return slots.map(slot => {
    if (!slot.cropId) return slot;
    const config = cropsConfig[slot.cropId];
    if (!config) return slot;

    // 浇水倍速增长 (生长速度翻倍，相当于扣减时间速度变2倍)
    const speedMultiplier = slot.isWatered ? 2 : 1;
    const timeReduced = elapsedSeconds * speedMultiplier;
    const newTimeLeft = Math.max(0, slot.growthTimeLeft - timeReduced);
    const progress = Math.min(100, Math.round(((config.growthTime - newTimeLeft) / config.growthTime) * 100));

    return {
      ...slot,
      growthTimeLeft: newTimeLeft,
      growthProgress: progress
    };
  });
}

export function calculateDetailedOfflineProgress(
  state: GameState,
  elapsedSeconds: number
): { updatedState: GameState; report: OfflineReport } {
  const actualSeconds = Math.min(elapsedSeconds, state.shelter.maxOfflineDuration);
  const reportLogs: string[] = [];
  const recoveredItems: Record<string, number> = {};

  let currentInventory = { ...state.inventory };
  let currentEnergy = state.player.energy;

  // 2. 发电机与回收站自动产出
  let energyGained = 0;
  const hasNova = !!state.survivors.nova;
  const currentMaxEnergy = hasNova ? 130 : (state.player.maxEnergy || 100);

  let finalAccumulatedEnergy = state.shelter.accumulatedEnergy || 0;
  if (state.shelter.generatorLevel > 0) {
    // 由于发电机没有独立岗位，此处理论上借用“魔导冶炼炉”中派驻的幸存者（需为工程师）作为魔力发电机调校员提供 50% 额外发电效率
    const speedBonus = 1 + (state.survivors[state.shelter.facilities.smelter?.assignedSurvivorId || '']?.role === 'engineer' ? 0.5 : 0);
    const totalOfflineEnergy = actualSeconds * (state.shelter.generatorLevel * 0.005) * speedBonus;
    energyGained = Math.floor(totalOfflineEnergy);
    
    // 合并离线与下线前的魔能累加器，避免极微小的精度损失
    finalAccumulatedEnergy += (totalOfflineEnergy - energyGained);
    if (finalAccumulatedEnergy >= 1) {
      const extraEnergy = Math.floor(finalAccumulatedEnergy);
      energyGained += extraEnergy;
      finalAccumulatedEnergy -= extraEnergy;
    }
    
    currentEnergy = Math.min(currentMaxEnergy, currentEnergy + energyGained);
    if (energyGained > 0) {
      reportLogs.push(`⚡ 避难所魔能发电机在挂机期间累计凝聚了 ${energyGained} 点魔能。`);
    }
  }

  let scrapGained = 0;
  let finalAccumulatedScrap = state.shelter.accumulatedScrap || 0;
  if (state.shelter.recyclerLevel > 0) {
    const totalOfflineScrap = actualSeconds * (state.shelter.recyclerLevel * 0.002);
    scrapGained = Math.floor(totalOfflineScrap);
    
    // 合并离线与下线前的回收站累加器
    finalAccumulatedScrap += (totalOfflineScrap - scrapGained);
    if (finalAccumulatedScrap >= 1) {
      const extraScrap = Math.floor(finalAccumulatedScrap);
      scrapGained += extraScrap;
      finalAccumulatedScrap -= extraScrap;
    }

    if (scrapGained > 0) {
      currentInventory.scrap_metal = (currentInventory.scrap_metal || 0) + scrapGained;
      recoveredItems.scrap_metal = (recoveredItems.scrap_metal || 0) + scrapGained;
      reportLogs.push(`🔧 物资回收站自动收集并提炼了 ${scrapGained} 个废旧金属。`);
    }
  }

  // 3. 挂机派遣拾荒结算
  const exp = state.shelter.expedition;
  let nextLastScavengeTime = exp.lastScavengeTime;
  if (exp.locationId && state.shelter.assignedExplorerId) {
    const loc = EXPEDITION_LOCATIONS[exp.locationId as keyof typeof EXPEDITION_LOCATIONS];
    if (loc) {
      const explorer = state.survivors[state.shelter.assignedExplorerId];
      const speedBonus = 1 + (explorer?.role === 'scout' ? explorer.bonus : 0);
      const actualInterval = Math.max(30, Math.floor(loc.scavengeInterval / speedBonus));
      const scavengeTicks = Math.floor(actualSeconds / actualInterval);

      if (scavengeTicks > 0) {
        const baseScavengeTime = exp.lastScavengeTime || exp.startTime || Date.now();
        // 核心修复：更新 lastScavengeTime 时，必须加上全部流逝时间 elapsedSeconds (即便超出了离线时长上限)
        // 确保未被结算的多余溢出时间能够被彻底消耗，防止重新上线后被秒级 Tick 定时器恶意“补发”
        nextLastScavengeTime = baseScavengeTime + elapsedSeconds * 1000;
      }
      
      let scavengedCount: Record<string, number> = {};
      for (let i = 0; i < scavengeTicks; i++) {
        loc.lootTable.forEach(loot => {
          if (Math.random() <= loot.chance) {
            const qty = Math.floor(Math.random() * (loot.maxQty - loot.minQty + 1)) + loot.minQty;
            scavengedCount[loot.itemId] = (scavengedCount[loot.itemId] || 0) + qty;
          }
        });
      }
      
      Object.entries(scavengedCount).forEach(([itemId, qty]) => {
        currentInventory[itemId] = (currentInventory[itemId] || 0) + qty;
        recoveredItems[itemId] = (recoveredItems[itemId] || 0) + qty;
      });

      if (Object.keys(scavengedCount).length > 0) {
        reportLogs.push(`🤠 幸存者 ${explorer?.name || '探索员'} 挂机探索 ${loc.name} 结束，带回了物资。`);
      }
    }
  }

  // 4. 工厂自动化流水线结算
  const updatedFacilities = { ...state.shelter.facilities };
  Object.entries(updatedFacilities).forEach(([facId, fac]) => {
    if (fac.active === false || !fac.activeRecipeId) return;
    const recipe = AUTO_RECIPES[fac.activeRecipeId];
    if (!recipe) return;

    const operator = state.survivors[fac.assignedSurvivorId || ''];
    const speedBonus = 1 + (operator?.role === 'engineer' ? operator.bonus : 0) + (fac.level - 1) * 0.1;
    const actualDuration = Math.max(1, Math.floor(recipe.duration / speedBonus));

    let facilityGained = 0;
    let facTimeLeft = fac.timeLeft;
    let tempInventory = { ...currentInventory };

    let remainingSeconds = actualSeconds;
    if (facTimeLeft > 0) {
      if (remainingSeconds < facTimeLeft) {
        facTimeLeft -= remainingSeconds;
        remainingSeconds = 0;
      } else {
        remainingSeconds -= facTimeLeft;
        facilityGained += 1;
        facTimeLeft = 0;
      }
    }

    if (remainingSeconds > 0) {
      const maxCycles = Math.floor(remainingSeconds / actualDuration);
      if (maxCycles > 0) {
        let limitCycles = maxCycles;
        Object.entries(recipe.input).forEach(([itemId, qtyNeeded]) => {
          const available = tempInventory[itemId] || 0;
          const possibleCycles = Math.floor(available / qtyNeeded);
          limitCycles = Math.min(limitCycles, possibleCycles);
        });

        if (limitCycles > 0) {
          Object.entries(recipe.input).forEach(([itemId, qtyNeeded]) => {
            tempInventory[itemId] = Math.max(0, (tempInventory[itemId] || 0) - qtyNeeded * limitCycles);
          });
          facilityGained += limitCycles;
          remainingSeconds -= limitCycles * actualDuration;
        }
      }
      
      if (remainingSeconds > 0) {
        let canStartNext = true;
        Object.entries(recipe.input).forEach(([itemId, qtyNeeded]) => {
          if ((tempInventory[itemId] || 0) < qtyNeeded) {
            canStartNext = false;
          }
        });
        if (canStartNext) {
          Object.entries(recipe.input).forEach(([itemId, qtyNeeded]) => {
            tempInventory[itemId] = (tempInventory[itemId] || 0) - qtyNeeded;
          });
          facTimeLeft = Math.max(1, Math.round(actualDuration - remainingSeconds));
        } else {
          facTimeLeft = 0;
        }
      } else {
        facTimeLeft = 0;
      }
    }

    if (facilityGained > 0) {
      currentInventory = tempInventory;
      Object.entries(recipe.output).forEach(([itemId, qtyProduced]) => {
        const totalQty = qtyProduced * facilityGained;
        currentInventory[itemId] = (currentInventory[itemId] || 0) + totalQty;
        recoveredItems[itemId] = (recoveredItems[itemId] || 0) + totalQty;
      });
      reportLogs.push(`🏭 ${fac.name} 离线运转 ${facilityGained} 次，加工出 ${recipe.name} 产物。`);
    }

    const progress = facTimeLeft > 0 ? Math.min(100, Math.round(((actualDuration - facTimeLeft) / actualDuration) * 100)) : 0;
    updatedFacilities[facId] = {
      ...fac,
      timeLeft: facTimeLeft,
      currentProgress: progress
    };
  });

  // 5. 温室作物离线生长结算
  const isWateredOffline = state.shelter.assignedWatererId !== null;
  const updatedSlots = state.greenhouse.slots.map(slot => {
    if (!slot.cropId) return slot;
    const config = (CROPS_CONFIG as any)[slot.cropId];
    if (!config) return slot;

    const speedMultiplier = (slot.isWatered || isWateredOffline) ? 2 : 1;
    const timeReduced = actualSeconds * speedMultiplier;
    const newTimeLeft = Math.max(0, slot.growthTimeLeft - timeReduced);
    const progress = Math.min(100, Math.round(((config.growthTime - newTimeLeft) / config.growthTime) * 100));

    return {
      ...slot,
      growthTimeLeft: newTimeLeft,
      growthProgress: progress,
      isWatered: isWateredOffline ? true : slot.isWatered
    };
  });

  const updatedState: GameState = {
    ...state,
    player: { ...state.player, energy: currentEnergy },
    inventory: currentInventory,
    greenhouse: { ...state.greenhouse, slots: updatedSlots },
    shelter: {
      ...state.shelter,
      facilities: updatedFacilities,
      expedition: {
        ...exp,
        lastScavengeTime: nextLastScavengeTime
      },
      accumulatedEnergy: finalAccumulatedEnergy,
      accumulatedScrap: finalAccumulatedScrap
    }
  };

  return {
    updatedState,
    report: {
      elapsedSeconds,
      recoveredEnergy: energyGained,
      recoveredItems,
      logs: reportLogs
    }
  };
}

interface GameContextType {
  state: GameState;
  setState: React.Dispatch<React.SetStateAction<GameState>>;
  plantCrop: (slotId: number, cropId: string) => boolean;
  waterSlot: (slotId: number) => boolean;
  batchWater: () => number;
  harvestSlot: (slotId: number) => Record<string, number> | null;
  batchHarvest: () => Record<string, number> | null;
  batchPlant: (cropId: string) => boolean;
  craftItem: (recipeId: string) => boolean;
  addLog: (text: string, type: 'event' | 'harvest' | 'combat' | 'dream' | 'system') => void;
  resetGame: () => void;
  currentUser: string;
  accounts: string[];
  switchAccount: (username: string) => void;
  createAccount: (username: string) => boolean;
  deleteAccount: (username: string) => void;
  useSupplyItem: (itemId: string) => boolean;
  assignSurvivorJob: (survivorId: string, jobId: string | null) => boolean;
  setFacilityRecipe: (facilityId: string, recipeId: string | null) => boolean;
  setFacilityActive: (facilityId: string, active: boolean) => boolean;
  upgradeShelterStat: (statType: 'battery' | 'generator' | 'recycler' | 'smelter' | 'assembler') => boolean;
  startExpedition: (survivorId: string, locationId: string) => boolean;
  stopExpedition: () => boolean;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const getAccountsList = (): string[] => {
  const listJson = localStorage.getItem('aether_garden_accounts_list');
  if (listJson) {
    try {
      const parsed = JSON.parse(listJson);
      if (Array.isArray(parsed) && parsed.includes('Guest')) return parsed;
      if (Array.isArray(parsed)) return ['Guest', ...parsed.filter((u: string) => u !== 'Guest')];
    } catch (e) {
      console.error("Failed to parse accounts list", e);
    }
  }
  return ['Guest'];
};

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<string>(() => {
    return localStorage.getItem('aether_garden_save_current_user') || 'Guest';
  });
  const [accounts, setAccounts] = useState<string[]>(getAccountsList);

  const [state, setState] = useState<GameState>(() => {
    const curUser = localStorage.getItem('aether_garden_save_current_user') || 'Guest';
    const saved = localStorage.getItem(`aether_garden_save_${curUser}`);
    const now = Date.now();
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as GameState;
        const elapsedSeconds = parsed.lastTick ? Math.max(0, Math.floor((now - parsed.lastTick) / 1000)) : 0;
        const mergedState: GameState = {
          ...INITIAL_STATE,
          ...parsed,
          greenhouse: {
            ...INITIAL_STATE.greenhouse,
            ...(parsed.greenhouse || {})
          },
          shelter: {
            ...INITIAL_STATE.shelter,
            ...(parsed.shelter || {}),
            facilities: {
              ...INITIAL_STATE.shelter.facilities,
              ...((parsed.shelter && parsed.shelter.facilities) || {})
            }
          },
          exploration: {
            ...INITIAL_STATE.exploration,
            ...(parsed.exploration || {}),
            capsulesCharge: {
              ...INITIAL_STATE.exploration.capsulesCharge,
              ...((parsed.exploration && parsed.exploration.capsulesCharge) || {})
            },
            survivorResonance: {
              ...INITIAL_STATE.exploration.survivorResonance,
              ...((parsed.exploration && parsed.exploration.survivorResonance) || {})
            }
          }
        };
        const { updatedState, report } = calculateDetailedOfflineProgress(mergedState, elapsedSeconds);
        return {
          ...updatedState,
          lastTick: now,
          dayStartTime: parsed.dayStartTime || now,
          lastOfflineReport: report
        };
      } catch (e) {
        console.error("Failed to load save in state initializer", e);
        return { ...INITIAL_STATE, lastTick: now, dayStartTime: now };
      }
    }
    return { ...INITIAL_STATE, lastTick: now, dayStartTime: now };
  });

  // stateRef: 同步镜像 state，使事件处理器可直接读取最新状态（绕开 setState 异步问题）
  const stateRef = useRef<GameState>(state);
  stateRef.current = state; // 每次渲染时同步更新

  // 1. ✅ 自动存盘 Effect
  useEffect(() => {
    localStorage.setItem(`aether_garden_save_${currentUser}`, JSON.stringify(state));
  }, [state, currentUser]);

  // 2. ✅ 初始化 Effect
  useEffect(() => {
    const curUser = localStorage.getItem('aether_garden_save_current_user') || 'Guest';
    localStorage.setItem('aether_garden_save_current_user', curUser);

    const list = getAccountsList();
    if (!list.includes('Guest')) {
      localStorage.setItem('aether_garden_accounts_list', JSON.stringify(['Guest', ...list]));
    } else {
      localStorage.setItem('aether_garden_accounts_list', JSON.stringify(list));
    }
  }, []);

  // 3. ✅ 游戏全局 Tick 循环 - 修复天数递增
  const GAME_DAY_SECONDS = 300; // 5分钟真实时间 = 1游戏天（可配置）
  useEffect(() => {
    const timer = setInterval(() => {
      setState(prev => {
        const now = Date.now();

        // 梦魇入侵时冻结温室
        if (prev.activeAlert.type === 'dream_leak') {
          return { ...prev, lastTick: now };
        }

        let currentInventory = { ...prev.inventory };
        let currentEnergy = prev.player.energy;
        const hasNova = !!prev.survivors.nova;
        const currentMaxEnergy = hasNova ? 130 : (prev.player.maxEnergy || 100);

        let nextAccumulatedEnergy = prev.shelter.accumulatedEnergy ?? 0;
        let nextAccumulatedScrap = prev.shelter.accumulatedScrap ?? 0;

        // 1. 发电机与回收站自动产出
        if (prev.shelter.generatorLevel > 0) {
          // 由于发电机没有独立排班，此处借用“魔导冶炼炉”中派驻的工程师作为调校员提供发电机增益
          const speedBonus = 1 + (prev.survivors[prev.shelter.facilities.smelter?.assignedSurvivorId || '']?.role === 'engineer' ? 0.5 : 0);
          const energyGained = (prev.shelter.generatorLevel * 0.005) * speedBonus;
          nextAccumulatedEnergy += energyGained;
        }

        if (prev.shelter.recyclerLevel > 0) {
          const scrapGained = prev.shelter.recyclerLevel * 0.002;
          nextAccumulatedScrap += scrapGained;
        }

        if (nextAccumulatedEnergy >= 1) {
          const intEnergy = Math.floor(nextAccumulatedEnergy);
          currentEnergy = Math.min(currentMaxEnergy, currentEnergy + intEnergy);
          nextAccumulatedEnergy -= intEnergy;
        }

        if (nextAccumulatedScrap >= 1) {
          const intScrap = Math.floor(nextAccumulatedScrap);
          currentInventory.scrap_metal = (currentInventory.scrap_metal || 0) + intScrap;
          nextAccumulatedScrap -= intScrap;
        }

        // 2. 温室作物托管浇水与生长
        const isWateredOffline = prev.shelter.assignedWatererId !== null;
        const updatedSlots = prev.greenhouse.slots.map(slot => {
          if (!slot.cropId) return slot;
          const config = (CROPS_CONFIG as any)[slot.cropId];
          if (!config) return slot;

          const speedMultiplier = (slot.isWatered || isWateredOffline) ? 2 : 1;
          const timeReduced = 1 * speedMultiplier;
          const newTimeLeft = Math.max(0, slot.growthTimeLeft - timeReduced);
          const progress = Math.min(100, Math.round(((config.growthTime - newTimeLeft) / config.growthTime) * 100));

          return {
            ...slot,
            growthTimeLeft: newTimeLeft,
            growthProgress: progress,
            isWatered: isWateredOffline ? true : slot.isWatered
          };
        });

        // 3. 工厂流水线 Tick
        const updatedFacilities = { ...prev.shelter.facilities };
        const logsToAdd: string[] = [];

        Object.entries(updatedFacilities).forEach(([facId, fac]) => {
          if (fac.active === false || !fac.activeRecipeId) return;
          const recipe = AUTO_RECIPES[fac.activeRecipeId];
          if (!recipe) return;

          const operator = prev.survivors[fac.assignedSurvivorId || ''];
          const speedBonus = 1 + (operator?.role === 'engineer' ? operator.bonus : 0) + (fac.level - 1) * 0.1;
          const actualDuration = Math.max(1, Math.floor(recipe.duration / speedBonus));

          let facTimeLeft = fac.timeLeft;

          if (facTimeLeft > 0) {
            facTimeLeft -= 1;
            if (facTimeLeft === 0) {
              // 一轮完成，尝试产出
              Object.entries(recipe.output).forEach(([itemId, qtyProduced]) => {
                currentInventory[itemId] = (currentInventory[itemId] || 0) + qtyProduced;
              });
              logsToAdd.push(`🏭 ${fac.name} 完成了 ${recipe.name} 的加工。`);

              // 尝试扣除材料开始下一轮
              let canStartNext = true;
              Object.entries(recipe.input).forEach(([itemId, qtyNeeded]) => {
                if ((currentInventory[itemId] || 0) < qtyNeeded) {
                  canStartNext = false;
                }
              });
              if (canStartNext) {
                Object.entries(recipe.input).forEach(([itemId, qtyNeeded]) => {
                  currentInventory[itemId] = (currentInventory[itemId] || 0) - qtyNeeded;
                });
                facTimeLeft = actualDuration;
              }
            }
          } else {
            // 处于空闲状态，尝试启动新一轮
            let canStartNext = true;
            Object.entries(recipe.input).forEach(([itemId, qtyNeeded]) => {
              if ((currentInventory[itemId] || 0) < qtyNeeded) {
                canStartNext = false;
              }
            });
            if (canStartNext) {
              Object.entries(recipe.input).forEach(([itemId, qtyNeeded]) => {
                currentInventory[itemId] = (currentInventory[itemId] || 0) - qtyNeeded;
              });
              facTimeLeft = actualDuration;
            }
          }

          const progress = facTimeLeft > 0 ? Math.min(100, Math.round(((actualDuration - facTimeLeft) / actualDuration) * 100)) : 0;
          updatedFacilities[facId] = {
            ...fac,
            timeLeft: facTimeLeft,
            currentProgress: progress
          };
        });

        // 4. 挂机探索派遣 Tick
        const exp = prev.shelter.expedition;
        let nextLastScavengeTime = exp.lastScavengeTime;
        if (exp.locationId && prev.shelter.assignedExplorerId) {
          const loc = EXPEDITION_LOCATIONS[exp.locationId as keyof typeof EXPEDITION_LOCATIONS];
          if (loc) {
            const explorer = prev.survivors[prev.shelter.assignedExplorerId];
            const speedBonus = 1 + (explorer?.role === 'scout' ? explorer.bonus : 0);
            const actualInterval = Math.max(30, Math.floor(loc.scavengeInterval / speedBonus));

            const timeDiff = now - (exp.lastScavengeTime || exp.startTime || now);
            const ticks = Math.floor(timeDiff / (actualInterval * 1000));
            if (ticks > 0) {
              let scavengedCount: Record<string, number> = {};
              for (let t = 0; t < ticks; t++) {
                loc.lootTable.forEach(loot => {
                  if (Math.random() <= loot.chance) {
                    const qty = Math.floor(Math.random() * (loot.maxQty - loot.minQty + 1)) + loot.minQty;
                    scavengedCount[loot.itemId] = (scavengedCount[loot.itemId] || 0) + qty;
                  }
                });
              }

              Object.entries(scavengedCount).forEach(([itemId, qty]) => {
                currentInventory[itemId] = (currentInventory[itemId] || 0) + qty;
              });

              nextLastScavengeTime = (exp.lastScavengeTime || exp.startTime || now) + ticks * actualInterval * 1000;

              if (Object.keys(scavengedCount).length > 0) {
                const itemsStr = Object.entries(scavengedCount).map(([id, q]) => `${q}个${id}`).join(', ');
                logsToAdd.push(`🤠 探索员 ${explorer?.name || '幸存者'} 拾荒带回了: ${itemsStr}`);
              }
            }
          }
        }

        // 天数递增
        let newDays = prev.player.days;
        let newDayStartTime = prev.dayStartTime;
        if (now - prev.dayStartTime >= GAME_DAY_SECONDS * 1000) {
          newDays += 1;
          newDayStartTime = now;
        }

        // 更新日志
        let newLogs = prev.logs;
        if (logsToAdd.length > 0) {
          const logEntries = logsToAdd.map(logText => ({
            id: `${Date.now()}_${Math.random()}`,
            text: logText,
            timestamp: Date.now(),
            type: 'system' as const
          }));
          newLogs = [...logEntries, ...prev.logs].slice(0, 100);
        }

        return {
          ...prev,
          player: { ...prev.player, energy: currentEnergy, days: newDays },
          inventory: currentInventory,
          greenhouse: { ...prev.greenhouse, slots: updatedSlots },
          shelter: {
            ...prev.shelter,
            facilities: updatedFacilities,
            expedition: {
              ...exp,
              lastScavengeTime: nextLastScavengeTime
            },
            accumulatedEnergy: nextAccumulatedEnergy,
            accumulatedScrap: nextAccumulatedScrap
          },
          logs: newLogs,
          lastTick: now,
          dayStartTime: newDayStartTime
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const switchAccount = (username: string) => {
    // 立即保存当前账号状态
    localStorage.setItem(`aether_garden_save_${currentUser}`, JSON.stringify(stateRef.current));

    const saved = localStorage.getItem(`aether_garden_save_${username}`);
    let newState: GameState;
    const now = Date.now();
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as GameState;
        const elapsedSeconds = parsed.lastTick ? Math.max(0, Math.floor((now - parsed.lastTick) / 1000)) : 0;
        const mergedState: GameState = {
          ...INITIAL_STATE,
          ...parsed,
          greenhouse: {
            ...INITIAL_STATE.greenhouse,
            ...(parsed.greenhouse || {})
          },
          shelter: {
            ...INITIAL_STATE.shelter,
            ...(parsed.shelter || {}),
            facilities: {
              ...INITIAL_STATE.shelter.facilities,
              ...((parsed.shelter && parsed.shelter.facilities) || {})
            }
          },
          exploration: {
            ...INITIAL_STATE.exploration,
            ...(parsed.exploration || {}),
            capsulesCharge: {
              ...INITIAL_STATE.exploration.capsulesCharge,
              ...((parsed.exploration && parsed.exploration.capsulesCharge) || {})
            },
            survivorResonance: {
              ...INITIAL_STATE.exploration.survivorResonance,
              ...((parsed.exploration && parsed.exploration.survivorResonance) || {})
            }
          }
        };
        const { updatedState, report } = calculateDetailedOfflineProgress(mergedState, elapsedSeconds);
        newState = {
          ...updatedState,
          lastTick: now,
          dayStartTime: parsed.dayStartTime || now,
          lastOfflineReport: report
        };
      } catch (e) {
        console.error("Failed to load save in switchAccount", e);
        newState = { ...INITIAL_STATE, lastTick: now, dayStartTime: now };
      }
    } else {
      newState = { ...INITIAL_STATE, lastTick: now, dayStartTime: now };
    }

    setCurrentUser(username);
    localStorage.setItem('aether_garden_save_current_user', username);
    setState(newState);
  };

  const createAccount = (username: string): boolean => {
    if (!username || !username.trim()) return false;
    const name = username.trim();

    const key = `aether_garden_save_${name}`;
    if (localStorage.getItem(key)) return false;

    const now = Date.now();
    const newAccountState: GameState = {
      ...INITIAL_STATE,
      lastTick: now,
      dayStartTime: now,
      logs: [{ id: `init_${name}`, text: `▶ 生存者 ${name} 的避难所系统已初始化。`, timestamp: now, type: 'system' }]
    };
    localStorage.setItem(key, JSON.stringify(newAccountState));

    const list = getAccountsList();
    if (!list.includes(name)) {
      const updatedList = [...list, name];
      localStorage.setItem('aether_garden_accounts_list', JSON.stringify(updatedList));
      setAccounts(updatedList);
    }
    return true;
  };

  // 删除账号
  const deleteAccount = (username: string) => {
    if (username === 'Guest') {
      const freshState = { ...INITIAL_STATE, lastTick: Date.now() };
      localStorage.setItem('aether_garden_save_Guest', JSON.stringify(freshState));
      if (currentUser === 'Guest') {
        setState(freshState);
      }
      return;
    }

    localStorage.removeItem(`aether_garden_save_${username}`);

    const list = getAccountsList();
    const updatedList = list.filter(u => u !== username);
    localStorage.setItem('aether_garden_accounts_list', JSON.stringify(updatedList));
    setAccounts(updatedList);

    if (currentUser === username) {
      switchAccount('Guest');
    }
  };

  // 种植作物逻辑 - 修复版：先用 stateRef.current 同步校验，再调用 setState 更新
  const plantCrop = (slotId: number, cropId: string): boolean => {
    const cropConfig = CROPS_CONFIG[cropId as keyof typeof CROPS_CONFIG];
    if (!cropConfig) return false;

    const seedId = Object.keys(cropConfig.seedCost)[0];
    const seedQtyNeeded = (cropConfig.seedCost as Record<string, number>)[seedId] || 0;

    // 同步校验（经由 stateRef 读取最新状态）
    const current = stateRef.current;
    const currentSeedCount = current.inventory[seedId] || 0;
    if (currentSeedCount < seedQtyNeeded) return false;

    const targetSlot = current.greenhouse.slots.find(s => s.id === slotId && s.cropId === null);
    if (!targetSlot) return false;

    // 校验通过，执行更新
    setState(prev => ({
      ...prev,
      inventory: { ...prev.inventory, [seedId]: (prev.inventory[seedId] || 0) - seedQtyNeeded },
      greenhouse: {
        ...prev.greenhouse,
        slots: prev.greenhouse.slots.map(s =>
          s.id === slotId
            ? { ...s, cropId, growthProgress: 0, growthTimeLeft: cropConfig.growthTime, isWatered: false }
            : s
        )
      }
    }));
    return true;
  };

  // 给单个槽位浇水
  const waterSlot = (slotId: number): boolean => {
    let success = false;
    setState(prev => {
      // 浇水消耗 2 点魔能
      if (prev.player.energy < 2) return prev;

      const updatedSlots = prev.greenhouse.slots.map(slot => {
        if (slot.id === slotId && slot.cropId !== null && !slot.isWatered) {
          success = true;
          return { ...slot, isWatered: true };
        }
        return slot;
      });

      if (!success) return prev;

      return {
        ...prev,
        player: {
          ...prev.player,
          energy: Math.max(0, prev.player.energy - 2)
        },
        greenhouse: {
          ...prev.greenhouse,
          slots: updatedSlots
        }
      };
    });
    return success;
  };

  // 一键浇水：同步校验并批量执行
  const batchWater = (): number => {
    const current = stateRef.current;
    const energyAvailable = current.player.energy;
    const needWaterSlots = current.greenhouse.slots.filter(s => s.cropId !== null && !s.isWatered);
    
    if (needWaterSlots.length === 0 || energyAvailable < 2) return 0;
    
    const maxWaterable = Math.floor(energyAvailable / 2);
    const actualWaterCount = Math.min(needWaterSlots.length, maxWaterable);
    
    if (actualWaterCount <= 0) return 0;

    setState(prev => {
      let energy = prev.player.energy;
      const updatedSlots = prev.greenhouse.slots.map(slot => {
        if (slot.cropId !== null && !slot.isWatered && energy >= 2) {
          energy -= 2;
          return { ...slot, isWatered: true };
        }
        return slot;
      });

      return {
        ...prev,
        player: { ...prev.player, energy },
        greenhouse: { ...prev.greenhouse, slots: updatedSlots }
      };
    });

    return actualWaterCount;
  };

  // 收割单个成熟槽位
  const harvestSlot = (slotId: number): Record<string, number> | null => {
    let gatheredItems: Record<string, number> | null = null;
    
    setState(prev => {
      const targetSlot = prev.greenhouse.slots.find(s => s.id === slotId);
      if (!targetSlot || !targetSlot.cropId || targetSlot.growthProgress < 100) return prev;

      const config = CROPS_CONFIG[targetSlot.cropId as keyof typeof CROPS_CONFIG];
      gatheredItems = { ...config.yields };

      // 更新背包
      const newInventory = { ...prev.inventory };
      Object.entries(config.yields).forEach(([item, qty]) => {
        newInventory[item] = (newInventory[item] || 0) + qty;
      });

      // 重置该槽位
      const updatedSlots = prev.greenhouse.slots.map(s => {
        if (s.id === slotId) {
          return {
            ...s,
            cropId: null,
            growthProgress: 0,
            growthTimeLeft: 0,
            isWatered: false
          };
        }
        return s;
      });

      return {
        ...prev,
        inventory: newInventory,
        greenhouse: {
          ...prev.greenhouse,
          slots: updatedSlots
        }
      };
    });

    return gatheredItems;
  };

  // 一键收割
  const batchHarvest = (): Record<string, number> | null => {
    let accumulatedYields: Record<string, number> | null = null;

    setState(prev => {
      const slotsToHarvest = prev.greenhouse.slots.filter(s => s.cropId !== null && s.growthProgress >= 100);
      if (slotsToHarvest.length === 0) return prev;

      accumulatedYields = {};
      const newInventory = { ...prev.inventory };

      slotsToHarvest.forEach(slot => {
        const config = CROPS_CONFIG[slot.cropId as keyof typeof CROPS_CONFIG];
        Object.entries(config.yields).forEach(([item, qty]) => {
          accumulatedYields![item] = (accumulatedYields![item] || 0) + qty;
          newInventory[item] = (newInventory[item] || 0) + qty;
        });
      });

      const updatedSlots = prev.greenhouse.slots.map(s => {
        if (s.cropId !== null && s.growthProgress >= 100) {
          return {
            ...s,
            cropId: null,
            growthProgress: 0,
            growthTimeLeft: 0,
            isWatered: false
          };
        }
        return s;
      });

      return {
        ...prev,
        inventory: newInventory,
        greenhouse: {
          ...prev.greenhouse,
          slots: updatedSlots
        }
      };
    });

    return accumulatedYields;
  };

  // 一键播种 - 修复版：同步校验
  const batchPlant = (cropId: string): boolean => {
    const cropConfig = CROPS_CONFIG[cropId as keyof typeof CROPS_CONFIG];
    if (!cropConfig) return false;

    const seedId = Object.keys(cropConfig.seedCost)[0];
    const seedQtyNeeded = (cropConfig.seedCost as Record<string, number>)[seedId] || 0;

    const current = stateRef.current;
    const freeSlots = current.greenhouse.slots.filter(s => s.cropId === null);
    if (freeSlots.length === 0) return false;
    const availableSeedsInit = current.inventory[seedId] || 0;
    if (availableSeedsInit < seedQtyNeeded) return false;

    setState(prev => {
      let availableSeeds = prev.inventory[seedId] || 0;
      let plantedCount = 0;

      const updatedSlots = prev.greenhouse.slots.map(slot => {
        if (slot.cropId === null && availableSeeds >= seedQtyNeeded) {
          availableSeeds -= seedQtyNeeded;
          plantedCount++;
          return { ...slot, cropId, growthProgress: 0, growthTimeLeft: cropConfig.growthTime, isWatered: false };
        }
        return slot;
      });

      if (plantedCount === 0) return prev;

      return {
        ...prev,
        inventory: { ...prev.inventory, [seedId]: availableSeeds },
        greenhouse: { ...prev.greenhouse, slots: updatedSlots }
      };
    });
    return true;
  };

  const resetGame = () => {
    const now = Date.now();
    const freshState = { ...INITIAL_STATE, lastTick: now, dayStartTime: now };
    setState(freshState);
    localStorage.setItem(`aether_garden_save_${currentUser}`, JSON.stringify(freshState));
  };

  // 日志系统
  const addLog = (text: string, type: 'event' | 'harvest' | 'combat' | 'dream' | 'system') => {
    setState(prev => {
      const newEntry = { id: `${Date.now()}_${Math.random()}`, text, timestamp: Date.now(), type };
      const updatedLogs = [newEntry, ...prev.logs].slice(0, 100); // 最多保留 100 条
      return { ...prev, logs: updatedLogs };
    });
  };

  const craftItem = (recipeId: string): boolean => {
    const recipe = RECIPES_CONFIG[recipeId];
    if (!recipe) return false;

    const current = stateRef.current;
    if (recipe.special === 'greenhouse_expansion' && current.greenhouse.unlockedSlotsCount >= 8) {
      return false;
    }

    // 同步校验材料（经由 stateRef 读取最新状态）
    const hasEnough = Object.entries(recipe.cost).every(([item, qty]) => (current.inventory[item] || 0) >= qty);
    if (!hasEnough) return false;

    // 校验通过，执行更新
    setState(prev => {
      const newInventory = { ...prev.inventory };
      Object.entries(recipe.cost).forEach(([item, qty]) => { newInventory[item] = (newInventory[item] || 0) - qty; });

      const newExploration = { ...prev.exploration };
      if (recipe.special === 'capsule_charge' && recipe.capsuleTarget) {
        newExploration.capsulesCharge = {
          ...prev.exploration.capsulesCharge,
          [recipe.capsuleTarget]: (prev.exploration.capsulesCharge[recipe.capsuleTarget] || 0) + (recipe.capsuleAmount || 3)
        };
      } else if (recipe.special === 'greenhouse_expansion') {
        const currentCount = prev.greenhouse.unlockedSlotsCount;
        const nextCount = currentCount + 2;
        const newSlots = [...prev.greenhouse.slots];
        for (let i = currentCount + 1; i <= nextCount; i++) {
          newSlots.push({ id: i, cropId: null, growthProgress: 0, growthTimeLeft: 0, isWatered: false });
        }
        return {
          ...prev,
          inventory: newInventory,
          greenhouse: { ...prev.greenhouse, unlockedSlotsCount: nextCount, slots: newSlots }
        };
      } else {
        Object.entries(recipe.reward).forEach(([item, qty]) => { newInventory[item] = (newInventory[item] || 0) + qty; });
      }

      return { ...prev, inventory: newInventory, exploration: newExploration };
    });
    return true;
  };

  const useSupplyItem = (itemId: string): boolean => {
    const current = stateRef.current;
    const qty = current.inventory[itemId] || 0;
    if (qty <= 0) return false;

    setState(prev => {
      const currentQty = prev.inventory[itemId] || 0;
      if (currentQty <= 0) return prev;

      const newInventory = { ...prev.inventory };
      newInventory[itemId] = currentQty - 1;

      const newPlayer = { ...prev.player };
      const newExploration = { ...prev.exploration };

      const isNovaPresent = !!prev.survivors.nova;
      const currentMaxEnergy = isNovaPresent ? 130 : 100;

      if (itemId === 'ration') {
        newPlayer.food = Math.min(100, newPlayer.food + 30);
      } else if (itemId === 'energy_refill') {
        newPlayer.energy = Math.min(currentMaxEnergy, newPlayer.energy + 30);
      } else if (itemId === 'hot_stew') {
        newPlayer.food = Math.min(100, newPlayer.food + 60);
        newPlayer.hp = Math.min(100, newPlayer.hp + 20);
      } else if (itemId === 'nanite_injector') {
        newPlayer.hp = Math.min(100, newPlayer.hp + 60);
        newPlayer.food = Math.min(100, newPlayer.food + 10);
      } else if (itemId === 'purifying_serum') {
        newPlayer.sanity = Math.min(100, newPlayer.sanity + 30);
        newExploration.dreamPollution = Math.max(0, newExploration.dreamPollution - 30);
      } else {
        return prev;
      }

      return {
        ...prev,
        inventory: newInventory,
        player: newPlayer,
        exploration: newExploration
      };
    });

    return true;
  };

  const assignSurvivorJob = (survivorId: string, jobId: string | null): boolean => {
    let success = false;
    setState(prev => {
      const survivor = prev.survivors[survivorId];
      if (!survivor && survivorId !== '') return prev;

      const updatedSurvivors = { ...prev.survivors };
      const updatedShelter = {
        ...prev.shelter,
        facilities: { ...prev.shelter.facilities }
      };

      if (!jobId) {
        if (updatedShelter.assignedWatererId === survivorId) updatedShelter.assignedWatererId = null;
        if (updatedShelter.assignedExplorerId === survivorId) updatedShelter.assignedExplorerId = null;
        Object.entries(updatedShelter.facilities).forEach(([facId, fac]) => {
          if (fac.assignedSurvivorId === survivorId) {
            updatedShelter.facilities[facId] = { ...fac, assignedSurvivorId: null };
          }
        });
        if (updatedSurvivors[survivorId]) {
          updatedSurvivors[survivorId] = {
            ...updatedSurvivors[survivorId],
            isAssigned: false,
            assignedJobId: null
          };
        }
        success = true;
        return { ...prev, survivors: updatedSurvivors, shelter: updatedShelter };
      }

      let prevOccupantId: string | null = null;
      if (jobId === 'waterer') {
        prevOccupantId = updatedShelter.assignedWatererId;
      } else if (jobId === 'explorer') {
        prevOccupantId = updatedShelter.assignedExplorerId;
      } else if (updatedShelter.facilities[jobId]) {
        prevOccupantId = updatedShelter.facilities[jobId].assignedSurvivorId;
      } else {
        return prev;
      }

      if (updatedShelter.assignedWatererId === survivorId) updatedShelter.assignedWatererId = null;
      if (updatedShelter.assignedExplorerId === survivorId) updatedShelter.assignedExplorerId = null;
      Object.entries(updatedShelter.facilities).forEach(([facId, fac]) => {
        if (fac.assignedSurvivorId === survivorId) {
          updatedShelter.facilities[facId] = { ...fac, assignedSurvivorId: null };
        }
      });

      if (jobId === 'waterer') {
        updatedShelter.assignedWatererId = survivorId;
      } else if (jobId === 'explorer') {
        updatedShelter.assignedExplorerId = survivorId;
        const now = Date.now();
        updatedShelter.expedition = {
          ...updatedShelter.expedition,
          startTime: updatedShelter.expedition.startTime || now,
          lastScavengeTime: updatedShelter.expedition.lastScavengeTime || now
        };
      } else {
        updatedShelter.facilities[jobId] = {
          ...updatedShelter.facilities[jobId],
          assignedSurvivorId: survivorId
        };
      }

      if (prevOccupantId && prevOccupantId !== survivorId && updatedSurvivors[prevOccupantId]) {
        updatedSurvivors[prevOccupantId] = {
          ...updatedSurvivors[prevOccupantId],
          isAssigned: false,
          assignedJobId: null
        };
      }

      if (updatedSurvivors[survivorId]) {
        updatedSurvivors[survivorId] = {
          ...updatedSurvivors[survivorId],
          isAssigned: true,
          assignedJobId: jobId
        };
      }

      success = true;
      return { ...prev, survivors: updatedSurvivors, shelter: updatedShelter };
    });
    return success;
  };

  const setFacilityRecipe = (facilityId: string, recipeId: string | null): boolean => {
    let success = false;
    setState(prev => {
      const facility = prev.shelter.facilities[facilityId];
      if (!facility) return prev;
      if (recipeId && !AUTO_RECIPES[recipeId]) return prev;

      const prevRecipeId = facility.activeRecipeId;
      const prevRecipe = prevRecipeId ? AUTO_RECIPES[prevRecipeId] : null;
      let updatedInventory = { ...prev.inventory };

      // 如果前一个配方正在生产中，退还扣除的原材料
      if (prevRecipe && facility.timeLeft > 0) {
        Object.entries(prevRecipe.input).forEach(([itemId, qty]) => {
          updatedInventory[itemId] = (updatedInventory[itemId] || 0) + qty;
        });
      }

      const updatedFacilities = {
        ...prev.shelter.facilities,
        [facilityId]: {
          ...facility,
          activeRecipeId: recipeId,
          currentProgress: 0,
          timeLeft: 0
        }
      };

      success = true;
      return {
        ...prev,
        inventory: updatedInventory,
        shelter: {
          ...prev.shelter,
          facilities: updatedFacilities
        }
      };
    });
    return success;
  };

  const setFacilityActive = (facilityId: string, active: boolean): boolean => {
    let success = false;
    setState(prev => {
      const facility = prev.shelter.facilities[facilityId];
      if (!facility) return prev;
      success = true;
      return {
        ...prev,
        shelter: {
          ...prev.shelter,
          facilities: {
            ...prev.shelter.facilities,
            [facilityId]: {
              ...facility,
              active
            }
          }
        }
      };
    });
    return success;
  };

  const upgradeShelterStat = (statType: 'battery' | 'generator' | 'recycler' | 'smelter' | 'assembler'): boolean => {
    let success = false;
    setState(prev => {
      const currentInventory = { ...prev.inventory };
      const currentShelter = {
        ...prev.shelter,
        facilities: { ...prev.shelter.facilities }
      };

      let costScrap = 0;
      let nextLevel = 1;

      if (statType === 'battery') {
        const currentLevel = currentShelter.batteryLevel || 1;
        costScrap = currentLevel * 10;
        nextLevel = currentLevel + 1;
      } else if (statType === 'generator') {
        const currentLevel = currentShelter.generatorLevel || 0;
        costScrap = (currentLevel + 1) * 15;
        nextLevel = currentLevel + 1;
      } else if (statType === 'recycler') {
        const currentLevel = currentShelter.recyclerLevel || 0;
        costScrap = (currentLevel + 1) * 15;
        nextLevel = currentLevel + 1;
      } else if (statType === 'smelter') {
        const currentLevel = currentShelter.facilities.smelter.level || 1;
        costScrap = currentLevel * 20;
        nextLevel = currentLevel + 1;
      } else if (statType === 'assembler') {
        const currentLevel = currentShelter.facilities.assembler.level || 1;
        costScrap = currentLevel * 20;
        nextLevel = currentLevel + 1;
      } else {
        return prev;
      }

      if ((currentInventory.scrap_metal || 0) < costScrap) {
        return prev;
      }

      currentInventory.scrap_metal = (currentInventory.scrap_metal || 0) - costScrap;

      if (statType === 'battery') {
        currentShelter.batteryLevel = nextLevel;
        currentShelter.maxOfflineDuration = 14400 + (nextLevel - 1) * 3600;
      } else if (statType === 'generator') {
        currentShelter.generatorLevel = nextLevel;
      } else if (statType === 'recycler') {
        currentShelter.recyclerLevel = nextLevel;
      } else if (statType === 'smelter') {
        currentShelter.facilities.smelter = {
          ...currentShelter.facilities.smelter,
          level: nextLevel
        };
      } else if (statType === 'assembler') {
        currentShelter.facilities.assembler = {
          ...currentShelter.facilities.assembler,
          level: nextLevel
        };
      }

      success = true;
      return {
        ...prev,
        inventory: currentInventory,
        shelter: currentShelter
      };
    });
    return success;
  };

  const startExpedition = (survivorId: string, locationId: string): boolean => {
    const loc = EXPEDITION_LOCATIONS[locationId as keyof typeof EXPEDITION_LOCATIONS];
    if (!loc) return false;

    let success = false;
    setState(prev => {
      const innerExplorer = prev.survivors[survivorId];
      if (!innerExplorer) return prev;
      if (loc.requiredRole && innerExplorer.role !== loc.requiredRole) return prev;

      const updatedSurvivors = { ...prev.survivors };
      const updatedShelter = {
        ...prev.shelter,
        facilities: { ...prev.shelter.facilities }
      };

      if (updatedShelter.assignedWatererId === survivorId) updatedShelter.assignedWatererId = null;
      if (updatedShelter.assignedExplorerId === survivorId) updatedShelter.assignedExplorerId = null;
      Object.entries(updatedShelter.facilities).forEach(([facId, fac]) => {
        if (fac.assignedSurvivorId === survivorId) {
          updatedShelter.facilities[facId] = { ...fac, assignedSurvivorId: null };
        }
      });

      const prevOccupantId = updatedShelter.assignedExplorerId;
      if (prevOccupantId && updatedSurvivors[prevOccupantId]) {
        updatedSurvivors[prevOccupantId] = {
          ...updatedSurvivors[prevOccupantId],
          isAssigned: false,
          assignedJobId: null
        };
      }

      updatedShelter.assignedExplorerId = survivorId;
      updatedSurvivors[survivorId] = {
        ...innerExplorer,
        isAssigned: true,
        assignedJobId: 'explorer'
      };

      const now = Date.now();
      updatedShelter.expedition = {
        locationId,
        startTime: now,
        lastScavengeTime: now
      };

      success = true;
      return {
        ...prev,
        survivors: updatedSurvivors,
        shelter: updatedShelter
      };
    });
    return success;
  };

  const stopExpedition = (): boolean => {
    let success = false;
    setState(prev => {
      if (!prev.shelter.expedition.locationId) return prev;

      const updatedShelter = {
        ...prev.shelter,
        expedition: {
          locationId: null,
          startTime: null,
          lastScavengeTime: null
        }
      };

      const explorerId = prev.shelter.assignedExplorerId;
      const updatedSurvivors = { ...prev.survivors };
      if (explorerId && updatedSurvivors[explorerId]) {
        updatedSurvivors[explorerId] = {
          ...updatedSurvivors[explorerId],
          isAssigned: false,
          assignedJobId: null
        };
      }
      updatedShelter.assignedExplorerId = null;

      success = true;
      return {
        ...prev,
        shelter: updatedShelter,
        survivors: updatedSurvivors
      };
    });
    return success;
  };

  const hasNova = !!state.survivors.nova;
  const hasCatherine = !!state.survivors.catherine;
  const hasBuster = !!state.survivors.buster;
  const maxEnergy = hasNova ? 130 : 100;
  
  const adjustedState = {
    ...state,
    player: {
      ...state.player,
      maxEnergy
    },
    hasNova,
    hasCatherine,
    hasBuster
  };

  return (
    <GameContext.Provider value={{
      state: adjustedState,
      setState,
      plantCrop,
      waterSlot,
      harvestSlot,
      batchHarvest,
      batchPlant,
      craftItem,
      addLog,
      resetGame,
      currentUser,
      accounts,
      switchAccount,
      createAccount,
      deleteAccount,
      useSupplyItem,
      batchWater,
      assignSurvivorJob,
      setFacilityRecipe,
      setFacilityActive,
      upgradeShelterStat,
      startExpedition,
      stopExpedition
    }}>

      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
