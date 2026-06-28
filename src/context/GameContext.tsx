import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { GameState, GreenhouseSlot, PlayerStats } from '../types/game';
import cropGlowGrass from '../assets/crop_glow_grass.jpg';
import cropAetherBerry from '../assets/crop_aether_berry.jpg';
import cropSteelSunflower from '../assets/crop_steel_sunflower.jpg';

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
    }
  },
  discoveredBlueprints: ['filter_refill', 'ration_pack', 'sanity_capsule'], // 初始可用配方
  activeAlert: {
    type: null,
    hp: 0
  },
  lastTick: Date.now()
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
      if (Array.isArray(parsed) && parsed.includes('Guest')) {
        return parsed;
      }
      if (Array.isArray(parsed)) {
        return ['Guest', ...parsed.filter(u => u !== 'Guest')];
      }
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
  const [state, setState] = useState<GameState>(INITIAL_STATE);
  const isInitialized = useRef(false);

  // 1. 初始化时载入当前账号的存档并计算离线挂机收益
  useEffect(() => {
    const curUser = localStorage.getItem('aether_garden_save_current_user') || 'Guest';
    localStorage.setItem('aether_garden_save_current_user', curUser);
    setCurrentUser(curUser);

    const list = getAccountsList();
    if (!list.includes('Guest')) {
      localStorage.setItem('aether_garden_accounts_list', JSON.stringify(['Guest', ...list]));
    } else {
      localStorage.setItem('aether_garden_accounts_list', JSON.stringify(list));
    }

    const saved = localStorage.getItem(`aether_garden_save_${curUser}`);
    const now = Date.now();
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as GameState;
        const elapsedSeconds = Math.max(0, Math.floor((now - parsed.lastTick) / 1000));
        
        // 计算离线生长收益
        const updatedSlots = calculateOfflineProgress(parsed.greenhouse.slots, elapsedSeconds);
        
        setState({
          ...parsed,
          greenhouse: {
            ...parsed.greenhouse,
            slots: updatedSlots
          },
          lastTick: now
        });
      } catch (e) {
        console.error("Failed to load save", e);
        const freshState = { ...INITIAL_STATE, lastTick: now };
        setState(freshState);
        localStorage.setItem(`aether_garden_save_${curUser}`, JSON.stringify(freshState));
      }
    } else {
      // 妥善处理 Guest (或当前用户) 初始数据的自动保存
      const freshState = { ...INITIAL_STATE, lastTick: now };
      setState(freshState);
      localStorage.setItem(`aether_garden_save_${curUser}`, JSON.stringify(freshState));
    }
    isInitialized.current = true;
  }, []);

  // 2. 自动存盘 (当状态更新时，写入当前激活角色的存档键)
  useEffect(() => {
    if (!isInitialized.current) return;
    localStorage.setItem(`aether_garden_save_${currentUser}`, JSON.stringify(state));
  }, [state, currentUser]);

  // 3. 游戏全局 Tick 循环 (每秒一次)
  useEffect(() => {
    const timer = setInterval(() => {
      setState(prev => {
        // 如果处于“梦魇入侵”警戒，则种植暂时冻结，不推进生长
        if (prev.activeAlert.type === 'dream_leak') {
          return {
            ...prev,
            lastTick: Date.now()
          };
        }

        const now = Date.now();
        const updatedSlots = calculateOfflineProgress(prev.greenhouse.slots, 1);

        return {
          ...prev,
          greenhouse: {
            ...prev.greenhouse,
            slots: updatedSlots
          },
          lastTick: now
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 切换账号
  const switchAccount = (username: string) => {
    // 立即同步保存当前激活角色的状态，防丢失
    localStorage.setItem(`aether_garden_save_${currentUser}`, JSON.stringify(state));

    const saved = localStorage.getItem(`aether_garden_save_${username}`);
    let newState: GameState;
    const now = Date.now();
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as GameState;
        const elapsedSeconds = Math.max(0, Math.floor((now - parsed.lastTick) / 1000));
        const updatedSlots = calculateOfflineProgress(parsed.greenhouse.slots, elapsedSeconds);
        newState = {
          ...parsed,
          greenhouse: {
            ...parsed.greenhouse,
            slots: updatedSlots
          },
          lastTick: now // 妥善更新 lastTick 为当前时间，防止累加多余离线秒数
        };
      } catch (e) {
        console.error("Failed to load save in switchAccount", e);
        newState = { ...INITIAL_STATE, lastTick: now };
      }
    } else {
      newState = { ...INITIAL_STATE, lastTick: now };
    }

    setCurrentUser(username);
    localStorage.setItem('aether_garden_save_current_user', username);
    setState(newState);
  };

  // 创建账号
  const createAccount = (username: string): boolean => {
    if (!username || !username.trim()) return false;
    const name = username.trim();

    const key = `aether_garden_save_${name}`;
    if (localStorage.getItem(key)) return false;

    const newAccountState: GameState = {
      ...INITIAL_STATE,
      lastTick: Date.now()
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

  // 种植作物逻辑
  const plantCrop = (slotId: number, cropId: string): boolean => {
    const cropConfig = CROPS_CONFIG[cropId as keyof typeof CROPS_CONFIG];
    if (!cropConfig) return false;

    // 检查种子
    const seedId = Object.keys(cropConfig.seedCost)[0];
    const seedQtyNeeded = (cropConfig.seedCost as Record<string, number>)[seedId] || 0;

    let success = false;
    setState(prev => {
      const currentSeedCount = prev.inventory[seedId] || 0;
      if (currentSeedCount < seedQtyNeeded) return prev; // 种子不足

      const updatedSlots = prev.greenhouse.slots.map(slot => {
        if (slot.id === slotId && slot.cropId === null) {
          success = true;
          return {
            ...slot,
            cropId,
            growthProgress: 0,
            growthTimeLeft: cropConfig.growthTime,
            isWatered: false
          };
        }
        return slot;
      });

      if (!success) return prev;

      return {
        ...prev,
        inventory: {
          ...prev.inventory,
          [seedId]: currentSeedCount - seedQtyNeeded
        },
        greenhouse: {
          ...prev.greenhouse,
          slots: updatedSlots
        }
      };
    });

    return success;
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

  // 一键播种
  const batchPlant = (cropId: string): boolean => {
    const cropConfig = CROPS_CONFIG[cropId as keyof typeof CROPS_CONFIG];
    if (!cropConfig) return false;

    const seedId = Object.keys(cropConfig.seedCost)[0];
    const seedQtyNeeded = (cropConfig.seedCost as Record<string, number>)[seedId] || 0;

    let plantedCount = 0;

    setState(prev => {
      const freeSlots = prev.greenhouse.slots.filter(s => s.cropId === null);
      if (freeSlots.length === 0) return prev;

      let availableSeeds = prev.inventory[seedId] || 0;
      if (availableSeeds < seedQtyNeeded) return prev; // 连播一颗的种子都没有

      const updatedSlots = prev.greenhouse.slots.map(slot => {
        if (slot.cropId === null && availableSeeds >= seedQtyNeeded) {
          availableSeeds -= seedQtyNeeded;
          plantedCount++;
          return {
            ...slot,
            cropId,
            growthProgress: 0,
            growthTimeLeft: cropConfig.growthTime,
            isWatered: false
          };
        }
        return slot;
      });

      if (plantedCount === 0) return prev;

      return {
        ...prev,
        inventory: {
          ...prev.inventory,
          [seedId]: availableSeeds
        },
        greenhouse: {
          ...prev.greenhouse,
          slots: updatedSlots
        }
      };
    });

    return plantedCount > 0;
  };

  // 重置游戏
  const resetGame = () => {
    const freshState = { ...INITIAL_STATE, lastTick: Date.now() };
    setState(freshState);
    localStorage.setItem(`aether_garden_save_${currentUser}`, JSON.stringify(freshState));
  };

  // 合成物品逻辑
  const craftItem = (recipeId: string): boolean => {
    const recipes: Record<string, { cost: Record<string, number>; reward: Record<string, number> }> = {
      ration_pack: {
        cost: { glow_fiber: 3, aether_pulp: 1 },
        reward: { ration: 1 }
      },
      filter_refill: {
        cost: { glow_fiber: 2, scrap_metal: 1 },
        reward: { energy_refill: 1 }
      },
      sanity_capsule: {
        cost: { dream_shard: 3, scrap_metal: 1 },
        reward: {}
      },
      defensive_turret: {
        cost: { scrap_metal: 3, glow_fiber: 4 },
        reward: { defensive_turret: 1 }
      }
    };

    const recipe = recipes[recipeId];
    if (!recipe) return false;

    let success = false;
    setState(prev => {
      let hasEnough = true;
      Object.entries(recipe.cost).forEach(([item, qty]) => {
        if ((prev.inventory[item] || 0) < qty) {
          hasEnough = false;
        }
      });

      if (!hasEnough) return prev;
      success = true;

      const newInventory = { ...prev.inventory };
      Object.entries(recipe.cost).forEach(([item, qty]) => {
        newInventory[item] = newInventory[item] - qty;
      });

      const newExploration = { ...prev.exploration };
      if (recipeId === 'sanity_capsule') {
        newExploration.capsulesCharge = {
          ...prev.exploration.capsulesCharge,
          sanity_capsule: (prev.exploration.capsulesCharge.sanity_capsule || 0) + 3
        };
      } else {
        Object.entries(recipe.reward).forEach(([item, qty]) => {
          newInventory[item] = (newInventory[item] || 0) + qty;
        });
      }

      return {
        ...prev,
        inventory: newInventory,
        exploration: newExploration
      };
    });

    return success;
  };

  return (
    <GameContext.Provider value={{
      state,
      setState,
      plantCrop,
      waterSlot,
      harvestSlot,
      batchHarvest,
      batchPlant,
      craftItem,
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
