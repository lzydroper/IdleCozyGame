import type { GameState, DutyAssignment } from '../types/game';
import type { UpdateResult } from './types';
import { NO_OP } from './types';
import { EXPEDITION_LOCATIONS } from '../data/expeditionLocations';
import { HEROES_CONFIG } from '../data/heroes';

// 清除英雄在所有后勤岗位的占用（排他性：强制单岗）
// 更新 hero.logisticsFacilityId + shelter 缓存索引 + expedition 状态
const clearHeroDuty = (state: GameState, heroId: string): GameState => {
  const hero = state.heroes[heroId];
  if (!hero || !hero.logisticsFacilityId) return state;

  const prevDuty = hero.logisticsFacilityId;
  const updatedHeroes = { ...state.heroes, [heroId]: { ...hero, logisticsFacilityId: null } };
  const updatedShelter = { ...state.shelter, facilities: { ...state.shelter.facilities } };
  let nextGreenhouse = state.greenhouse;

  // 清缓存索引
  if (prevDuty.type === 'waterer' && updatedShelter.assignedWatererId === heroId) {
    updatedShelter.assignedWatererId = null;
    // 解除驻守联动（08）：挂机自动关闭，保留 cropId（重新驻守后可一键恢复开启）
    if (nextGreenhouse.autoFarm.enabled) {
      nextGreenhouse = {
        ...nextGreenhouse,
        autoFarm: { ...nextGreenhouse.autoFarm, enabled: false }
      };
    }
  }
  if (prevDuty.type === 'explorer' && updatedShelter.assignedExplorerId === heroId) {
    updatedShelter.assignedExplorerId = null;
    // 清 explorer 时重置 expedition 运行状态
    updatedShelter.expedition = {
      locationId: null,
      startTime: null,
      lastScavengeTime: null
    };
  }

  return { ...state, heroes: updatedHeroes, shelter: updatedShelter, greenhouse: nextGreenhouse };
};

// 统一指派/解除英雄后勤岗位（ADR-0018：浇水 / 探索 / 设施驻守统一为 logisticsFacilityId）
// - duty = null：解除该英雄的所有后勤占用
// - duty = { type: 'waterer', targetId: 'greenhouse' }：浇水操作员
// - duty = { type: 'explorer', targetId: locationId }：远征探索员（启动远征）
// - duty = { type: 'facility', targetId: '${type}_${index}' }：设施驻守员
//
// shelter.assignedWatererId / assignedExplorerId 保留为缓存索引（真相源是 hero.logisticsFacilityId）
// shelter.expedition 保留为远征运行状态（locationId / startTime / lastScavengeTime）
export const assignHeroToDutyUpdate = (
  state: GameState,
  heroId: string,
  duty: DutyAssignment | null
): UpdateResult<boolean> => {
  if (!heroId || heroId.trim() === '') return NO_OP(state);
  if (!state.heroes[heroId]) return NO_OP(state);
  // 已上阵英雄不可指派后勤（与出战队伍互斥，防同时上阵+驻守）
  if (state.party.includes(heroId)) return NO_OP(state);

  // duty = null：解除该英雄的所有后勤占用
  if (!duty) {
    const cleared = clearHeroDuty(state, heroId);
    if (cleared === state) return NO_OP(state); // 无变化
    return { state: cleared, result: true };
  }

  // 先清除该英雄的旧岗位（排他性：强制单岗）
  let nextState = clearHeroDuty(state, heroId);

  const updatedHeroes = { ...nextState.heroes, [heroId]: { ...nextState.heroes[heroId], logisticsFacilityId: duty } };
  const updatedShelter = { ...nextState.shelter, facilities: { ...nextState.shelter.facilities } };

  if (duty.type === 'waterer') {
    // 浇水操作员（单值岗）：清除旧占位英雄的 logisticsFacilityId + 写缓存索引
    const prevWatererId = updatedShelter.assignedWatererId;
    if (prevWatererId && prevWatererId !== heroId && updatedHeroes[prevWatererId]) {
      updatedHeroes[prevWatererId] = { ...updatedHeroes[prevWatererId], logisticsFacilityId: null };
    }
    updatedShelter.assignedWatererId = heroId;
  } else if (duty.type === 'explorer') {
    // 远征探索员（单值岗）：校验地点 + heroClass/faction 门槛 + 口粮消耗（ADR-0018）
    const loc = EXPEDITION_LOCATIONS[duty.targetId as keyof typeof EXPEDITION_LOCATIONS];
    if (!loc) return NO_OP(state);

    const heroConfig = HEROES_CONFIG[heroId];
    if (!heroConfig) return NO_OP(state);
    if (loc.requiredHeroClass && heroConfig.heroClass !== loc.requiredHeroClass) return NO_OP(state);
    if (loc.requiredFaction && heroConfig.faction !== loc.requiredFaction) return NO_OP(state);

    // 口粮校验 + 扣减（内化到 state 层，UI 不校验）
    const rationCost = loc.rationCost ?? 0;
    const updatedInventory = { ...nextState.inventory };
    if (rationCost > 0) {
      const rationQty = updatedInventory['ration'] || 0;
      if (rationQty < rationCost) return NO_OP(state);
      updatedInventory['ration'] = rationQty - rationCost;
    }

    // 清除旧占位英雄的 logisticsFacilityId + 写缓存索引 + 初始化远征运行状态
    const prevExplorerId = updatedShelter.assignedExplorerId;
    if (prevExplorerId && prevExplorerId !== heroId && updatedHeroes[prevExplorerId]) {
      updatedHeroes[prevExplorerId] = { ...updatedHeroes[prevExplorerId], logisticsFacilityId: null };
    }
    updatedShelter.assignedExplorerId = heroId;
    const now = Date.now();
    updatedShelter.expedition = {
      locationId: duty.targetId,
      startTime: now,
      lastScavengeTime: now
    };

    return {
      state: { ...nextState, heroes: updatedHeroes, shelter: updatedShelter, inventory: updatedInventory },
      result: true
    };
  } else if (duty.type === 'facility') {
    // 设施驻守：校验目标设施存在（targetId 格式 '${facilityType}_${unitIndex}'）
    const parts = duty.targetId.split('_');
    if (parts.length < 2) return NO_OP(state);
    const facilityType = parts[0];
    const unitIndex = parseInt(parts[1], 10);
    const units = updatedShelter.facilities[facilityType as keyof typeof updatedShelter.facilities];
    if (!units || isNaN(unitIndex) || unitIndex < 0 || unitIndex >= units.length) return NO_OP(state);

    // 替换原驻守英雄（如果目标设施已有驻守者，先清除该英雄的 logisticsFacilityId）
    const prevGarrisonHeroId = Object.entries(updatedHeroes).find(
      ([, h]) => h.logisticsFacilityId?.type === 'facility' && h.logisticsFacilityId.targetId === duty.targetId
    )?.[0];
    if (prevGarrisonHeroId && prevGarrisonHeroId !== heroId) {
      updatedHeroes[prevGarrisonHeroId] = { ...updatedHeroes[prevGarrisonHeroId], logisticsFacilityId: null };
    }
  }

  return {
    state: { ...nextState, heroes: updatedHeroes, shelter: updatedShelter },
    result: true
  };
};
