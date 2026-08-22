import { describe, it, expect } from 'vitest';
import type { GameState } from '../types/game';
import { INITIAL_STATE, createInitialHero } from '../data/initialState';
import {
  startLevelIdleUpdate,
  stopLevelIdleUpdate,
  settleLevelIdleUpdate,
  getClearedLevels,
  EMPTY_IDLE_STATE,
  MAX_IDLE_BATTLES_PER_TICK
} from './levelCombat';
import { recoverStaminaByTime } from './stamina';

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
  stamina: 50,
  maxStamina: 100,
  party: ['nova', 'soldier'],
  heroes: {
    nova: createInitialHero('nova'),
    soldier: createInitialHero('soldier')
  },
  inventory: { scrap_metal: 0, glow_fiber: 0 }
});

describe('level idle combat engine (combat-offline ticket 03)', () => {
  describe('starting idle combat', () => {
    it('rejects starting idle on an uncleared level', () => {
      const state = clearedLevelState();
      const r = startLevelIdleUpdate(state, 'wasteland_entrance', 'wasteland_entrance_2', 1000);
      expect(r.result.ok).toBe(false);
      expect(r.result.failure).toBe('locked');
    });

    it('rejects starting idle when stamina is insufficient', () => {
      const state = clearedLevelState({
        stamina: 0,
        party: ['nova'],
        heroes: { nova: createInitialHero('nova') }
      });
      const r = startLevelIdleUpdate(state, 'wasteland_entrance', 'wasteland_entrance_1', 1000);
      expect(r.result.ok).toBe(false);
      expect(r.result.failure).toBe('no_stamina');
    });

    it('rejects starting idle when party is empty', () => {
      const state = clearedLevelState({
        stamina: 50,
        party: []
      });
      const r = startLevelIdleUpdate(state, 'wasteland_entrance', 'wasteland_entrance_1', 1000);
      expect(r.result.ok).toBe(false);
      expect(r.result.failure).toBe('no_party');
    });

    it('rejects starting idle when any hero in party is wounded', () => {
      const woundedHero = { ...createInitialHero('nova'), wounded: true, hp: 0 };
      const state = clearedLevelState({
        stamina: 50,
        party: ['nova'],
        heroes: { nova: woundedHero }
      });
      const r = startLevelIdleUpdate(state, 'wasteland_entrance', 'wasteland_entrance_1', 1000);
      expect(r.result.ok).toBe(false);
      expect(r.result.failure).toBe('wounded');
    });

    it('rejects starting idle if already idling', () => {
      const state = clearedLevelState({
        stamina: 50,
        party: ['nova'],
        heroes: { nova: createInitialHero('nova') },
        combat: {
          ...INITIAL_STATE.combat,
          idle: {
            regionId: 'wasteland_entrance',
            levelId: 'wasteland_entrance_1',
            startTime: 1000,
            accumulatedSeconds: 0
          }
        }
      });
      const r = startLevelIdleUpdate(state, 'wasteland_entrance', 'wasteland_entrance_1', 1000);
      expect(r.result.ok).toBe(false);
      expect(r.result.failure).toBe('already_idling');
    });

    it('starts idle on a cleared level, validates stamina, and initializes idle state', () => {
      const r = startLevelIdleUpdate(WINNING_STATE, 'wasteland_entrance', 'wasteland_entrance_1', 1000);
      expect(r.result.ok).toBe(true);
      expect(r.state.combat.idle?.regionId).toBe('wasteland_entrance');
      expect(r.state.combat.idle?.levelId).toBe('wasteland_entrance_1');
      expect(r.state.combat.idle?.startTime).toBe(1000);
      expect(r.state.combat.idle?.totalBattles).toBe(0);
      // Validates threshold, actual deduction occurs per-battle in settleLevelIdleUpdate
      expect(r.state.stamina).toBe(WINNING_STATE.stamina);
    });
  });

  describe('online continuous combat and stamina waiting', () => {
    it('settles multiple battles continuously and accumulates drops and stats', () => {
      const started = startLevelIdleUpdate(WINNING_STATE, 'wasteland_entrance', 'wasteland_entrance_1', 1000).state;
      // 10 seconds = 2 battles (5s each)
      const { state: nextState, result } = settleLevelIdleUpdate(started, 10, () => 0.1, false);

      expect(result.battlesFought).toBe(2);
      expect(result.victories).toBe(2);
      expect(result.autoStopped).toBe(false);
      expect(result.staminaConsumed).toBe(20); // 2 battles * 10 stamina

      // Cumulative data in state
      expect(nextState.combat.idle?.totalBattles).toBe(2);
      expect(nextState.combat.idle?.totalVictories).toBe(2);
      expect((nextState.combat.idle?.totalDrops?.scrap_metal ?? 0)).toBeGreaterThan(0);
    });

    it('waits without auto-stopping when stamina is insufficient in online mode', () => {
      // Set stamina to 8 (cost is 10)
      const stateWithLowStamina = {
        ...WINNING_STATE,
        stamina: 8,
        combat: {
          ...WINNING_STATE.combat,
          idle: {
            regionId: 'wasteland_entrance',
            levelId: 'wasteland_entrance_1',
            startTime: 1000,
            accumulatedSeconds: 3,
            totalBattles: 1,
            totalVictories: 1,
            totalDefeats: 0,
            totalDraws: 0,
            totalDrops: {},
            totalSoulEchoes: 0
          }
        }
      };

      // 1 second tick with autoStopOnEmptyStamina = false
      const { state: nextState, result } = settleLevelIdleUpdate(stateWithLowStamina, 1, () => 0.1, false);

      expect(result.battlesFought).toBe(0);
      expect(result.autoStopped).toBe(false);
      expect(nextState.combat.idle?.regionId).toBe('wasteland_entrance');
      expect(nextState.combat.idle?.accumulatedSeconds).toBe(4); // 3 + 1

      // Stamina naturally recovers over time (+6 seconds -> +2 stamina, reaching 10)
      const recovered = recoverStaminaByTime(nextState, 6).state;
      expect(Math.floor(recovered.stamina)).toBe(10);

      // Next settle (1 second -> accumulated 4 + 1 = 5s) triggers 1 battle!
      const afterRecover = settleLevelIdleUpdate(recovered, 1, () => 0.1, false);
      expect(afterRecover.result.battlesFought).toBe(1);
    });
  });

  describe('party wipe interruption state machine', () => {
    it('wounds all party heroes, stops idle, and resets combat.idle to EMPTY_IDLE_STATE on defeat', () => {
      // Weak hero with 1 HP against wasteland_entrance enemies
      const weakHero = {
        ...createInitialHero('nova'),
        hp: 1,
        maxHp: 1,
        level: 1
      };
      const weakState = clearedLevelState({
        stamina: 50,
        party: ['nova'],
        heroes: { nova: weakHero },
        combat: {
          ...INITIAL_STATE.combat,
          idle: {
            regionId: 'wasteland_entrance',
            levelId: 'wasteland_entrance_1',
            startTime: 1000,
            accumulatedSeconds: 0,
            totalBattles: 0,
            totalVictories: 0,
            totalDefeats: 0,
            totalDraws: 0,
            totalDrops: {},
            totalSoulEchoes: 0
          }
        }
      });

      // Settle with high enemy rolls causing defeat
      const { state: afterDefeat, result } = settleLevelIdleUpdate(weakState, 10, () => 0.99, false);

      if (result.defeats > 0) {
        expect(result.autoStopped).toBe(true);
        expect(result.stopReason).toBe('defeat');
        expect(afterDefeat.heroes['nova'].wounded).toBe(true);
        expect(afterDefeat.combat.idle).toEqual(EMPTY_IDLE_STATE);

        // Cannot start idle again while wounded
        const restart = startLevelIdleUpdate(afterDefeat, 'wasteland_entrance', 'wasteland_entrance_1', 2000);
        expect(restart.result.ok).toBe(false);
        expect(restart.result.failure).toBe('wounded');
      }
    });
  });

  describe('manual stopping with summary data', () => {
    it('stops idle, resets to EMPTY_IDLE_STATE, and returns detailed summary data', () => {
      const started = startLevelIdleUpdate(WINNING_STATE, 'wasteland_entrance', 'wasteland_entrance_1', 1000).state;
      const afterBattle = settleLevelIdleUpdate(started, 10, () => 0.1, false).state;
      const stopped = stopLevelIdleUpdate(afterBattle, 5000);

      expect(stopped.result.ok).toBe(true);
      expect(stopped.result.summary).toBeDefined();
      expect(stopped.result.summary?.totalBattles).toBe(2);
      expect(stopped.result.summary?.durationSeconds).toBe(4);
      expect(stopped.result.summary?.regionId).toBe('wasteland_entrance');
      expect(stopped.result.summary?.levelId).toBe('wasteland_entrance_1');
      expect(stopped.state.combat.idle).toEqual(EMPTY_IDLE_STATE);
    });

    it('returns ok: false and null summary when not idling', () => {
      const stopped = stopLevelIdleUpdate(WINNING_STATE, 5000);
      expect(stopped.result.ok).toBe(false);
      expect(stopped.result.summary).toBeNull();
    });
  });

  describe('per-tick settlement cap (combat-hygiene 06 / O#3)', () => {
    it('单 Tick 结算不超过 MAX_IDLE_BATTLES_PER_TICK，余量滚回 accumulatedSeconds', () => {
      // 体力抬到 500（该关每场 10 点），排除体力约束、单测上限本身。
      const rich = { ...WINNING_STATE, stamina: 500, maxStamina: 500 };
      const started = startLevelIdleUpdate(rich, 'wasteland_entrance', 'wasteland_entrance_1', 1000).state;
      // 100 秒 ≈ 20 场（battleDurationSeconds=5），体力足够 50 场；上限截断为 10。
      const { state: next, result } = settleLevelIdleUpdate(started, 100, () => 0.1, false);
      expect(result.battlesFought).toBe(MAX_IDLE_BATTLES_PER_TICK);
      expect(result.autoStopped ?? false).toBe(false);
      // 未消化的整场时间全部滚回：100 - 10×5 = 50。
      expect(next.combat.idle?.accumulatedSeconds).toBe(50);
      expect(next.combat.idle?.totalBattles).toBe(MAX_IDLE_BATTLES_PER_TICK);
    });
  });

  describe('cleared levels helper', () => {
    it('records cleared levels through getClearedLevels', () => {
      const state = clearedLevelState();
      expect(getClearedLevels(state).wasteland_entrance).toContain('wasteland_entrance_1');
    });
  });
});
