import { describe, it, expect } from 'vitest';
import { INITIAL_STATE } from '../data/initialState';
import { COMBAT_CONFIG } from '../data/combatConfig';
import { GAME_CONSTANTS } from '../data/gameConstants';
import { applyTick } from './tick';
import type { GameState } from '../types/game';

// 13 号 R3：applyTick 短路 —— 无活跃系统 + 体力满 + 未跨天时返回原引用，
// 使 GameContext 每秒 tick 触发 React bailout，消除整树重渲染。
describe('applyTick 短路（13 号 R3）', () => {
  it('无活跃系统 + 体力满 + 未跨天 → 返回原引用（不重渲染）', () => {
    const state: GameState = {
      ...INITIAL_STATE,
      stamina: COMBAT_CONFIG.maxStamina,
      dayStartTime: Date.now(),
      lastTick: Date.now() - 1000
    };
    expect(applyTick(state, Date.now())).toBe(state);
  });

  it('体力未满 → 正常恢复，不短路', () => {
    const state: GameState = {
      ...INITIAL_STATE,
      stamina: 50,
      lastTick: Date.now() - 1000
    };
    const next = applyTick(state, Date.now());
    expect(next).not.toBe(state);
    expect(next.stamina).toBeGreaterThan(state.stamina);
  });

  it('跨天 → 推进天数，不短路', () => {
    const state: GameState = {
      ...INITIAL_STATE,
      stamina: COMBAT_CONFIG.maxStamina,
      dayStartTime: Date.now() - GAME_CONSTANTS.GAME_DAY_SECONDS * 1000
    };
    const next = applyTick(state, Date.now());
    expect(next).not.toBe(state);
    expect(next.player.days).toBeGreaterThan(state.player.days);
  });

  it('有活跃系统（温室作物）→ 正常推进，不短路', () => {
    const state: GameState = {
      ...INITIAL_STATE,
      stamina: COMBAT_CONFIG.maxStamina,
      greenhouse: {
        ...INITIAL_STATE.greenhouse,
        slots: INITIAL_STATE.greenhouse.slots.map((s, i) =>
          i === 0 ? { ...s, cropId: 'test_crop' } : s
        )
      },
      lastTick: Date.now() - 1000
    };
    const next = applyTick(state, Date.now());
    expect(next).not.toBe(state);
  });
});
