import { describe, it, expect } from 'vitest';
import type { GameState } from '../types/game';
import { INITIAL_STATE, createInitialHero } from '../data/initialState';
import { startLevelIdleUpdate, stopLevelIdleUpdate, settleLevelIdleUpdate, getClearedLevels } from './levelCombat';

const makeState = (overrides?: Partial<GameState>): GameState => ({
  ...INITIAL_STATE,
  ...overrides
});

const clearedLevelState = (overrides?: Partial<GameState>): GameState =>
  makeState({
    combat: {
      ...INITIAL_STATE.combat,
      regionId: null,
      levelId: null,
      clearedLevels: { wasteland_entrance: ['wasteland_entrance_1'] }
    },
    ...overrides
  });

const WINNING_STATE = clearedLevelState({
  party: ['nova', 'soldier'],
  heroes: {
    nova: createInitialHero('nova'),
    soldier: createInitialHero('soldier')
  },
  inventory: { scrap_metal: 0, glow_fiber: 0 }
});

describe('level idle (combat-level)', () => {
  it('rejects starting idle on an uncleared level', () => {
    const state = clearedLevelState();
    const r = startLevelIdleUpdate(state, 'wasteland_entrance', 'wasteland_entrance_2', 1000);
    expect(r.result.failure).toBe('locked');
  });

  it('starts idle on a cleared level with regionId/levelId', () => {
    const state = clearedLevelState();
    const r = startLevelIdleUpdate(state, 'wasteland_entrance', 'wasteland_entrance_1', 1000);
    expect(r.result.ok).toBe(true);
    expect(r.state.combat.idle?.regionId).toBe('wasteland_entrance');
    expect(r.state.combat.idle?.levelId).toBe('wasteland_entrance_1');
  });

  it('stops idle, preserves stamina, and returns summary data', () => {
    const started = startLevelIdleUpdate(clearedLevelState(), 'wasteland_entrance', 'wasteland_entrance_1', 1000).state;
    // 模拟进行 1 次结算获得收益
    const afterBattle = settleLevelIdleUpdate(started, 100, () => 0.1).state;
    const stopped = stopLevelIdleUpdate(afterBattle, 5000);
    expect(stopped.result.ok).toBe(true);
    expect(stopped.result.summary).toBeDefined();
    expect(stopped.result.summary?.totalBattles).toBeGreaterThan(0);
    expect(stopped.result.summary?.durationSeconds).toBe(4);
    expect(stopped.state.combat.idle?.regionId).toBeNull();
    expect(stopped.state.combat.idle?.levelId).toBeNull();
    expect(stopped.state.stamina).toBe(afterBattle.stamina);
  });

  it('settles level idle battles and records drops in state and outcome', () => {
    const state = startLevelIdleUpdate(WINNING_STATE, 'wasteland_entrance', 'wasteland_entrance_1', 1000).state;
    const { state: nextState, result } = settleLevelIdleUpdate(state, 100, () => 0.1);
    expect(result.battlesFought).toBeGreaterThan(0);
    expect(result.victories).toBe(result.battlesFought);
    expect(result.drops.scrap_metal).toBeGreaterThan(0);
    // 纯数据持久化字段累加
    expect(nextState.combat.idle.totalBattles).toBe(result.battlesFought);
    expect(nextState.combat.idle.totalDrops?.scrap_metal).toBe(result.drops.scrap_metal);
  });

  it('records cleared levels through getClearedLevels', () => {
    const state = clearedLevelState();
    expect(getClearedLevels(state).wasteland_entrance).toContain('wasteland_entrance_1');
  });
});
