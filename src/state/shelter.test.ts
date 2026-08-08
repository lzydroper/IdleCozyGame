import { describe, it, expect } from 'vitest';
import { assignHeroToDutyUpdate } from './shelter';
import { INITIAL_STATE } from '../data/initialState';
import type { GameState } from '../types/game';

// 构造带多个英雄的测试状态
const makeTestState = (): GameState => {
  const state = structuredClone(INITIAL_STATE) as GameState;
  state.heroes = {
    nova: { ...state.heroes.nova },
    mei: { level: 1, exp: 0, hp: 120, maxHp: 120, star: 1, wounded: false, talentPoints: 0, talents: {}, awakened: false, logisticsFacilityId: null },
    zero: { level: 1, exp: 0, hp: 110, maxHp: 110, star: 1, wounded: false, talentPoints: 0, talents: {}, awakened: false, logisticsFacilityId: null },
    buster: { level: 1, exp: 0, hp: 110, maxHp: 110, star: 1, wounded: false, talentPoints: 0, talents: {}, awakened: false, logisticsFacilityId: null }
  };
  state.inventory.ration = 10; // 确保口粮充足
  return state;
};

describe('assignHeroToDutyUpdate', () => {
  describe('waterer assignment', () => {
    it('assigns hero as waterer and updates cache index', () => {
      const state = makeTestState();
      const r = assignHeroToDutyUpdate(state, 'mei', { type: 'waterer', targetId: 'greenhouse' });

      expect(r.result).toBe(true);
      expect(r.state.heroes.mei.logisticsFacilityId).toEqual({ type: 'waterer', targetId: 'greenhouse' });
      expect(r.state.shelter.assignedWatererId).toBe('mei');
    });

    it('replaces previous waterer when assigning new one', () => {
      const state = makeTestState();
      const r1 = assignHeroToDutyUpdate(state, 'mei', { type: 'waterer', targetId: 'greenhouse' });
      const r2 = assignHeroToDutyUpdate(r1.state, 'nova', { type: 'waterer', targetId: 'greenhouse' });

      expect(r2.state.heroes.mei.logisticsFacilityId).toBeNull();
      expect(r2.state.heroes.nova.logisticsFacilityId).toEqual({ type: 'waterer', targetId: 'greenhouse' });
      expect(r2.state.shelter.assignedWatererId).toBe('nova');
    });

    it('解除驻守时挂机自动关闭但保留 cropId（08）', () => {
      const state = makeTestState();
      state.greenhouse.autoFarm = { enabled: true, cropId: 'glow_grass' };
      const r1 = assignHeroToDutyUpdate(state, 'mei', { type: 'waterer', targetId: 'greenhouse' });
      const r2 = assignHeroToDutyUpdate(r1.state, 'mei', null); // 解除驻守

      expect(r2.result).toBe(true);
      expect(r2.state.shelter.assignedWatererId).toBeNull();
      expect(r2.state.greenhouse.autoFarm.enabled).toBe(false);
      expect(r2.state.greenhouse.autoFarm.cropId).toBe('glow_grass'); // 保留选种
    });
  });

  describe('facility assignment', () => {
    it('assigns hero to a facility unit', () => {
      const state = makeTestState();
      const r = assignHeroToDutyUpdate(state, 'nova', { type: 'facility', targetId: 'smelter_0' });

      expect(r.result).toBe(true);
      expect(r.state.heroes.nova.logisticsFacilityId).toEqual({ type: 'facility', targetId: 'smelter_0' });
    });

    it('replaces previous garrison hero when assigning new one to same unit', () => {
      const state = makeTestState();
      const r1 = assignHeroToDutyUpdate(state, 'nova', { type: 'facility', targetId: 'smelter_0' });
      const r2 = assignHeroToDutyUpdate(r1.state, 'buster', { type: 'facility', targetId: 'smelter_0' });

      expect(r2.state.heroes.nova.logisticsFacilityId).toBeNull();
      expect(r2.state.heroes.buster.logisticsFacilityId).toEqual({ type: 'facility', targetId: 'smelter_0' });
    });

    it('rejects invalid facility targetId', () => {
      const state = makeTestState();
      const r = assignHeroToDutyUpdate(state, 'nova', { type: 'facility', targetId: 'invalid' });
      expect(r.result).toBe(false);
    });

    it('rejects out-of-range unit index', () => {
      const state = makeTestState();
      const r = assignHeroToDutyUpdate(state, 'nova', { type: 'facility', targetId: 'smelter_99' });
      expect(r.result).toBe(false);
    });
  });

  describe('exclusivity (single duty)', () => {
    it('switching from waterer to facility clears waterer cache', () => {
      const state = makeTestState();
      const r1 = assignHeroToDutyUpdate(state, 'mei', { type: 'waterer', targetId: 'greenhouse' });
      const r2 = assignHeroToDutyUpdate(r1.state, 'mei', { type: 'facility', targetId: 'smelter_0' });

      expect(r2.state.heroes.mei.logisticsFacilityId).toEqual({ type: 'facility', targetId: 'smelter_0' });
      expect(r2.state.shelter.assignedWatererId).toBeNull();
    });

    it('switching from explorer to facility clears explorer cache and expedition', () => {
      const state = makeTestState();
      const r1 = assignHeroToDutyUpdate(state, 'zero', { type: 'explorer', targetId: 'radar_station' });
      const r2 = assignHeroToDutyUpdate(r1.state, 'zero', { type: 'facility', targetId: 'smelter_0' });

      expect(r2.state.heroes.zero.logisticsFacilityId).toEqual({ type: 'facility', targetId: 'smelter_0' });
      expect(r2.state.shelter.assignedExplorerId).toBeNull();
      expect(r2.state.shelter.expedition.locationId).toBeNull();
    });
  });

  describe('duty release (null)', () => {
    it('releases waterer duty', () => {
      const state = makeTestState();
      const r1 = assignHeroToDutyUpdate(state, 'mei', { type: 'waterer', targetId: 'greenhouse' });
      const r2 = assignHeroToDutyUpdate(r1.state, 'mei', null);

      expect(r2.result).toBe(true);
      expect(r2.state.heroes.mei.logisticsFacilityId).toBeNull();
      expect(r2.state.shelter.assignedWatererId).toBeNull();
    });

    it('releases explorer duty and resets expedition', () => {
      const state = makeTestState();
      const r1 = assignHeroToDutyUpdate(state, 'zero', { type: 'explorer', targetId: 'radar_station' });
      const r2 = assignHeroToDutyUpdate(r1.state, 'zero', null);

      expect(r2.state.heroes.zero.logisticsFacilityId).toBeNull();
      expect(r2.state.shelter.assignedExplorerId).toBeNull();
      expect(r2.state.shelter.expedition.locationId).toBeNull();
      expect(r2.state.shelter.expedition.startTime).toBeNull();
      expect(r2.state.shelter.expedition.lastScavengeTime).toBeNull();
    });

    it('returns false when hero has no duty to release', () => {
      const state = makeTestState();
      const r = assignHeroToDutyUpdate(state, 'mei', null);
      expect(r.result).toBe(false);
    });
  });

  describe('explorer assignment', () => {
    it('assigns explorer and initializes expedition state', () => {
      const state = makeTestState();
      const r = assignHeroToDutyUpdate(state, 'zero', { type: 'explorer', targetId: 'radar_station' });

      expect(r.result).toBe(true);
      expect(r.state.heroes.zero.logisticsFacilityId).toEqual({ type: 'explorer', targetId: 'radar_station' });
      expect(r.state.shelter.assignedExplorerId).toBe('zero');
      expect(r.state.shelter.expedition.locationId).toBe('radar_station');
      expect(r.state.shelter.expedition.startTime).toBeGreaterThan(0);
      expect(r.state.shelter.expedition.lastScavengeTime).toBeGreaterThan(0);
    });

    it('rejects invalid location', () => {
      const state = makeTestState();
      const r = assignHeroToDutyUpdate(state, 'zero', { type: 'explorer', targetId: 'nonexistent' });
      expect(r.result).toBe(false);
    });
  });

  describe('invalid inputs', () => {
    it('rejects empty heroId', () => {
      const state = makeTestState();
      const r = assignHeroToDutyUpdate(state, '', { type: 'waterer', targetId: 'greenhouse' });
      expect(r.result).toBe(false);
    });

    it('rejects unknown hero', () => {
      const state = makeTestState();
      const r = assignHeroToDutyUpdate(state, 'unknown', { type: 'waterer', targetId: 'greenhouse' });
      expect(r.result).toBe(false);
    });
  });

  describe('expedition ration and class/faction gates (ticket 03)', () => {
    it('deducts rationCost on explorer assignment', () => {
      const state = makeTestState();
      const initialRations = state.inventory.ration;
      const r = assignHeroToDutyUpdate(state, 'zero', { type: 'explorer', targetId: 'radar_station' });

      expect(r.result).toBe(true);
      // radar_station has rationCost: 1
      expect(r.state.inventory.ration).toBe(initialRations - 1);
    });

    it('rejects explorer assignment when rations insufficient', () => {
      const state = makeTestState();
      state.inventory.ration = 0;
      const r = assignHeroToDutyUpdate(state, 'zero', { type: 'explorer', targetId: 'radar_station' });

      expect(r.result).toBe(false);
      expect(r.state.shelter.expedition.locationId).toBeNull();
    });

    it('rejects heroClass mismatch (ruined_armory requires guardian)', () => {
      const state = makeTestState();
      // nova is attacker, not guardian -> should be rejected
      const r = assignHeroToDutyUpdate(state, 'nova', { type: 'explorer', targetId: 'ruined_armory' });

      expect(r.result).toBe(false);
    });

    it('rejects faction mismatch (subway_station requires soulseal)', () => {
      const state = makeTestState();
      // nova is mechanical, not soulseal -> should be rejected
      const r = assignHeroToDutyUpdate(state, 'nova', { type: 'explorer', targetId: 'subway_station' });

      expect(r.result).toBe(false);
    });

    it('accepts matching faction (zero is soulseal for subway_station)', () => {
      const state = makeTestState();
      const r = assignHeroToDutyUpdate(state, 'zero', { type: 'explorer', targetId: 'subway_station' });

      expect(r.result).toBe(true);
      expect(r.state.heroes.zero.logisticsFacilityId).toEqual({ type: 'explorer', targetId: 'subway_station' });
    });

    it('accepts matching heroClass (soldier is guardian for ruined_armory)', () => {
      const state = makeTestState();
      state.heroes.soldier = { level: 1, exp: 0, hp: 160, maxHp: 160, star: 1, wounded: false, talentPoints: 0, talents: {}, awakened: false, logisticsFacilityId: null };
      const r = assignHeroToDutyUpdate(state, 'soldier', { type: 'explorer', targetId: 'ruined_armory' });

      expect(r.result).toBe(true);
    });
  });
});
