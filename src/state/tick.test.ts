import { describe, it, expect } from 'vitest';
import { INITIAL_STATE } from '../data/initialState';
import { COMBAT_CONFIG } from '../data/combatConfig';
import { GAME_CONSTANTS } from '../data/gameConstants';
import { applyTick } from './tick';
import type { GameState } from '../types/game';

// 13 号 R3 + 04 号 04b：applyTick 短路 —— 无活跃系统 + 体力满/未跨整点 + 未跨天时返回原引用，
// 使 GameContext 每秒 tick 触发 React bailout，消除整树重渲染。体力每 3 秒恢复 1 点（staminaRegenSeconds），
// 仅在跨整点（floor 进位）时才需要推进。
describe('applyTick 短路（13 号 R3 + 04 号 04b）', () => {
  it('无活跃系统 + 体力满 + 未跨天 → 返回原引用（不重渲染）', () => {
    const state: GameState = {
      ...INITIAL_STATE,
      stamina: COMBAT_CONFIG.maxStamina,
      dayStartTime: Date.now(),
      lastTick: Date.now() - 1000
    };
    expect(applyTick(state, Date.now())).toBe(state);
  });

  it('体力未满但未跨整点 → 短路（返回原引用）；跨整点才恢复', () => {
    // elapsed 1s → 50.33，floor 未进位 → 返回原引用（不重渲染）
    const state: GameState = {
      ...INITIAL_STATE,
      stamina: 50,
      lastTick: Date.now() - 1000
    };
    expect(applyTick(state, Date.now())).toBe(state);

    // elapsed 3s → 50 + 1 = 51，floor 51 > 50 跨整点 → 恢复 1 点
    const state2: GameState = {
      ...INITIAL_STATE,
      stamina: 50,
      lastTick: Date.now() - 3000
    };
    const next = applyTick(state2, Date.now());
    expect(next).not.toBe(state2);
    expect(next.stamina).toBeGreaterThan(state2.stamina);
    expect(Math.floor(next.stamina)).toBeGreaterThan(Math.floor(state2.stamina));
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
