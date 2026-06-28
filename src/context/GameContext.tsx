import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { GameState, GreenhouseSlot, PlayerStats } from '../types/game';
import cropGlowGrass from '../assets/crop_glow_grass.jpg';
import cropAetherBerry from '../assets/crop_aether_berry.jpg';
import cropSteelSunflower from '../assets/crop_steel_sunflower.jpg';
import cropMagmaPepper from '../assets/crop_magma_pepper.jpg';
import cropFrostBell from '../assets/crop_frost_bell.jpg';
import cropPlasmaPumpkin from '../assets/crop_plasma_pumpkin.jpg';
import cropVoidLotus from '../assets/crop_void_lotus.jpg';
import { RECIPES_CONFIG } from '../data/recipes';

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
    inDreamExploration: false,
    dreamSteps: 0,
    dreamPollution: 0,
    dreamBag: {},
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
    'shield_battery_recipe'
  ],
  activeAlert: {
    type: null,
    hp: 0
  },
  lastTick: Date.now(),
  dayStartTime: Date.now(),
  logs: [
    { id: 'init', text: '▶ 避难所系统启动。欢迎来到废土魔导温室，生存者。', timestamp: Date.now(), type: 'system' }
  ]
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

interface GameContextType {
  state: GameState;
  setState: React.Dispatch<React.SetStateAction<GameState>>;
  plantCrop: (slotId: number, cropId: string) => boolean;
  waterSlot: (slotId: number) => boolean;
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
        const elapsedSeconds = Math.max(0, Math.floor((now - parsed.lastTick) / 1000));
        const updatedSlots = calculateOfflineProgress(parsed.greenhouse.slots, elapsedSeconds);
        return {
          ...INITIAL_STATE,
          ...parsed,
          greenhouse: { ...parsed.greenhouse, slots: updatedSlots },
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
          },
          lastTick: now,
          dayStartTime: parsed.dayStartTime || now,
          logs: parsed.logs || INITIAL_STATE.logs
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

        const updatedSlots = calculateOfflineProgress(prev.greenhouse.slots, 1);

        // 天数递增
        let newDays = prev.player.days;
        let newDayStartTime = prev.dayStartTime;
        if (now - prev.dayStartTime >= GAME_DAY_SECONDS * 1000) {
          newDays += 1;
          newDayStartTime = now;
        }

        return {
          ...prev,
          player: { ...prev.player, days: newDays },
          greenhouse: { ...prev.greenhouse, slots: updatedSlots },
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
        const elapsedSeconds = Math.max(0, Math.floor((now - parsed.lastTick) / 1000));
        const updatedSlots = calculateOfflineProgress(parsed.greenhouse.slots, elapsedSeconds);
        newState = {
          ...INITIAL_STATE,
          ...parsed,
          greenhouse: { ...parsed.greenhouse, slots: updatedSlots },
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
          },
          lastTick: now,
          dayStartTime: parsed.dayStartTime || now,
          logs: parsed.logs || INITIAL_STATE.logs
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

    // 同步校验材料（经由 stateRef 读取最新状态）
    const current = stateRef.current;
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
      } else {
        Object.entries(recipe.reward).forEach(([item, qty]) => { newInventory[item] = (newInventory[item] || 0) + qty; });
      }

      return { ...prev, inventory: newInventory, exploration: newExploration };
    });
    return true;
  };

  const hasNova = !!state.survivors.nova;
  const hasCatherine = !!state.survivors.catherine;
  const hasBuster = !!state.survivors.buster;
  const maxEnergy = hasNova ? 130 : 100;
  
  // 动态拼装传递的 state，避免污染存盘，同时提供同伴被动加成判断基础
  // 凯瑟琳与巴斯特的被动加成虽然最终在 WildernessTab.tsx 结算，
  // 但我们在这里动态注入 hasCatherine 和 hasBuster 标记，供其他消费组件读取判定。
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
      deleteAccount
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
