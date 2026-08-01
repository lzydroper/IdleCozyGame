import type { GameState } from '../types/game';
import { EXPEDITION_LOCATIONS } from '../data/expeditionLocations';
import type { UpdateResult } from './types';
import { NO_OP } from './types';

// 指派/取消幸存者岗位（自动浇水、挂机探索）——产线设施纯自动、不再派驻人员（ticket 13：设施见 state/facility.ts）
export const assignSurvivorJobUpdate = (state: GameState, survivorId: string, jobId: 'waterer' | 'explorer' | null): UpdateResult<boolean> => {
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
  } else {
    return NO_OP(state);
  }

  if (updatedShelter.assignedWatererId === survivorId) updatedShelter.assignedWatererId = null;
  if (updatedShelter.assignedExplorerId === survivorId) updatedShelter.assignedExplorerId = null;

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
