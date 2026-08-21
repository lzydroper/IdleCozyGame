import { describe, it, expect } from 'vitest';
import type { BattleResult, GameState } from '../types/game';
import { INITIAL_STATE } from '../data/initialState';
import { STARTER_HERO_ID } from '../data/heroes';
import { getLevel } from '../data/regionSelectors';
import {
  rollDropEntries,
  settleLevelBattle,
  startLevelCombatUpdate,
  isRegionUnlocked,
  isLevelUnlocked,
  getClearedLevels
} from './levelCombat';

const freshState = (): GameState => JSON.parse(JSON.stringify(INITIAL_STATE)) as GameState;

const victory: BattleResult = {
  outcome: 'victory',
  victory: true,
  partyWiped: false,
  rounds: 1,
  events: []
};

const defeat: BattleResult = {
  outcome: 'defeat',
  victory: false,
  partyWiped: true,
  rounds: 1,
  events: []
};

describe('rollDropEntries', () => {
  it('always grants fixed drops', () => {
    expect(rollDropEntries([{ kind: 'fixed', itemId: 'scrap_metal', count: 3 }], () => 0)).toEqual({ scrap_metal: 3 });
  });

  it('grants chance drops below the threshold', () => {
    expect(rollDropEntries([{ kind: 'chance', itemId: 'glow_fiber', count: 2, chancePercent: 50 }], () => 0.49)).toEqual({ glow_fiber: 2 });
    expect(rollDropEntries([{ kind: 'chance', itemId: 'glow_fiber', count: 2, chancePercent: 50 }], () => 0.51)).toEqual({});
  });

  it('picks exactly one weighted pool entry', () => {
    const drops = rollDropEntries(
      [{ kind: 'weighted', pool: [{ itemId: 'a', count: 1, weight: 1 }, { itemId: 'b', count: 1, weight: 1 }] }],
      () => 0
    );
    expect(Object.keys(drops)).toHaveLength(1);
    expect(drops.a ?? drops.b).toBe(1);
  });
});

describe('settleLevelBattle', () => {
  it('grants victory drops, heals the party, and records the cleared level', () => {
    const state = freshState();
    const level = getLevel('wasteland_entrance', 'wasteland_entrance_1')!;
    const settled = settleLevelBattle(state, victory, [STARTER_HERO_ID], 'wasteland_entrance', level, () => 0);

    expect(settled.settlement.soulEchoes).toBeGreaterThan(0);
    expect(settled.settlement.expPerHero).toBe(0);
    expect(settled.nextClearedLevels.wasteland_entrance).toContain('wasteland_entrance_1');
    expect(settled.nextHeroes[STARTER_HERO_ID].hp).toBe(settled.nextHeroes[STARTER_HERO_ID].maxHp);
    expect(settled.nextInventory.soul_echo).toBeGreaterThan(0);
    expect(settled.nextInventory.exp_tome).toBeGreaterThan(0);
  });

  it('grants first-clear drops only once', () => {
    const state = freshState();
    const level = getLevel('old_town_ruins', 'old_town_ruins_2')!;
    const first = settleLevelBattle(state, victory, [STARTER_HERO_ID], 'old_town_ruins', level, () => 0);
    expect(first.settlement.drops.blueprint_ember_armory).toBe(1);

    const alreadyCleared: GameState = {
      ...state,
      combat: {
        ...state.combat,
        clearedLevels: { old_town_ruins: ['old_town_ruins_2'] }
      }
    };
    const second = settleLevelBattle(alreadyCleared, victory, [STARTER_HERO_ID], 'old_town_ruins', level, () => 0);
    expect(second.settlement.drops.blueprint_ember_armory).toBeUndefined();
  });

  it('wounds the whole party on defeat and grants no drops', () => {
    const state = freshState();
    const level = getLevel('wasteland_entrance', 'wasteland_entrance_1')!;
    const settled = settleLevelBattle(state, defeat, [STARTER_HERO_ID], 'wasteland_entrance', level, () => 0);

    expect(settled.settlement.drops).toEqual({});
    expect(settled.settlement.soulEchoes).toBe(0);
    expect(settled.settlement.woundedHeroIds).toContain(STARTER_HERO_ID);
    expect(settled.nextHeroes[STARTER_HERO_ID].wounded).toBe(true);
  });
});

describe('level unlock predicates', () => {
  it('unlocks the first level of the first region and the test region', () => {
    const state = freshState();
    expect(isRegionUnlocked(state, 'wasteland_entrance')).toBe(true);
    expect(isLevelUnlocked(state, 'wasteland_entrance', 'wasteland_entrance_1')).toBe(true);
    expect(isLevelUnlocked(state, 'equipment_test_zone', 'equipment_test_zone_1')).toBe(true);
  });

  it('unlocks the next level only after clearing the previous one', () => {
    const state = freshState();
    expect(isLevelUnlocked(state, 'wasteland_entrance', 'wasteland_entrance_2')).toBe(false);

    const cleared: GameState = {
      ...state,
      combat: {
        ...state.combat,
        clearedLevels: { wasteland_entrance: ['wasteland_entrance_1'] }
      }
    };
    expect(isLevelUnlocked(cleared, 'wasteland_entrance', 'wasteland_entrance_2')).toBe(true);
  });
});

describe('startLevelCombatUpdate', () => {
  it('rejects locked levels without consuming stamina', () => {
    const state = freshState();
    const result = startLevelCombatUpdate(state, 'wasteland_entrance', 'wasteland_entrance_2', () => 0);
    expect(result.result.failure).toBe('locked');
    expect(result.state.stamina).toBe(state.stamina);
  });

  it('rejects unknown levels', () => {
    const state = freshState();
    const result = startLevelCombatUpdate(state, 'wasteland_entrance', 'missing', () => 0);
    expect(result.result.failure).toBe('unknown_level');
  });

  it('records cleared levels after a deterministic victory with a rigged rng', () => {
    // Use the test dummy level and always-high rng to avoid depending on turn order.
    const state = freshState();
    state.party = [STARTER_HERO_ID];
    const result = startLevelCombatUpdate(state, 'wasteland_entrance', 'wasteland_entrance_1', () => 0.999);
    expect(result.result.settlement?.battle.outcome).toBe('victory');
    expect(getClearedLevels(result.state).wasteland_entrance).toContain('wasteland_entrance_1');
  });
});
