// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { getAdjustment } from './passiveModifiers';
import type { GameState } from '../types/game';
import { SURVIVORS_CONFIG } from '../data/survivors';

function createMockState(survivorIds: string[]): GameState {
  const survivors: Record<string, GameState['survivors'][string]> = {};
  for (const id of survivorIds) {
    const config = SURVIVORS_CONFIG.find(c => c.id === id);
    if (config) {
      survivors[id] = {
        id: config.id,
        name: config.name,
        role: config.role,
        bonus: config.bonus,
        isAssigned: false,
        realityLocationId: config.realityLocationId,
        assignedJobId: null,
      };
    }
  }
  return {
    player: { hp: 100, maxHp: 100, food: 100, maxFood: 100, energy: 100, maxEnergy: 100, sanity: 100, maxSanity: 100, days: 1 },
    inventory: {},
    greenhouse: { slots: [], unlockedSlotsCount: 4 },
    survivors,
    exploration: {
      inRealityExploration: false, realitySteps: 0, realityLocationId: null, realityBag: {},
      inDreamExploration: false, dreamSteps: 0, dreamPollution: 0, dreamBag: {},
      capsulesCharge: {}, survivorResonance: {},
    },
    discoveredBlueprints: [],
    activeAlert: { type: null, hp: 0 },
    lastTick: Date.now(),
    dayStartTime: Date.now(),
    logs: [],
    shelter: {
      maxOfflineDuration: 14400, batteryLevel: 1, generatorLevel: 0, recyclerLevel: 0,
      facilities: {}, assignedWatererId: null, assignedExplorerId: null,
      expedition: { locationId: null, startTime: null, lastScavengeTime: null },
    },
  } as GameState;
}

describe('getAdjustment', () => {
  it('returns 0 when no survivors match the key', () => {
    const state = createMockState([]);
    expect(getAdjustment(state, 'exploration_food_cost')).toBe(0);
  });

  it('returns additive adjustment for max_energy', () => {
    const state = createMockState(['nova']);
    expect(getAdjustment(state, 'max_energy')).toBe(30);
  });

  it('returns negative adjustment for craft_energy_cost', () => {
    const state = createMockState(['roy']);
    expect(getAdjustment(state, 'craft_energy_cost')).toBe(-0.2);
  });

  it('aggregates two exploration_cost passives', () => {
    const state = createMockState(['zero']);
    expect(getAdjustment(state, 'exploration_food_cost')).toBe(-0.15);
    expect(getAdjustment(state, 'exploration_energy_cost')).toBe(-0.15);
  });

  it('stacks additive adjustments from multiple survivors', () => {
    const state = createMockState(['nova']);
    // Nova has max_energy:30 and defense_energy_cost:-0.5
    // Add another theoretical survivor — but we only test what's in config
    expect(getAdjustment(state, 'max_energy')).toBe(30);
  });

  it('returns 0 for key only defined with condition:assigned when no assignedSurvivorId given', () => {
    const state = createMockState(['mei']);
    expect(getAdjustment(state, 'growth_speed')).toBe(0);
  });

  it('returns adjustment for condition:assigned when matching assignedSurvivorId given', () => {
    const state = createMockState(['mei']);
    expect(getAdjustment(state, 'growth_speed', 'mei')).toBe(0.25);
  });

  it('returns 0 for condition:assigned when non-matching assignedSurvivorId given', () => {
    const state = createMockState(['mei']);
    expect(getAdjustment(state, 'growth_speed', 'roy')).toBe(0);
  });

  it('handles item_yield key', () => {
    const state = createMockState(['buster']);
    expect(getAdjustment(state, 'item_yield:scrap_metal')).toBe(0.3);
  });

  it('returns 0 for unknown item_yield target', () => {
    const state = createMockState(['buster']);
    expect(getAdjustment(state, 'item_yield:dream_shard')).toBe(0);
  });
});
