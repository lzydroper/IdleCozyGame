import type { GameState } from '../types/game';
import { getRegion } from '../data/regionSelectors';
import { EXPLORATION_CONFIG } from '../configs/constants/explorationConfig';

export const getRegionProgress = (state: GameState, regionId: string): number =>
  state.exploration?.regionProgress?.[regionId] ?? 0;

export const getRegionProgressPercent = (state: GameState, regionId: string): number => {
  const region = getRegion(regionId);
  const target = region?.explorationStepsToClear ?? 0;
  if (target <= 0) return 0;
  return Math.min(100, Math.floor((getRegionProgress(state, regionId) / target) * 100));
};

export const getPendingMilestone = (state: GameState, regionId: string): string | null =>
  state.exploration?.pendingMilestones?.[regionId] ?? null;

/**
 * 完成一次探索事件后推进区域进度：
 * - 存在待办里程碑时暂停累计；
 * - 累计进度首次越过某里程碑阈值时，进度钳制在阈值并登记待办；
 * - 返回新 state（不修改原对象）。
 */
export const advanceRegionProgress = (state: GameState, regionId: string): GameState => {
  const region = getRegion(regionId);
  if (!region) return state;
  if (getPendingMilestone(state, regionId)) return state;

  const current = getRegionProgress(state, regionId);
  const next = current + 1;
  const target = region.explorationStepsToClear || 0;

  const pendingMilestones = { ...(state.exploration?.pendingMilestones ?? {}) };
  const regionProgress = { ...(state.exploration?.regionProgress ?? {}), [regionId]: next };

  if (target > 0) {
    const milestone = [...region.explorationMilestones]
      .sort((a, b) => a.atPercent - b.atPercent)
      .find((m) => {
        const threshold = Math.ceil((target * m.atPercent) / 100);
        return current < threshold && next >= threshold;
      });
    if (milestone) {
      // 进度钳制在阈值，等待里程碑完成
      regionProgress[regionId] = Math.ceil((target * milestone.atPercent) / 100);
      pendingMilestones[regionId] = milestone.eventId;
    }
  }

  return {
    ...state,
    exploration: {
      ...state.exploration,
      regionProgress,
      pendingMilestones
    }
  };
};

export const completePendingMilestone = (state: GameState, regionId: string): GameState => {
  if (!getPendingMilestone(state, regionId)) return state;
  const pendingMilestones = { ...(state.exploration?.pendingMilestones ?? {}) };
  delete pendingMilestones[regionId];
  return {
    ...state,
    exploration: {
      ...state.exploration,
      pendingMilestones
    }
  };
};

/** 待办里程碑是否满足触发条件（本次探索已完成步数 ≥ minRunSteps）。 */
export const canTriggerPendingMilestone = (state: GameState, regionId: string): boolean => {
  if (!getPendingMilestone(state, regionId)) return false;
  return (state.exploration?.realitySteps ?? 0) >= EXPLORATION_CONFIG.minRunSteps;
};
