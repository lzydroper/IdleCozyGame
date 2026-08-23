import { describe, it, expect } from 'vitest';
import type { GameState } from '../types/game';
import { INITIAL_STATE } from '../data/initialState';
import { COMBAT_CONFIG } from '../configs/constants/combatConfig';
import {
  getStamina,
  getMaxStamina,
  recoverStaminaByTime,
  tryConsumeStamina,
  grantStamina
} from './stamina';

const makeTestState = (overrides?: Partial<GameState>): GameState => ({
  ...INITIAL_STATE,
  ...overrides
});

describe('stamina system (combat-offline ticket 01)', () => {
  describe('getStamina & getMaxStamina', () => {
    it('returns floored integer value of current stamina', () => {
      const state = makeTestState({ stamina: 45.8 });
      expect(getStamina(state)).toBe(45);
    });

    it('returns 0 when stamina is undefined or 0', () => {
      const state = makeTestState({ stamina: undefined });
      expect(getStamina(state)).toBe(0);
    });

    it('returns maxStamina from state or fallback to COMBAT_CONFIG', () => {
      const stateWithDefault = makeTestState({ maxStamina: undefined });
      expect(getMaxStamina(stateWithDefault)).toBe(COMBAT_CONFIG.maxStamina);

      const stateWithCustom = makeTestState({ maxStamina: 150 });
      expect(getMaxStamina(stateWithCustom)).toBe(150);
    });
  });

  describe('recoverStaminaByTime', () => {
    it('returns original state and 0 recovered when elapsedSeconds <= 0', () => {
      const state = makeTestState({ stamina: 50 });
      const r = recoverStaminaByTime(state, 0);
      expect(r.state).toBe(state);
      expect(r.recoveredInt).toBe(0);
    });

    it('returns original state and 0 recovered when stamina is already full', () => {
      const state = makeTestState({ stamina: 100, maxStamina: 100 });
      const r = recoverStaminaByTime(state, 10);
      expect(r.state).toBe(state);
      expect(r.recoveredInt).toBe(0);
    });

    it('recovers stamina proportionally based on staminaRegenSeconds', () => {
      // 3 seconds = 1 stamina (assuming staminaRegenSeconds = 3)
      const state = makeTestState({ stamina: 50 });
      const r = recoverStaminaByTime(state, COMBAT_CONFIG.staminaRegenSeconds * 5);
      expect(r.state.stamina).toBe(55);
      expect(r.recoveredInt).toBe(5);
    });

    it('clamps to maxStamina on overflow and computes exact integer gain', () => {
      const state = makeTestState({ stamina: 98, maxStamina: 100 });
      const r = recoverStaminaByTime(state, 300);
      expect(r.state.stamina).toBe(100);
      expect(r.recoveredInt).toBe(2);
    });

    it('tracks fractional progress without loss', () => {
      const state = makeTestState({ stamina: 50 });
      // 1 second with 3s/point gives +0.333...
      const r1 = recoverStaminaByTime(state, 1);
      expect(r1.state.stamina).toBeCloseTo(50.333, 2);
      expect(r1.recoveredInt).toBe(0);

      // Another 2 seconds completes the full point
      const r2 = recoverStaminaByTime(r1.state, 2);
      expect(r2.state.stamina).toBe(51);
      expect(r2.recoveredInt).toBe(1);
    });
  });

  describe('tryConsumeStamina', () => {
    it('succeeds when cost is 0 and returns original state', () => {
      const state = makeTestState({ stamina: 50 });
      const r = tryConsumeStamina(state, 0);
      expect(r.ok).toBe(true);
      expect(r.state).toBe(state);
    });

    it('consumes stamina when available and returns new state', () => {
      const state = makeTestState({ stamina: 50.5 });
      const r = tryConsumeStamina(state, 10);
      expect(r.ok).toBe(true);
      expect(r.state.stamina).toBe(40.5);
      expect(getStamina(r.state)).toBe(40);
    });

    it('fails when stamina is insufficient and leaves state untouched', () => {
      const state = makeTestState({ stamina: 9.8 });
      const r = tryConsumeStamina(state, 10);
      expect(r.ok).toBe(false);
      expect(r.state).toBe(state);
    });
  });

  describe('grantStamina', () => {
    it('returns original state when amount <= 0', () => {
      const state = makeTestState({ stamina: 50 });
      expect(grantStamina(state, 0)).toBe(state);
      expect(grantStamina(state, -5)).toBe(state);
    });

    it('adds stamina and caps at maxStamina by default', () => {
      const state = makeTestState({ stamina: 80, maxStamina: 100 });
      const granted = grantStamina(state, 30);
      expect(granted.stamina).toBe(100);
    });

    it('allows overflowing maxStamina when allowOverflow is true', () => {
      const state = makeTestState({ stamina: 80, maxStamina: 100 });
      const granted = grantStamina(state, 50, true);
      expect(granted.stamina).toBe(130);
      expect(getStamina(granted)).toBe(130);
    });
  });
});
