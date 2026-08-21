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

  it('stops idle and preserves stamina', () => {
    const started = startLevelIdleUpdate(clearedLevelState(), 'wasteland_entrance', 'wasteland_entrance_1', 1000).state;
    const stopped = stopLevelIdleUpdate(started);
    expect(stopped.result).toBe(true);
    expect(stopped.state.combat.idle?.regionId).toBeNull();
    expect(stopped.state.combat.idle?.levelId).toBeNull();
    expect(stopped.state.stamina).toBe(started.stamina);
  });

  it('settles level idle battles and records drops', () => {
    const state = startLevelIdleUpdate(WINNING_STATE, 'wasteland_entrance', 'wasteland_entrance_1', 1000).state;
    const { result } = settleLevelIdleUpdate(state, 100, () => 0.1);
    expect(result.battlesFought).toBeGreaterThan(0);
    expect(result.victories).toBe(result.battlesFought);
    expect(result.drops.scrap_metal).toBeGreaterThan(0);
  });

  it('records cleared levels through getClearedLevels', () => {
    const state = clearedLevelState();
    expect(getClearedLevels(state).wasteland_entrance).toContain('wasteland_entrance_1');
  });
});
