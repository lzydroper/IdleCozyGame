import { describe, it, expect } from 'vitest';
import type { GameState } from '../types/game';
import { INITIAL_STATE, createInitialHero } from '../data/initialState';
import { REALITY_EVENTS } from '../data/realityEvents';
import { ITEMS_CONFIG } from '../data/items';
import { COMBAT_CONFIG } from '../data/combatConfig';
import { resolveEncounterBattleUpdate, fleeEncounterUpdate } from './combat';

const makeState = (overrides?: Partial<GameState>): GameState => ({
  ...INITIAL_STATE,
  ...overrides
});

const inExploration = (overrides: Partial<GameState['exploration']>): GameState['exploration'] => ({
  ...INITIAL_STATE.exploration,
  inRealityExploration: true,
  realityEncounterId: null,
  ...overrides
});

// 可编程 RNG：按序列依次返回
const sequenceRng = (values: number[]): (() => number) => {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
};

describe('Encounter events data (战斗遭遇事件池)', () => {
  it('all encounter events carry a valid battle config', () => {
    const encounters = Object.values(REALITY_EVENTS).filter(e => e.type === 'encounter');
    expect(encounters.length).toBeGreaterThanOrEqual(3);
    encounters.forEach(evt => {
      expect(evt.battle, evt.id).toBeDefined();
      expect(evt.battle!.enemies.length, evt.id).toBeGreaterThan(0);
      expect(evt.battle!.expReward, evt.id).toBeGreaterThan(0);
      evt.battle!.enemies.forEach(en => {
        expect(en.hp).toBeGreaterThan(0);
        expect(en.attack).toBeGreaterThan(0);
      });
      evt.battle!.drops.forEach(d => {
        expect(ITEMS_CONFIG[d.itemId], evt.id).toBeDefined();
      });
    });
  });

  it('encounter events are choice-less (enter battle scene instead of a card)', () => {
    Object.values(REALITY_EVENTS)
      .filter(e => e.type === 'encounter')
      .forEach(evt => {
        expect(evt.choices).toBeUndefined();
      });
  });

  it('every non-encounter event has choices (否则探索会卡死)', () => {
    Object.values(REALITY_EVENTS)
      .filter(e => e.type !== 'encounter')
      .forEach(evt => {
        expect(evt.choices, evt.id).toBeDefined();
      });
  });
});

describe('resolveEncounterBattleUpdate (探索战斗汇合)', () => {
  it('rejects unknown event without state change', () => {
    const state = makeState();
    const { state: next, result } = resolveEncounterBattleUpdate(state, 'not_an_event');
    expect(result.failure).toBe('unknown_event');
    expect(next).toBe(state);
  });

  it('rejects battle when party is empty', () => {
    const state = makeState({
      party: [],
      exploration: inExploration({ realityEncounterId: 'encounter_wasteland_pack' })
    });
    const { state: next, result } = resolveEncounterBattleUpdate(state, 'encounter_wasteland_pack');
    expect(result.failure).toBe('no_party');
    expect(next).toBe(state);
  });

  it('rejects battle when a party hero is wounded', () => {
    const state = makeState({
      party: ['nova'],
      heroes: { nova: { ...createInitialHero('nova'), wounded: true } },
      exploration: inExploration({ realityEncounterId: 'encounter_wasteland_pack' })
    });
    const { state: next, result } = resolveEncounterBattleUpdate(state, 'encounter_wasteland_pack');
    expect(result.failure).toBe('wounded');
    expect(next).toBe(state);
  });

  it('rejects battle when stamina is insufficient (ADR-0002 战斗耗体力)', () => {
    const state = makeState({
      stamina: COMBAT_CONFIG.encounterStaminaCost - 1,
      party: ['nova'],
      heroes: { nova: createInitialHero('nova') },
      exploration: inExploration({ realityEncounterId: 'encounter_wasteland_pack' })
    });
    const { state: next, result } = resolveEncounterBattleUpdate(state, 'encounter_wasteland_pack');
    expect(result.failure).toBe('no_stamina');
    expect(next).toBe(state);
  });

  it('victory: grants exp + full heal, drops into realityBag, exploration continues, stamina consumed', () => {
    const state = makeState({
      party: ['nova', 'soldier'],
      heroes: {
        nova: { ...createInitialHero('nova'), hp: 30 },
        soldier: createInitialHero('soldier')
      },
      exploration: inExploration({
        realitySteps: 1,
        realityBag: { scrap_metal: 2 }, // 已获战利品
        realityEncounterId: 'encounter_wasteland_pack'
      })
    });
    // rng 序列：两件掉落都命中并取 maxQty
    const rng = sequenceRng([0.1, 0.99, 0.1, 0.99]);
    const { state: next, result } = resolveEncounterBattleUpdate(state, 'encounter_wasteland_pack', rng);

    expect(result.settlement?.battle.victory).toBe(true);
    // 经验 + 满血
    expect(next.heroes.nova.exp).toBe(15);
    expect(next.heroes.soldier.exp).toBe(15);
    expect(next.heroes.nova.hp).toBe(next.heroes.nova.maxHp);
    // 掉落进探索临时背囊（与已有战利品合并）
    expect(next.exploration.realityBag.scrap_metal).toBe(2 + 2);
    expect(next.exploration.realityBag.glow_fiber).toBe(2);
    // 胜利继续探索：步数 +1，遭遇清除
    expect(next.exploration.inRealityExploration).toBe(true);
    expect(next.exploration.realitySteps).toBe(2);
    expect(next.exploration.realityEncounterId).toBeNull();
    // 探索遭遇消耗独立体力（ADR-0002）
    expect(next.stamina).toBe(state.stamina - COMBAT_CONFIG.encounterStaminaCost);
    // 同一战斗场景：结算写入 combat.lastSettlement
    expect(next.combat.lastSettlement?.battle.victory).toBe(true);
    expect(next.combat.lastSettlement?.expPerHero).toBe(15);
  });

  it('defeat: wounds the party, exploration ends and loot is merged into inventory (不丢失)', () => {
    const state = makeState({
      inventory: { scrap_metal: 1, ration: 2 },
      party: ['nova'],
      heroes: { nova: createInitialHero('nova') },
      exploration: inExploration({
        realitySteps: 2,
        realityLocationId: 'radar_station',
        realityBag: { scrap_metal: 5, glow_fiber: 1 }, // 已获战利品
        realityEncounterId: 'encounter_workshop_horror'
      })
    });
    const { state: next, result } = resolveEncounterBattleUpdate(state, 'encounter_workshop_horror');

    expect(result.settlement?.battle.victory).toBe(false);
    // 全员重伤
    expect(next.heroes.nova.wounded).toBe(true);
    expect(next.heroes.nova.hp).toBe(0);
    // 探索终止
    expect(next.exploration.inRealityExploration).toBe(false);
    expect(next.exploration.realitySteps).toBe(0);
    expect(next.exploration.realityLocationId).toBeNull();
    expect(next.exploration.realityEventId).toBeNull();
    expect(next.exploration.realityEncounterId).toBeNull();
    // 战利品保留：临时背囊并入避难所库存
    expect(next.inventory.scrap_metal).toBe(1 + 5);
    expect(next.inventory.glow_fiber).toBe(1);
    expect(next.inventory.ration).toBe(2);
    expect(next.exploration.realityBag).toEqual({});
    // 战败无经验无掉落，但体力照常消耗
    expect(next.heroes.nova.exp).toBe(0);
    expect(next.combat.lastSettlement?.expPerHero).toBe(0);
    expect(next.stamina).toBe(state.stamina - COMBAT_CONFIG.encounterStaminaCost);
  });

  it('flee: skips the encounter without cost, exploration continues', () => {
    const state = makeState({
      stamina: 0, // 体力不足也可撤离
      party: ['nova'],
      heroes: { nova: createInitialHero('nova') },
      exploration: inExploration({
        realitySteps: 3,
        realityBag: { scrap_metal: 2 },
        realityEncounterId: 'encounter_ruin_raiders'
      })
    });
    const { state: next, result } = fleeEncounterUpdate(state);
    expect(result).toBe(true);
    expect(next.exploration.realityEncounterId).toBeNull();
    expect(next.exploration.realitySteps).toBe(4);
    expect(next.exploration.inRealityExploration).toBe(true);
    expect(next.exploration.realityBag.scrap_metal).toBe(2);
    expect(next.stamina).toBe(0);
    expect(next.heroes.nova.wounded).toBe(false);
    expect(next.logs[0].type).toBe('combat');
  });

  it('flee fails without a pending encounter', () => {
    const state = makeState();
    const { state: next, result } = fleeEncounterUpdate(state);
    expect(result).toBe(false);
    expect(next).toBe(state);
  });
});
