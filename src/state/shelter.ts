import type { GameState } from '../types/game';
import { EXPEDITION_LOCATIONS } from '../data/expeditionLocations';
import { SURVIVORS_CONFIG } from '../data/survivors';
import type { UpdateResult } from './types';
import { NO_OP } from './types';

// 英雄的废土职业档案（ADR-0013）：SURVIVORS_CONFIG 已降级为英雄的剧情档案，
// 其 role/roleLabel 仅用于远征派遣的职业判定与职位展示
const getHeroRole = (heroId: string): string | undefined =>
  SURVIVORS_CONFIG.find(c => c.id === heroId)?.role;

// 指派/取消英雄岗位（自动浇水、挂机探索）——产线设施纯自动、不再派驻人员（ticket 13：设施见 state/facility.ts）
// 英雄的"协助中"状态由 shelter.assignedWatererId / assignedExplorerId 表达（ADR-0013 单轨）
export const assignHeroJobUpdate = (state: GameState, heroId: string, jobId: 'waterer' | 'explorer' | null): UpdateResult<boolean> => {
  if (!heroId || heroId.trim() === '') return NO_OP(state);
  if (!state.heroes[heroId]) return NO_OP(state);

  const updatedShelter = {
    ...state.shelter,
    facilities: { ...state.shelter.facilities }
  };

  if (!jobId) {
    if (updatedShelter.assignedWatererId === heroId) updatedShelter.assignedWatererId = null;
    if (updatedShelter.assignedExplorerId === heroId) updatedShelter.assignedExplorerId = null;
    return {
      state: { ...state, shelter: updatedShelter },
      result: true
    };
  }

  if (jobId !== 'waterer' && jobId !== 'explorer') return NO_OP(state);

  // 旧占位者被下方赋值自然替换；先清空 heroId 在两岗位的占用，防止同英雄兼任
  if (updatedShelter.assignedWatererId === heroId) updatedShelter.assignedWatererId = null;
  if (updatedShelter.assignedExplorerId === heroId) updatedShelter.assignedExplorerId = null;

  if (jobId === 'waterer') {
    updatedShelter.assignedWatererId = heroId;
  } else if (jobId === 'explorer') {
    updatedShelter.assignedExplorerId = heroId;
    const now = Date.now();
    updatedShelter.expedition = {
      ...updatedShelter.expedition,
      startTime: updatedShelter.expedition.startTime || now,
      lastScavengeTime: updatedShelter.expedition.lastScavengeTime || now
    };
  }

  return {
    state: { ...state, shelter: updatedShelter },
    result: true
  };
};

// 设置设施加工配方（切换时退还前一个配方的在制原料）
// 派遣英雄挂机探索指定地点
export const startExpeditionUpdate = (state: GameState, heroId: string, locationId: string): UpdateResult<boolean> => {
  const loc = EXPEDITION_LOCATIONS[locationId as keyof typeof EXPEDITION_LOCATIONS];
  if (!loc) return NO_OP(state);

  if (!state.heroes[heroId]) return NO_OP(state);
  if (loc.requiredRole && getHeroRole(heroId) !== loc.requiredRole) return NO_OP(state);

  const updatedShelter = {
    ...state.shelter,
    facilities: { ...state.shelter.facilities }
  };

  if (updatedShelter.assignedWatererId === heroId) updatedShelter.assignedWatererId = null;
  if (updatedShelter.assignedExplorerId === heroId) updatedShelter.assignedExplorerId = null;

  updatedShelter.assignedExplorerId = heroId;

  const now = Date.now();
  updatedShelter.expedition = {
    locationId,
    startTime: now,
    lastScavengeTime: now
  };

  return {
    state: { ...state, shelter: updatedShelter },
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
  updatedShelter.assignedExplorerId = null;

  return {
    state: { ...state, shelter: updatedShelter },
    result: true
  };
};
