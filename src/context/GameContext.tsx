import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { GameState, GreenhouseSlot, PlayerStats, OfflineReport } from '../types/game';
import { RECIPES_CONFIG } from '../data/recipes';
import { ITEMS_CONFIG } from '../data/items';
import { AUTO_RECIPES } from '../data/autoRecipes';
import { EXPEDITION_LOCATIONS } from '../data/expeditionLocations';
import { CROPS_CONFIG } from '../data/crops';
import { SHELTER_UPGRADES } from '../data/shelterUpgrades';
import { INITIAL_STATE } from '../data/initialState';
import { GAME_CONSTANTS } from '../data/gameConstants';
import { getAdjustment } from '../systems/passiveModifiers';
import { supabase } from '../lib/supabase';
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
  const maxEnergyAdjustment = getAdjustment(state, 'max_energy');
  const currentMaxEnergy = (state.player.maxEnergy || 100) + maxEnergyAdjustment;

  let finalAccumulatedEnergy = state.shelter.accumulatedEnergy || 0;
  if (state.shelter.generatorLevel > 0) {
    // 由于发电机没有独立岗位，此处理论上借用“魔导冶炼炉”中派驻的幸存者（需为工程师）作为魔力发电机调校员提供 50% 额外发电效率
    const speedBonus = 1 + (state.survivors[state.shelter.facilities.smelter?.assignedSurvivorId || '']?.role === 'engineer' ? 0.5 : 0);
    const genConfig = SHELTER_UPGRADES.generator.levels.find(l => l.level === state.shelter.generatorLevel);
    const generatorRate = genConfig ? genConfig.effectValue : 0;
    const totalOfflineEnergy = actualSeconds * generatorRate * speedBonus;
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
    const recConfig = SHELTER_UPGRADES.recycler.levels.find(l => l.level === state.shelter.recyclerLevel);
    const recyclerRate = recConfig ? recConfig.effectValue : 0;
    const totalOfflineScrap = actualSeconds * recyclerRate;
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

    // 无论本次离线是否产出了成品，凡是涉及到启动下一轮生产或者有原料消耗的改动，都必须同步写回给背包
    currentInventory = tempInventory;

    if (facilityGained > 0) {
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

    let speedMultiplier = (slot.isWatered || isWateredOffline) ? 2 : 1;
    // 幸存者被动：指派在温室岗位时生长速度加成
    const growthAdj = getAdjustment(state, 'growth_speed', state.shelter.assignedWatererId ?? undefined);
    speedMultiplier *= (1 + growthAdj);
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
  batchHarvestAndReplant: (cropId: string) => { harvested: Record<string, number> | null, replantedCount: number };
  craftItem: (recipeId: string) => boolean;
  addLog: (text: string, type: 'event' | 'logistics' | 'combat' | 'dream' | 'system') => void;
  resetGame: () => void;
  currentUser: string | null;
  accounts: string[];
  isSyncing: boolean;
  setIsSyncing: React.Dispatch<React.SetStateAction<boolean>>;
  switchAccount: (id: string) => void;
  createAccount: (username: string) => Promise<string | false>;
  deleteAccount: (id: string, deleteCloud: boolean) => Promise<void>;
  syncCloudCharacters: (userId: string) => Promise<void>;
  fetchCloudCharacterSummaries: (userId: string) => Promise<Array<{ id: string; username: string; days: number; hp: number }>>;
  downloadCloudCharacter: (charId: string) => Promise<boolean>;
  useSupplyItem: (itemId: string) => boolean;
  assignSurvivorJob: (survivorId: string, jobId: string | null) => boolean;
  setFacilityRecipe: (facilityId: string, recipeId: string | null) => boolean;
  setFacilityActive: (facilityId: string, active: boolean) => boolean;
  upgradeShelterStat: (statType: 'battery' | 'generator' | 'recycler' | 'smelter' | 'assembler') => boolean;
  startExpedition: (survivorId: string, locationId: string) => boolean;
  stopExpedition: () => boolean;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const isUuid = (str: string) => {
  const simpleUuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return simpleUuidRegex.test(str);
};

const getAccountsList = (): string[] => {
  const isTest = typeof globalThis !== 'undefined' && ((globalThis as any).process?.env?.NODE_ENV === 'test' || !!(globalThis as any).process?.env?.VITEST);
  const listJson = localStorage.getItem('aether_garden_accounts_list');
  if (listJson) {
    try {
      const parsed = JSON.parse(listJson);
      if (Array.isArray(parsed)) {
        if (isTest) return parsed;
        
        const list = parsed.filter((u: string) => u !== 'Guest');
        let hasMigrated = false;
        const newList: string[] = [];

        for (const item of list) {
          if (isUuid(item)) {
            newList.push(item);
          } else {
            // 就地将老旧角色代号迁移为规范的 UUID
            const oldKey = `aether_garden_save_${item}`;
            const oldData = localStorage.getItem(oldKey);
            if (oldData) {
              const newId = typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : 'char_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
              
              try {
                const saveObj = JSON.parse(oldData);
                saveObj.username = item; // 写入自描述
                localStorage.setItem(`aether_garden_save_${newId}`, JSON.stringify(saveObj));
                localStorage.removeItem(oldKey);
                newList.push(newId);
                hasMigrated = true;

                // 如果当前选中的也是这个老代号，更新它
                const curUser = localStorage.getItem('aether_garden_save_current_user');
                if (curUser === item) {
                  localStorage.setItem('aether_garden_save_current_user', newId);
                }
              } catch {}
            }
          }
        }

        if (hasMigrated) {
          localStorage.setItem('aether_garden_accounts_list', JSON.stringify(newList));
          return newList;
        }
        return list;
      }
    } catch (e) {
      console.error("Failed to parse accounts list", e);
    }
  }
  return isTest ? ['Guest'] : [];
};

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    const isTest = typeof globalThis !== 'undefined' && ((globalThis as any).process?.env?.NODE_ENV === 'test' || !!(globalThis as any).process?.env?.VITEST);
    const saved = localStorage.getItem('aether_garden_save_current_user');
    if (saved) {
      if (isTest && saved === 'Guest') return 'Guest';
      if (saved !== 'Guest') return saved;
    }
    const list = getAccountsList();
    if (list.length > 0) return list[0];
    return isTest ? 'Guest' : null;
  });
  const [accounts, setAccounts] = useState<string[]>(getAccountsList);
  // 全局网络同步状态（需求 7）：任何云端 I/O 操作时置 true，App 层据此显示遮罩
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const [state, setState] = useState<GameState>(() => {
    const isTest = typeof globalThis !== 'undefined' && ((globalThis as any).process?.env?.NODE_ENV === 'test' || !!(globalThis as any).process?.env?.VITEST);
    const curUser = localStorage.getItem('aether_garden_save_current_user');
    const targetUser = (curUser && (curUser !== 'Guest' || isTest)) 
      ? curUser 
      : (getAccountsList()[0] || (isTest ? 'Guest' : null));
    
    if (!targetUser) {
      return { ...INITIAL_STATE, lastTick: Date.now(), dayStartTime: Date.now() };
    }

    const saved = localStorage.getItem(`aether_garden_save_${targetUser}`);
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
          lastOfflineReport: elapsedSeconds > 10 ? report : null
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
    if (currentUser) {
      localStorage.setItem(`aether_garden_save_${currentUser}`, JSON.stringify(state));
    }
  }, [state, currentUser]);

  // 2. ✅ 初始化 Effect
  useEffect(() => {
    const isTest = typeof globalThis !== 'undefined' && ((globalThis as any).process?.env?.NODE_ENV === 'test' || !!(globalThis as any).process?.env?.VITEST);
    if (isTest) return;

    const list = getAccountsList();
    localStorage.setItem('aether_garden_accounts_list', JSON.stringify(list));

    const curUser = localStorage.getItem('aether_garden_save_current_user');
    if (!curUser || curUser === 'Guest') {
      if (list.length > 0) {
        localStorage.setItem('aether_garden_save_current_user', list[0]);
        setCurrentUser(list[0]);
      } else {
        localStorage.removeItem('aether_garden_save_current_user');
        setCurrentUser(null);
      }
    }
  }, []);

  // 3. ✅ 游戏全局 Tick 循环 - 修复天数递增
  const GAME_DAY_SECONDS = GAME_CONSTANTS.GAME_DAY_SECONDS;
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
        const maxEnergyAdjustment2 = getAdjustment(prev, 'max_energy');
        const currentMaxEnergy = (prev.player.maxEnergy || 100) + maxEnergyAdjustment2;

        let nextAccumulatedEnergy = prev.shelter.accumulatedEnergy ?? 0;
        let nextAccumulatedScrap = prev.shelter.accumulatedScrap ?? 0;

        // 1. 发电机与回收站自动产出
        if (prev.shelter.generatorLevel > 0) {
          // 由于发电机没有独立排班，此处借用“魔导冶炼炉”中派驻的工程师作为调校员提供发电机增益
          const speedBonus = 1 + (prev.survivors[prev.shelter.facilities.smelter?.assignedSurvivorId || '']?.role === 'engineer' ? 0.5 : 0);
          const genConfig = SHELTER_UPGRADES.generator.levels.find(l => l.level === prev.shelter.generatorLevel);
          const generatorRate = genConfig ? genConfig.effectValue : 0;
          const energyGained = generatorRate * speedBonus;
          nextAccumulatedEnergy += energyGained;
        }

        if (prev.shelter.recyclerLevel > 0) {
          const recConfig = SHELTER_UPGRADES.recycler.levels.find(l => l.level === prev.shelter.recyclerLevel);
          const recyclerRate = recConfig ? recConfig.effectValue : 0;
          const scrapGained = recyclerRate;
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
        const isWateredOnline = prev.shelter.assignedWatererId !== null;
        const updatedSlots = prev.greenhouse.slots.map(slot => {
          if (!slot.cropId) return slot;
          const config = (CROPS_CONFIG as any)[slot.cropId];
          if (!config) return slot;

          let speedMultiplier = (slot.isWatered || isWateredOnline) ? 2 : 1;
          // 幸存者被动：指派在温室岗位时生长速度加成
          const growthAdj = getAdjustment(prev, 'growth_speed', prev.shelter.assignedWatererId ?? undefined);
          speedMultiplier *= (1 + growthAdj);
          const timeReduced = 1 * speedMultiplier;
          const newTimeLeft = Math.max(0, slot.growthTimeLeft - timeReduced);
          const progress = Math.min(100, Math.round(((config.growthTime - newTimeLeft) / config.growthTime) * 100));

          return {
            ...slot,
            growthTimeLeft: newTimeLeft,
            growthProgress: progress,
            isWatered: isWateredOnline ? true : slot.isWatered
          };
        });

        // 3. 工厂流水线 Tick
        const updatedFacilities = { ...prev.shelter.facilities };
        const logsToAdd: { text: string; type: 'event' | 'logistics' | 'system' }[] = [];

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
              logsToAdd.push({ text: `🏭 ${fac.name} 完成了 ${recipe.name} 的加工。`, type: 'logistics' });

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
                const itemsStr = Object.entries(scavengedCount).map(([id, q]) => {
                  const item = ITEMS_CONFIG[id];
                  return `${item?.emoji || ''} ${item?.name || id} ×${q}`;
                }).join(' ');
                logsToAdd.push({ text: `🤠 探索员 ${explorer?.name || '幸存者'} 拾荒带回: ${itemsStr}`, type: 'logistics' as const });
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
          const logEntries = logsToAdd.map(entry => ({
            id: `${Date.now()}_${Math.random()}`,
            text: entry.text,
            timestamp: Date.now(),
            type: entry.type
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

  const switchAccount = (characterId: string) => {
    // 立即保存当前账号状态 (仅当当前用户依然存在于账号列表中时，防止已删除的角色被重新写入)
    const list = getAccountsList();
    if (currentUser && list.includes(currentUser)) {
      localStorage.setItem(`aether_garden_save_${currentUser}`, JSON.stringify(stateRef.current));
    }

    const saved = localStorage.getItem(`aether_garden_save_${characterId}`);
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
          lastOfflineReport: elapsedSeconds > 10 ? report : null
        };
      } catch (e) {
        console.error("Failed to load save in switchAccount", e);
        newState = { ...INITIAL_STATE, lastTick: now, dayStartTime: now };
      }
    } else {
      newState = { ...INITIAL_STATE, lastTick: now, dayStartTime: now };
    }

    setCurrentUser(characterId);
    localStorage.setItem('aether_garden_save_current_user', characterId);
    setState(newState);
  };

  // 需求 8：创建角色不自动同步云端，只写本地
  const createAccount = async (username: string): Promise<string | false> => {
    if (!username || !username.trim()) return false;
    const name = username.trim();

    // 生成 UUID
    const characterId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : 'char_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);

    const key = `aether_garden_save_${characterId}`;
    const now = Date.now();
    const newAccountState: GameState & { username: string } = {
      ...INITIAL_STATE,
      username: name, // 写入存档自描述
      lastTick: now,
      dayStartTime: now,
      logs: [{ id: `init_${characterId}`, text: `▶ 生存者 ${name} 的避难所系统已初始化。`, timestamp: now, type: 'system' }]
    };

    localStorage.setItem(key, JSON.stringify(newAccountState));

    const list = getAccountsList();
    const updatedList = [...list, characterId];
    localStorage.setItem('aether_garden_accounts_list', JSON.stringify(updatedList));
    setAccounts(updatedList);

    switchAccount(characterId);
    return characterId;
  };

  // 需求 6：删除角色后自动切换到顺位第一，若无则回退到创角面板
  const deleteAccount = async (id: string, deleteCloud: boolean) => {
    localStorage.removeItem(`aether_garden_save_${id}`);

    const list = getAccountsList();
    const updatedList = list.filter(u => u !== id);
    localStorage.setItem('aether_garden_accounts_list', JSON.stringify(updatedList));
    setAccounts(updatedList);

    // 需求 7：删除云端时加载状态
    if (deleteCloud && supabase) {
      setIsSyncing(true);
      try {
        await supabase.from('saves').delete().eq('id', id);
      } catch (err) {
        console.error("Cloud character deletion failed:", err);
      } finally {
        setIsSyncing(false);
      }
    }

    if (currentUser === id) {
      if (updatedList.length > 0) {
        // 切换到顺位第一个剩余角色
        switchAccount(updatedList[0]);
      } else {
        // 本地无角色，回到创角面板
        localStorage.removeItem('aether_garden_save_current_user');
        setCurrentUser(null);
      }
    }
  };

  // 需求 3：增量同步云端角色——只拉轻量摘要（id, username, days, hp），写最小占位存档
  const syncCloudCharacters = async (userId: string) => {
    if (!supabase) return;
    setIsSyncing(true);
    try {
      const { data, error } = await supabase
        .from('saves')
        .select('id, username, days, hp')
        .eq('user_id', userId);

      if (error) {
        console.error("Cloud characters fetch failed:", error);
        return;
      }

      if (data && data.length > 0) {
        const localList = getAccountsList();
        let hasNew = false;
        const newLocalList = [...localList];

        for (const cloudChar of data) {
          const charId = cloudChar.id;
          if (!localList.includes(charId)) {
            // 写最小占位存档（不含完整 data），标记为云端空壳
            const placeholder = {
              username: cloudChar.username || '未命名生存者',
              _isCloudShell: true, // 标记为云端空壳，进入游戏时提示需拉取
              player: {
                days: cloudChar.days || 1,
                hp: cloudChar.hp || 100
              }
            };
            localStorage.setItem(`aether_garden_save_${charId}`, JSON.stringify(placeholder));
            newLocalList.push(charId);
            hasNew = true;
          }
        }

        if (hasNew) {
          localStorage.setItem('aether_garden_accounts_list', JSON.stringify(newLocalList));
          setAccounts(newLocalList);
        }
      }
    } catch (err) {
      console.error("syncCloudCharacters exception:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  // 需求 2：从云端获取角色摘要列表（仅 id, username, days, hp），不写本地
  const fetchCloudCharacterSummaries = async (userId: string): Promise<Array<{ id: string; username: string; days: number; hp: number }>> => {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('saves')
        .select('id, username, days, hp')
        .eq('user_id', userId);
      if (error || !data) return [];
      return data as Array<{ id: string; username: string; days: number; hp: number }>;
    } catch {
      return [];
    }
  };

  // 需求 2a：从云端完整拉取某个角色并写入本地，然后 switchAccount
  const downloadCloudCharacter = async (charId: string): Promise<boolean> => {
    if (!supabase) return false;
    setIsSyncing(true);
    try {
      const { data, error } = await supabase
        .from('saves')
        .select('data, username')
        .eq('id', charId)
        .single();

      if (error || !data || !data.data) return false;

      const saveObj = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
      if (!saveObj.username) {
        saveObj.username = data.username;
      }
      // 清除云端空壳标记
      delete saveObj._isCloudShell;

      localStorage.setItem(`aether_garden_save_${charId}`, JSON.stringify(saveObj));

      // 如果本地列表没有该角色，加入
      const list = getAccountsList();
      if (!list.includes(charId)) {
        const updatedList = [...list, charId];
        localStorage.setItem('aether_garden_accounts_list', JSON.stringify(updatedList));
        setAccounts(updatedList);
      }

      switchAccount(charId);
      return true;
    } catch (err) {
      console.error("downloadCloudCharacter exception:", err);
      return false;
    } finally {
      setIsSyncing(false);
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
      if (prev.player.energy < GAME_CONSTANTS.WATER_ENERGY_COST) return prev;

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
    
    const maxWaterable = Math.floor(energyAvailable / GAME_CONSTANTS.WATER_ENERGY_COST);
    const actualWaterCount = Math.min(needWaterSlots.length, maxWaterable);
    
    if (actualWaterCount <= 0) return 0;

    setState(prev => {
      let energy = prev.player.energy;
      const updatedSlots = prev.greenhouse.slots.map(slot => {
        if (slot.cropId !== null && !slot.isWatered && energy >= GAME_CONSTANTS.WATER_ENERGY_COST) {
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

  const batchHarvestAndReplant = (cropId: string): { harvested: Record<string, number> | null, replantedCount: number } => {
    let gatheredItems: Record<string, number> | null = null;
    let replantedCount = 0;

    setState(prev => {
      // 1. 收割所有成熟槽位
      const slotsToHarvest = prev.greenhouse.slots.filter(s => s.cropId !== null && s.growthProgress >= 100);
      const newInventory = { ...prev.inventory };

      if (slotsToHarvest.length > 0) {
        gatheredItems = {};
        slotsToHarvest.forEach(slot => {
          const config = CROPS_CONFIG[slot.cropId as keyof typeof CROPS_CONFIG];
          Object.entries(config.yields).forEach(([item, qty]) => {
            gatheredItems![item] = (gatheredItems![item] || 0) + qty;
            newInventory[item] = (newInventory[item] || 0) + qty;
          });
        });
      }

      // 收割后的槽位状态
      const slotsAfterHarvest = prev.greenhouse.slots.map(s => {
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

      // 2. 播种
      const cropConfig = CROPS_CONFIG[cropId as keyof typeof CROPS_CONFIG];
      if (!cropConfig) {
        return {
          ...prev,
          inventory: newInventory,
          greenhouse: { ...prev.greenhouse, slots: slotsAfterHarvest }
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
        ...prev,
        inventory: { ...newInventory, [seedId]: availableSeeds },
        greenhouse: { ...prev.greenhouse, slots: updatedSlots }
      };
    });

    return { harvested: gatheredItems, replantedCount };
  };

  const resetGame = () => {
    const now = Date.now();
    const freshState = { ...INITIAL_STATE, lastTick: now, dayStartTime: now };
    setState(freshState);
    localStorage.setItem(`aether_garden_save_${currentUser}`, JSON.stringify(freshState));
  };

  // 日志系统
  const addLog = (text: string, type: 'event' | 'logistics' | 'combat' | 'dream' | 'system') => {
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
    if (recipe.special === 'greenhouse_expansion' && current.greenhouse.unlockedSlotsCount >= GAME_CONSTANTS.GREENHOUSE_MAX_SLOTS) {
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
        const nextCount = currentCount + GAME_CONSTANTS.GREENHOUSE_EXPANSION_INCREMENT;
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

      const meta = ITEMS_CONFIG[itemId];
      if (!meta?.useEffect) return prev;

      const newInventory = { ...prev.inventory };
      newInventory[itemId] = currentQty - 1;

      const newPlayer = { ...prev.player };
      const newExploration = { ...prev.exploration };

      const isNovaPresent = !!prev.survivors.nova;
      const currentMaxEnergy = isNovaPresent ? 130 : 100;
      const STAT_MAX: Record<string, number> = { hp: 100, food: 100, energy: currentMaxEnergy, sanity: 100 };

      if (meta.useEffect.stats) {
        Object.entries(meta.useEffect.stats).forEach(([stat, val]) => {
          const key = stat as keyof PlayerStats;
          const max = STAT_MAX[stat] ?? 100;
          newPlayer[key] = Math.min(max, Math.max(0, (newPlayer[key] as number) + val)) as never;
        });
      }

      if (meta.useEffect.pollution !== undefined) {
        newExploration.dreamPollution = Math.max(0, newExploration.dreamPollution + meta.useEffect.pollution);
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
      if (!survivorId || survivorId.trim() === '') return prev;
      const survivor = prev.survivors[survivorId];
      if (!survivor) return prev;

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
    const current = stateRef.current;
    const upgrade = SHELTER_UPGRADES[statType];
    if (!upgrade) return false;

    let currentLevel = 1;
    if (statType === 'battery') currentLevel = current.shelter.batteryLevel || 1;
    else if (statType === 'generator') currentLevel = current.shelter.generatorLevel || 0;
    else if (statType === 'recycler') currentLevel = current.shelter.recyclerLevel || 0;
    else if (statType === 'smelter') currentLevel = current.shelter.facilities.smelter.level || 1;
    else if (statType === 'assembler') currentLevel = current.shelter.facilities.assembler.level || 1;

    const nextLevelConfig = upgrade.levels.find(l => l.level === currentLevel + 1);
    if (!nextLevelConfig) return false;

    // Check all required costs synchronously
    const canAfford = Object.entries(nextLevelConfig.cost).every(([item, qty]) => (current.inventory[item] || 0) >= qty);
    if (!canAfford) return false;

    // Validation passed, perform the update asynchronously
    setState(prev => {
      const currentInventory = { ...prev.inventory };
      const currentShelter = {
        ...prev.shelter,
        facilities: { ...prev.shelter.facilities }
      };

      // Deduct materials
      Object.entries(nextLevelConfig.cost).forEach(([item, qty]) => {
        currentInventory[item] = (currentInventory[item] || 0) - qty;
      });

      const nextLevel = nextLevelConfig.level;

      if (statType === 'battery') {
        currentShelter.batteryLevel = nextLevel;
        currentShelter.maxOfflineDuration = nextLevelConfig.effectValue;
      } else if (statType === 'generator') {
        currentShelter.generatorLevel = nextLevel;
      } else if (statType === 'recycler') {
        currentShelter.recyclerLevel = nextLevel;
      } else if (statType === 'smelter') {
        currentShelter.facilities.smelter = { ...currentShelter.facilities.smelter, level: nextLevel };
      } else if (statType === 'assembler') {
        currentShelter.facilities.assembler = { ...currentShelter.facilities.assembler, level: nextLevel };
      }

      return { ...prev, inventory: currentInventory, shelter: currentShelter };
    });

    return true;
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
  const maxEnergy = (state.player.maxEnergy || 100) + getAdjustment(state, 'max_energy');
  
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
      batchHarvestAndReplant,
      craftItem,
      addLog,
      resetGame,
      currentUser,
      accounts,
      isSyncing,
      setIsSyncing,
      switchAccount,
      createAccount,
      deleteAccount,
      syncCloudCharacters,
      fetchCloudCharacterSummaries,
      downloadCloudCharacter,
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
