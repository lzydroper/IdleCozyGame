import type { GameState } from '../types/game';
import { COMBAT_CONFIG } from '../data/combatConfig';

/**
 * 获取玩家当前可用整型体力
 */
export const getStamina = (state: GameState): number => {
  return Math.floor(state.stamina ?? 0);
};

/**
 * 获取玩家体力上限（优先使用 state.maxStamina，否则使用配置默认值）
 */
export const getMaxStamina = (state: GameState): number => {
  return state.maxStamina || COMBAT_CONFIG.maxStamina;
};

/**
 * 按时间流逝计算体力自然恢复
 *
 * @param state 当前游戏状态
 * @param elapsedSeconds 流逝时间（秒）
 * @returns 更新后的游戏状态与实际跨整点恢复的整数体力点数
 */
export const recoverStaminaByTime = (
  state: GameState,
  elapsedSeconds: number
): { state: GameState; recoveredInt: number } => {
  const currentStamina = state.stamina ?? 0;
  const maxStamina = getMaxStamina(state);

  if (elapsedSeconds <= 0 || currentStamina >= maxStamina) {
    return { state, recoveredInt: 0 };
  }

  const gainedFloat = elapsedSeconds / COMBAT_CONFIG.staminaRegenSeconds;
  const nextStamina = Math.min(maxStamina, currentStamina + gainedFloat);

  const prevInt = Math.floor(currentStamina);
  const nextInt = Math.floor(nextStamina);
  const recoveredInt = Math.max(0, nextInt - prevInt);

  return {
    state: {
      ...state,
      stamina: nextStamina
    },
    recoveredInt
  };
};

/**
 * 尝试扣除指定数量体力
 *
 * @param state 当前游戏状态
 * @param cost 消耗体力点数
 * @returns 扣除结果与新状态（体力不足时返回原状态且 ok 为 false）
 */
export const tryConsumeStamina = (
  state: GameState,
  cost: number
): { ok: boolean; state: GameState } => {
  if (cost <= 0) {
    return { ok: true, state };
  }

  const currentStamina = state.stamina ?? 0;
  const availableInt = Math.floor(currentStamina);

  if (availableInt < cost) {
    return { ok: false, state };
  }

  return {
    ok: true,
    state: {
      ...state,
      stamina: Math.max(0, currentStamina - cost)
    }
  };
};

/**
 * 增加玩家体力（如道具使用、任务奖励等）
 *
 * @param state 当前游戏状态
 * @param amount 增加的体力点数
 * @param allowOverflow 是否允许突破体力上限（默认 false，封顶 maxStamina）
 * @returns 更新后的游戏状态
 */
export const grantStamina = (
  state: GameState,
  amount: number,
  allowOverflow: boolean = false
): GameState => {
  if (amount <= 0) {
    return state;
  }

  const currentStamina = state.stamina ?? 0;
  const maxStamina = getMaxStamina(state);

  const nextStamina = allowOverflow
    ? currentStamina + amount
    : Math.min(maxStamina, currentStamina + amount);

  return {
    ...state,
    stamina: nextStamina
  };
};
