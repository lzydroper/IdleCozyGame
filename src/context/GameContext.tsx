import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { GameState, EquipmentSlot, FacilityType } from '../types/game';
import { INITIAL_STATE } from '../data/initialState';
import { supabase } from '../lib/supabase';
import { isTestEnv } from '../state/env';
import { getAccountsList, saveState, loadOrCreateState, createFreshState, createNewAccountState } from '../state/persistence';
import { addLogUpdate } from '../state/logs';
import {
  plantCropUpdate,
  waterSlotUpdate,
  batchWaterUpdate,
  harvestSlotUpdate,
  batchHarvestUpdate,
  batchPlantUpdate,
  batchHarvestAndReplantUpdate
} from '../state/greenhouse';
import { craftItemUpdate, applySupplyItemUpdate } from '../state/workshop';
import {
  assignSurvivorJobUpdate,
  startExpeditionUpdate,
  stopExpeditionUpdate
} from '../state/shelter';
import {
  enqueueRecipeUpdate,
  removeQueueEntryUpdate,
  setFacilityActiveUpdate,
  expandFacilityUpdate,
  upgradeShelterStatUpdate
} from '../state/facility';
import { applyTick } from '../state/tick';
import { summonUpdate, summonTenUpdate, type SummonOutcome, type MultiSummonResult } from '../state/summon';
import {
  equipItemUpdate,
  unequipItemUpdate,
  enhanceItemUpdate,
  forgeMythicUpdate,
  type EnhanceFailure,
  type ForgeFailure
} from '../state/equipment';
import {
  allocateTalentUpdate,
  unallocateTalentUpdate,
  resetTalentsUpdate,
  type TalentAllocateFailure,
  type TalentUnallocateFailure
} from '../state/talents';
import {
  starUpUpdate,
  awakenUpdate,
  type StarUpFailure,
  type AwakenFailure
} from '../state/awakening';
import {
  startCombatUpdate,
  setPartyUpdate,
  healWoundedHeroUpdate,
  resolveEncounterBattleUpdate,
  fleeEncounterUpdate,
  startBossBattleUpdate,
  startIdleUpdate,
  stopIdleUpdate,
  type CombatOutcome,
  type EncounterBattleOutcome,
  type BossBattleOutcome,
  type IdleStartOutcome
} from '../state/combat';
import {
  defendDreamLeakUpdate,
  type DreamLeakDefenseMethod,
  type DreamLeakDefenseOutcome
} from '../state/nightmare';

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
  fetchCloudCharacterSummaries: (userId: string) => Promise<Array<{ id: string; username: string; days: number }>>;
  downloadCloudCharacter: (charId: string) => Promise<boolean>;
  useSupplyItem: (itemId: string) => boolean;
  assignSurvivorJob: (survivorId: string, jobId: 'waterer' | 'explorer' | null) => boolean;
  enqueueRecipe: (facilityType: FacilityType, unitIndex: number, recipeId: string) => boolean;
  removeQueueEntry: (facilityType: FacilityType, unitIndex: number, queueIndex: number) => boolean;
  expandFacility: (facilityType: FacilityType) => boolean;
  setFacilityActive: (facilityType: FacilityType, unitIndex: number, active: boolean) => boolean;
  upgradeShelterStat: (statType: 'battery' | 'generator' | 'recycler' | 'smelter' | 'assembler', unitIndex?: number) => boolean;
  startExpedition: (survivorId: string, locationId: string) => boolean;
  stopExpedition: () => boolean;
  summonHero: () => SummonOutcome;
  summonTenHeroes: () => MultiSummonResult;
  isSummonOpen: boolean;
  openSummonModal: () => void;
  closeSummonModal: () => void;
  equipItem: (heroId: string, slot: EquipmentSlot, itemId: string) => boolean;
  unequipItem: (heroId: string, slot: EquipmentSlot) => boolean;
  enhanceItem: (heroId: string, slot: EquipmentSlot) => EnhanceFailure | true;
  forgeMythic: (heroId: string, slot: EquipmentSlot) => ForgeFailure | true;
  allocateTalent: (heroId: string, nodeId: string) => TalentAllocateFailure | true;
  unallocateTalent: (heroId: string, nodeId: string) => TalentUnallocateFailure | true;
  resetTalents: (heroId: string) => boolean;
  starUpHero: (heroId: string) => StarUpFailure | true;
  awakenHero: (heroId: string) => AwakenFailure | true;
  startCombat: (zoneId: string) => CombatOutcome;
  setParty: (heroIds: string[]) => boolean;
  healWoundedHero: (heroId: string) => boolean;
  resolveEncounterBattle: (encounterId: string) => EncounterBattleOutcome;
  fleeEncounter: () => boolean;
  startBossBattle: (zoneId: string) => BossBattleOutcome;
  defendDreamLeak: (method: DreamLeakDefenseMethod) => DreamLeakDefenseOutcome;
  startIdle: (zoneId: string) => IdleStartOutcome;
  stopIdle: () => boolean;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    const isTest = isTestEnv();
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
    const isTest = isTestEnv();
    const curUser = localStorage.getItem('aether_garden_save_current_user');
    const targetUser = (curUser && (curUser !== 'Guest' || isTest))
      ? curUser
      : (getAccountsList()[0] || (isTest ? 'Guest' : null));

    return loadOrCreateState(targetUser, INITIAL_STATE);
  });

  // stateRef: 同步镜像 state，使事件处理器可直接读取最新状态（绕开 setState 异步问题）
  const stateRef = useRef<GameState>(state);
  stateRef.current = state; // 每次渲染时同步更新

  // 1. ✅ 自动存盘 Effect
  useEffect(() => {
    if (currentUser) {
      saveState(currentUser, state);
    }
  }, [state, currentUser]);

  // 2. ✅ 初始化 Effect
  useEffect(() => {
    const isTest = isTestEnv();
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
  useEffect(() => {
    const timer = setInterval(() => {
      setState(prev => applyTick(prev, Date.now()));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const switchAccount = (characterId: string) => {
    // 立即保存当前账号状态 (仅当当前用户依然存在于账号列表中时，防止已删除的角色被重新写入)
    const list = getAccountsList();
    if (currentUser && list.includes(currentUser)) {
      saveState(currentUser, stateRef.current);
    }

    const newState = loadOrCreateState(characterId, INITIAL_STATE);

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

    const newAccountState = createNewAccountState(name, characterId, INITIAL_STATE);

    saveState(characterId, newAccountState);

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

  // 需求 3：增量同步云端角色——只拉轻量摘要（id, username, days），写最小占位存档
  const syncCloudCharacters = async (userId: string) => {
    if (!supabase) return;
    setIsSyncing(true);
    try {
      const { data, error } = await supabase
        .from('saves')
        .select('id, username, days')
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
                days: cloudChar.days || 1
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

  // 需求 2：从云端获取角色摘要列表（仅 id, username, days），不写本地
  const fetchCloudCharacterSummaries = async (userId: string): Promise<Array<{ id: string; username: string; days: number }>> => {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('saves')
        .select('id, username, days')
        .eq('user_id', userId);
      if (error || !data) return [];
      return data as Array<{ id: string; username: string; days: number }>;
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

  // === 温室 ===
  const plantCrop = (slotId: number, cropId: string): boolean => {
    let ok = false;
    setState(prev => {
      const r = plantCropUpdate(prev, slotId, cropId);
      ok = r.result;
      return r.state;
    });
    return ok;
  };

  const waterSlot = (slotId: number): boolean => {
    let ok = false;
    setState(prev => {
      const r = waterSlotUpdate(prev, slotId);
      ok = r.result;
      return r.state;
    });
    return ok;
  };

  const batchWater = (): number => {
    let count = 0;
    setState(prev => {
      const r = batchWaterUpdate(prev);
      count = r.result;
      return r.state;
    });
    return count;
  };

  const harvestSlot = (slotId: number): Record<string, number> | null => {
    let gatheredItems: Record<string, number> | null = null;
    setState(prev => {
      const r = harvestSlotUpdate(prev, slotId);
      gatheredItems = r.result;
      return r.state;
    });
    return gatheredItems;
  };

  const batchHarvest = (): Record<string, number> | null => {
    let accumulatedYields: Record<string, number> | null = null;
    setState(prev => {
      const r = batchHarvestUpdate(prev);
      accumulatedYields = r.result;
      return r.state;
    });
    return accumulatedYields;
  };

  const batchPlant = (cropId: string): boolean => {
    let ok = false;
    setState(prev => {
      const r = batchPlantUpdate(prev, cropId);
      ok = r.result;
      return r.state;
    });
    return ok;
  };

  const batchHarvestAndReplant = (cropId: string): { harvested: Record<string, number> | null, replantedCount: number } => {
    let result = { harvested: null as Record<string, number> | null, replantedCount: 0 };
    setState(prev => {
      const r = batchHarvestAndReplantUpdate(prev, cropId);
      result = r.result;
      return r.state;
    });
    return result;
  };

  // === 工坊 ===
  const craftItem = (recipeId: string): boolean => {
    let ok = false;
    setState(prev => {
      const r = craftItemUpdate(prev, recipeId);
      ok = r.result;
      return r.state;
    });
    return ok;
  };

  const useSupplyItem = (itemId: string): boolean => {
    let ok = false;
    setState(prev => {
      const r = applySupplyItemUpdate(prev, itemId);
      ok = r.result;
      return r.state;
    });
    return ok;
  };

  // === 日志 ===
  const addLog = (text: string, type: 'event' | 'logistics' | 'combat' | 'dream' | 'system') => {
    setState(prev => addLogUpdate(prev, text, type));
  };

  // === 避难所 ===
  const assignSurvivorJob = (survivorId: string, jobId: 'waterer' | 'explorer' | null): boolean => {
    let ok = false;
    setState(prev => {
      const r = assignSurvivorJobUpdate(prev, survivorId, jobId);
      ok = r.result;
      return r.state;
    });
    return ok;
  };

  // 产线配方队列（ticket 13）：入队 / 移除 / 启停 / 扩建，纯自动运转、无需指派人员
  const enqueueRecipe = (facilityType: FacilityType, unitIndex: number, recipeId: string): boolean => {
    let ok = false;
    setState(prev => {
      const r = enqueueRecipeUpdate(prev, facilityType, unitIndex, recipeId);
      ok = r.result;
      return r.state;
    });
    return ok;
  };

  const removeQueueEntry = (facilityType: FacilityType, unitIndex: number, queueIndex: number): boolean => {
    let ok = false;
    setState(prev => {
      const r = removeQueueEntryUpdate(prev, facilityType, unitIndex, queueIndex);
      ok = r.result;
      return r.state;
    });
    return ok;
  };

  const setFacilityActive = (facilityType: FacilityType, unitIndex: number, active: boolean): boolean => {
    let ok = false;
    setState(prev => {
      const r = setFacilityActiveUpdate(prev, facilityType, unitIndex, active);
      ok = r.result;
      return r.state;
    });
    return ok;
  };

  const expandFacility = (facilityType: FacilityType): boolean => {
    let ok = false;
    setState(prev => {
      const r = expandFacilityUpdate(prev, facilityType);
      ok = r.result;
      return r.state;
    });
    return ok;
  };

  const upgradeShelterStat = (statType: 'battery' | 'generator' | 'recycler' | 'smelter' | 'assembler', unitIndex?: number): boolean => {
    let ok = false;
    setState(prev => {
      const r = upgradeShelterStatUpdate(prev, statType, unitIndex ?? 0);
      ok = r.result;
      return r.state;
    });
    return ok;
  };

  const startExpedition = (survivorId: string, locationId: string): boolean => {
    let ok = false;
    setState(prev => {
      const r = startExpeditionUpdate(prev, survivorId, locationId);
      ok = r.result;
      return r.state;
    });
    return ok;
  };

  const stopExpedition = (): boolean => {
    let ok = false;
    setState(prev => {
      const r = stopExpeditionUpdate(prev);
      ok = r.result;
      return r.state;
    });
    return ok;
  };

  const summonHero = (): SummonOutcome => {
    // 基于 stateRef 同步计算（绕开 setState 异步/批量更新下返回值不可靠的问题）
    const r = summonUpdate(stateRef.current);
    if (r.state !== stateRef.current) {
      setState(r.state);
    }
    return r.result;
  };

  const summonTenHeroes = (): MultiSummonResult => {
    const r = summonTenUpdate(stateRef.current);
    if (r.state !== stateRef.current) {
      setState(r.state);
    }
    return r.result;
  };

  const [isSummonOpen, setIsSummonOpen] = useState(false);
  const openSummonModal = () => setIsSummonOpen(true);
  const closeSummonModal = () => setIsSummonOpen(false);

  // === 装备系统（ticket 10） ===
  const equipItem = (heroId: string, slot: EquipmentSlot, itemId: string): boolean => {
    const r = equipItemUpdate(stateRef.current, heroId, slot, itemId);
    if (r.state !== stateRef.current) {
      setState(r.state);
    }
    return r.result;
  };

  const unequipItem = (heroId: string, slot: EquipmentSlot): boolean => {
    const r = unequipItemUpdate(stateRef.current, heroId, slot);
    if (r.state !== stateRef.current) {
      setState(r.state);
    }
    return r.result;
  };

  const enhanceItem = (heroId: string, slot: EquipmentSlot): EnhanceFailure | true => {
    const r = enhanceItemUpdate(stateRef.current, heroId, slot);
    if (r.state !== stateRef.current) {
      setState(r.state);
    }
    return r.result;
  };

  const forgeMythic = (heroId: string, slot: EquipmentSlot): ForgeFailure | true => {
    const r = forgeMythicUpdate(stateRef.current, heroId, slot);
    if (r.state !== stateRef.current) {
      setState(r.state);
    }
    return r.result;
  };

  // === 职阶天赋树（ticket 11） ===
  const allocateTalent = (heroId: string, nodeId: string): TalentAllocateFailure | true => {
    const r = allocateTalentUpdate(stateRef.current, heroId, nodeId);
    if (r.state !== stateRef.current) {
      setState(r.state);
    }
    return r.result;
  };

  const unallocateTalent = (heroId: string, nodeId: string): TalentUnallocateFailure | true => {
    const r = unallocateTalentUpdate(stateRef.current, heroId, nodeId);
    if (r.state !== stateRef.current) {
      setState(r.state);
    }
    return r.result;
  };

  const resetTalents = (heroId: string): boolean => {
    const r = resetTalentsUpdate(stateRef.current, heroId);
    if (r.state !== stateRef.current) {
      setState(r.state);
    }
    return r.result;
  };

  // === 升星与觉醒（ticket 12） ===
  const starUpHero = (heroId: string): StarUpFailure | true => {
    const r = starUpUpdate(stateRef.current, heroId);
    if (r.state !== stateRef.current) {
      setState(r.state);
    }
    return r.result;
  };

  const awakenHero = (heroId: string): AwakenFailure | true => {
    const r = awakenUpdate(stateRef.current, heroId);
    if (r.state !== stateRef.current) {
      setState(r.state);
    }
    return r.result;
  };

  // === 战斗核心（ticket 05） ===
  const startCombat = (zoneId: string): CombatOutcome => {
    const r = startCombatUpdate(stateRef.current, zoneId);
    if (r.state !== stateRef.current) {
      setState(r.state);
    }
    return r.result;
  };

  const setParty = (heroIds: string[]): boolean => {
    const r = setPartyUpdate(stateRef.current, heroIds);
    if (r.state !== stateRef.current) {
      setState(r.state);
    }
    return r.result;
  };

  const healWoundedHero = (heroId: string): boolean => {
    const r = healWoundedHeroUpdate(stateRef.current, heroId);
    if (r.state !== stateRef.current) {
      setState(r.state);
    }
    return r.result;
  };

  const resolveEncounterBattle = (encounterId: string): EncounterBattleOutcome => {
    const r = resolveEncounterBattleUpdate(stateRef.current, encounterId);
    if (r.state !== stateRef.current) {
      setState(r.state);
    }
    return r.result;
  };

  const fleeEncounter = (): boolean => {
    const r = fleeEncounterUpdate(stateRef.current);
    if (r.state !== stateRef.current) {
      setState(r.state);
    }
    return r.result;
  };

  const startBossBattle = (zoneId: string): BossBattleOutcome => {
    const r = startBossBattleUpdate(stateRef.current, zoneId);
    if (r.state !== stateRef.current) {
      setState(r.state);
    }
    return r.result;
  };

  // === 梦魇泄露防御（ticket 14）：出战小队，炮塔可选辅助输出一轮 ===
  const defendDreamLeak = (method: DreamLeakDefenseMethod): DreamLeakDefenseOutcome => {
    const r = defendDreamLeakUpdate(stateRef.current, method);
    if (r.state !== stateRef.current) {
      setState(r.state);
    }
    return r.result;
  };

  // === 确认式离线挂机（ticket 08） ===
  const startIdle = (zoneId: string): IdleStartOutcome => {
    const r = startIdleUpdate(stateRef.current, zoneId);
    if (r.state !== stateRef.current) {
      setState(r.state);
    }
    return r.result;
  };

  const stopIdle = (): boolean => {
    const r = stopIdleUpdate(stateRef.current);
    if (r.state !== stateRef.current) {
      setState(r.state);
    }
    return r.result;
  };

  const resetGame = () => {
    const now = Date.now();
    const freshState = createFreshState(INITIAL_STATE, now);
    setState(freshState);
    localStorage.setItem(`aether_garden_save_${currentUser}`, JSON.stringify(freshState));
  };

  const hasNova = !!state.survivors.nova;
  const hasCatherine = !!state.survivors.catherine;
  const hasBuster = !!state.survivors.buster;
  const maxEnergy = state.player.maxEnergy || 100;

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
      enqueueRecipe,
      removeQueueEntry,
      expandFacility,
      setFacilityActive,
      upgradeShelterStat,
      startExpedition,
      stopExpedition,
      summonHero,
      summonTenHeroes,
      isSummonOpen,
      openSummonModal,
      closeSummonModal,
      equipItem,
      unequipItem,
      enhanceItem,
      forgeMythic,
      allocateTalent,
      unallocateTalent,
      resetTalents,
      starUpHero,
      awakenHero,
      startCombat,
      setParty,
      healWoundedHero,
      resolveEncounterBattle,
      fleeEncounter,
      startBossBattle,
      defendDreamLeak,
      startIdle,
      stopIdle
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
