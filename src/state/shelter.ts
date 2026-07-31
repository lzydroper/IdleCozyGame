import type { GameState } from '../types/game';
import { AUTO_RECIPES } from '../data/autoRecipes';
import { SHELTER_UPGRADES } from '../data/shelterUpgrades';
import { EXPEDITION_LOCATIONS } from '../data/expeditionLocations';
import type { UpdateResult } from './types';
import { NO_OP } from './types';

type UpgradeStatType = 'battery' | 'generator' | 'recycler' | 'smelter' | 'assembler';

// 指派/取消幸存者岗位（浇水、探索、设施）
export const assignSurvivorJobUpdate = (state: GameState, survivorId: string, jobId: string | null): UpdateResult<boolean> => {
  if (!survivorId || survivorId.trim() === '') return NO_OP(state);
  const survivor = state.survivors[survivorId];
  if (!survivor) return NO_OP(state);

  const updatedSurvivors = { ...state.survivors };
  const updatedShelter = {
    ...state.shelter,
    facilities: { ...state.shelter.facilities }
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
    return {
      state: { ...state, survivors: updatedSurvivors, shelter: updatedShelter },
      result: true
    };
  }

  let prevOccupantId: string | null = null;
  if (jobId === 'waterer') {
    prevOccupantId = updatedShelter.assignedWatererId;
  } else if (jobId === 'explorer') {
    prevOccupantId = updatedShelter.assignedExplorerId;
  } else if (updatedShelter.facilities[jobId]) {
    prevOccupantId = updatedShelter.facilities[jobId].assignedSurvivorId;
  } else {
    return NO_OP(state);
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

  return {
    state: { ...state, survivors: updatedSurvivors, shelter: updatedShelter },
    result: true
  };
};

// 设置设施加工配方（切换时退还前一个配方的在制原料）
export const setFacilityRecipeUpdate = (state: GameState, facilityId: string, recipeId: string | null): UpdateResult<boolean> => {
  const facility = state.shelter.facilities[facilityId];
  if (!facility) return NO_OP(state);
  if (recipeId && !AUTO_RECIPES[recipeId]) return NO_OP(state);

  const prevRecipeId = facility.activeRecipeId;
  const prevRecipe = prevRecipeId ? AUTO_RECIPES[prevRecipeId] : null;
  let updatedInventory = { ...state.inventory };

  // 如果前一个配方正在生产中，退还扣除的原材料
  if (prevRecipe && facility.timeLeft > 0) {
    Object.entries(prevRecipe.input).forEach(([itemId, qty]) => {
      updatedInventory[itemId] = (updatedInventory[itemId] || 0) + qty;
    });
  }

  const updatedFacilities = {
    ...state.shelter.facilities,
    [facilityId]: {
      ...facility,
      activeRecipeId: recipeId,
      currentProgress: 0,
      timeLeft: 0
    }
  };

  return {
    state: {
      ...state,
      inventory: updatedInventory,
      shelter: {
        ...state.shelter,
        facilities: updatedFacilities
      }
    },
    result: true
  };
};

// 启用/停用设施
export const setFacilityActiveUpdate = (state: GameState, facilityId: string, active: boolean): UpdateResult<boolean> => {
  const facility = state.shelter.facilities[facilityId];
  if (!facility) return NO_OP(state);

  return {
    state: {
      ...state,
      shelter: {
        ...state.shelter,
        facilities: {
          ...state.shelter.facilities,
          [facilityId]: {
            ...facility,
            active
          }
        }
      }
    },
    result: true
  };
};

// 升级避难所设施（蓄电池/发电机/回收站/冶炼炉/组装台）
export const upgradeShelterStatUpdate = (state: GameState, statType: UpgradeStatType): UpdateResult<boolean> => {
  const upgrade = SHELTER_UPGRADES[statType];
  if (!upgrade) return NO_OP(state);

  let currentLevel = 1;
  if (statType === 'battery') currentLevel = state.shelter.batteryLevel || 1;
  else if (statType === 'generator') currentLevel = state.shelter.generatorLevel || 0;
  else if (statType === 'recycler') currentLevel = state.shelter.recyclerLevel || 0;
  else if (statType === 'smelter') currentLevel = state.shelter.facilities.smelter.level || 1;
  else if (statType === 'assembler') currentLevel = state.shelter.facilities.assembler.level || 1;

  const nextLevelConfig = upgrade.levels.find(l => l.level === currentLevel + 1);
  if (!nextLevelConfig) return NO_OP(state);

  // 校验所需材料
  const canAfford = Object.entries(nextLevelConfig.cost).every(([item, qty]) => (state.inventory[item] || 0) >= qty);
  if (!canAfford) return NO_OP(state);

  // 扣材料并应用升级
  const currentInventory = { ...state.inventory };
  const currentShelter = {
    ...state.shelter,
    facilities: { ...state.shelter.facilities }
  };

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

  return {
    state: { ...state, inventory: currentInventory, shelter: currentShelter },
    result: true
  };
};

// 派遣幸存者挂机探索指定地点
export const startExpeditionUpdate = (state: GameState, survivorId: string, locationId: string): UpdateResult<boolean> => {
  const loc = EXPEDITION_LOCATIONS[locationId as keyof typeof EXPEDITION_LOCATIONS];
  if (!loc) return NO_OP(state);

  const innerExplorer = state.survivors[survivorId];
  if (!innerExplorer) return NO_OP(state);
  if (loc.requiredRole && innerExplorer.role !== loc.requiredRole) return NO_OP(state);

  const updatedSurvivors = { ...state.survivors };
  const updatedShelter = {
    ...state.shelter,
    facilities: { ...state.shelter.facilities }
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

  return {
    state: { ...state, survivors: updatedSurvivors, shelter: updatedShelter },
    result: true
  };
};

// 停止挂机探索
export const stopExpeditionUpdate = (state: GameState): UpdateResult<boolean> => {
  if (!state.shelter.expedition.locationId) return NO_OP(state);

  const updatedShelter = {
    ...state.shelter,
    expedition: {
      locationId: null,
      startTime: null,
      lastScavengeTime: null
    }
  };

  const explorerId = state.shelter.assignedExplorerId;
  const updatedSurvivors = { ...state.survivors };
  if (explorerId && updatedSurvivors[explorerId]) {
    updatedSurvivors[explorerId] = {
      ...updatedSurvivors[explorerId],
      isAssigned: false,
      assignedJobId: null
    };
  }
  updatedShelter.assignedExplorerId = null;

  return {
    state: { ...state, shelter: updatedShelter, survivors: updatedSurvivors },
    result: true
  };
};
