import { describe, it, expect } from 'vitest';
import type { GameState } from '../types/game';
import { INITIAL_STATE, createInitialHero } from '../data/initialState';
import { COMBAT_ZONE_LIST } from '../data/combatZones';
import { ITEMS_CONFIG } from '../data/items';
import { mergeSavedState } from './persistence';
import { isZoneUnlocked, startCombatUpdate, startBossBattleUpdate } from './combat';

const makeState = (overrides?: Partial<GameState>): GameState => ({
  ...INITIAL_STATE,
  ...overrides
});

const withCleared = (ids: string[]): Partial<GameState> => ({
  combat: { ...INITIAL_STATE.combat, zonesCleared: ids }
});

// 可编程 RNG：按序列依次返回
const sequenceRng = (values: number[]): (() => number) => {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
};

describe('Zone chain data (线性区域链)', () => {
  it('has at least 3 zones ordered by strictly increasing recommended level', () => {
    expect(COMBAT_ZONE_LIST.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < COMBAT_ZONE_LIST.length; i++) {
      expect(COMBAT_ZONE_LIST[i].recommendedLevel).toBeGreaterThan(COMBAT_ZONE_LIST[i - 1].recommendedLevel);
    }
  });

  it('every zone has a boss with a valid battle config', () => {
    COMBAT_ZONE_LIST.forEach(zone => {
      expect(zone.boss, zone.id).toBeDefined();
      expect(zone.boss.enemies.length, zone.id).toBeGreaterThan(0);
      expect(zone.boss.staminaCost, zone.id).toBeGreaterThan(0);
      expect(zone.boss.expReward, zone.id).toBeGreaterThan(0);
      zone.boss.drops.forEach(d => {
        expect(ITEMS_CONFIG[d.itemId], zone.id).toBeDefined();
      });
    });
  });

  it('boss-exclusive gear-series placeholders exist as equipment items', () => {
    ['ember_weapon', 'ember_armor', 'ember_trinket', 'starcore_weapon', 'starcore_armor', 'starcore_trinket'].forEach(id => {
      expect(ITEMS_CONFIG[id]).toBeDefined();
      expect(ITEMS_CONFIG[id].category).toBe('equipment');
    });
    // 最强系列仅由 BOSS 掉落：占位装备不在普通掉落表中
    COMBAT_ZONE_LIST.forEach(zone => {
      zone.drops.forEach(d => {
        expect(d.itemId.startsWith('ember_') || d.itemId.startsWith('starcore_')).toBe(false);
      });
    });
  });

  it('every boss drop table carries at least one item absent from its zone normal drops (专属掉落)', () => {
    COMBAT_ZONE_LIST.forEach(zone => {
      const normalIds = new Set(zone.drops.map(d => d.itemId));
      const bossExclusive = zone.boss.drops.some(d => !normalIds.has(d.itemId));
      expect(bossExclusive, `${zone.id} boss 掉落表无专属物品`).toBe(true);
    });
  });
});

describe('isZoneUnlocked (逐级解锁)', () => {
  it('the first zone is unlocked from the start', () => {
    const state = makeState();
    expect(isZoneUnlocked(state, COMBAT_ZONE_LIST[0].id)).toBe(true);
  });

  it('later zones are locked until the previous zone is cleared', () => {
    const state = makeState();
    expect(isZoneUnlocked(state, COMBAT_ZONE_LIST[1].id)).toBe(false);
    expect(isZoneUnlocked(state, COMBAT_ZONE_LIST[2].id)).toBe(false);

    const afterFirst = makeState(withCleared([COMBAT_ZONE_LIST[0].id]));
    expect(isZoneUnlocked(afterFirst, COMBAT_ZONE_LIST[1].id)).toBe(true);
    expect(isZoneUnlocked(afterFirst, COMBAT_ZONE_LIST[2].id)).toBe(false);
  });

  it('a previously cleared zone stays unlocked even if its predecessor is not cleared (防内容插入回锁)', () => {
    const state = makeState(withCleared([COMBAT_ZONE_LIST[1].id])); // 只通关了区2，未通关区1
    expect(isZoneUnlocked(state, COMBAT_ZONE_LIST[1].id)).toBe(true);
  });

  it('normal zone battle is also gated by unlock at the state layer', () => {
    const state = makeState();
    const locked = startCombatUpdate(state, COMBAT_ZONE_LIST[1].id);
    expect(locked.result.failure).toBe('locked');
    expect(locked.state).toBe(state);
  });

  it('unknown zone is not unlocked', () => {
    expect(isZoneUnlocked(makeState(), 'unknown_zone')).toBe(false);
  });
});

describe('startBossBattleUpdate (关底 BOSS 战)', () => {
  it('rejects unknown zone / locked zone without state change', () => {
    const unknownState = makeState();
    const unknown = startBossBattleUpdate(unknownState, 'unknown_zone');
    expect(unknown.result.failure).toBe('unknown_zone');
    expect(unknown.state).toBe(unknownState);

    const lockedState = makeState();
    const locked = startBossBattleUpdate(lockedState, COMBAT_ZONE_LIST[1].id);
    expect(locked.result.failure).toBe('locked');
    expect(locked.state).toBe(lockedState);
  });

  it('rejects battle when stamina is insufficient', () => {
    const zone = COMBAT_ZONE_LIST[0];
    const state = makeState({ stamina: zone.boss.staminaCost - 1 });
    const { state: next, result } = startBossBattleUpdate(state, zone.id);
    expect(result.failure).toBe('no_stamina');
    expect(next).toBe(state);
  });

  it('victory: boss drops + soul echoes + exp + full heal, zone cleared and next unlocked', () => {
    const zone = COMBAT_ZONE_LIST[0];
    const state = makeState({
      party: ['nova', 'soldier'],
      heroes: {
        nova: createInitialHero('nova'),
        soldier: createInitialHero('soldier')
      },
      inventory: { scrap_metal: 0 },
      soulEchoes: 0
    });
    // rng 序列：两件 boss 掉落都命中并取 maxQty + 灵魂残响取 max
    const rng = sequenceRng([0.1, 0.99, 0.1, 0.99, 0.99]);
    const { state: next, result } = startBossBattleUpdate(state, zone.id, rng);

    expect(result.settlement?.battle.victory).toBe(true);
    expect(result.failure).toBeUndefined();
    // 体力扣除
    expect(next.stamina).toBe(state.stamina - zone.boss.staminaCost);
    // boss 专属掉落入账
    expect(next.inventory.scrap_metal).toBe(4);
    expect(next.inventory.glow_fiber).toBe(3);
    // 灵魂残响 + 经验
    expect(next.soulEchoes).toBe(zone.boss.soulEchoMax);
    expect(next.heroes.nova.exp).toBe(zone.boss.expReward);
    expect(next.heroes.nova.hp).toBe(next.heroes.nova.maxHp);
    // 通关本区 → 解锁下一区
    expect(next.combat.zonesCleared).toEqual([zone.id]);
    expect(isZoneUnlocked(next, COMBAT_ZONE_LIST[1].id)).toBe(true);
    // 同一战斗场景：结算记录
    expect(next.combat.lastSettlement?.battle.victory).toBe(true);
    expect(next.logs[0].type).toBe('combat');
  });

  it('defeat: party wounded, zone NOT cleared, no drops', () => {
    // 用最弱队伍（单诺娃）打最强区域（区3）的 BOSS → 必败；先解锁区3 再挑战
    const zone3 = COMBAT_ZONE_LIST[2];
    const unlocked = makeState({
      ...withCleared([COMBAT_ZONE_LIST[0].id, COMBAT_ZONE_LIST[1].id]),
      party: ['nova'],
      heroes: { nova: createInitialHero('nova') },
      inventory: { scrap_metal: 5 }
    });
    const { state: next, result } = startBossBattleUpdate(unlocked, zone3.id);
    expect(result.settlement?.battle.victory).toBe(false);
    expect(next.heroes.nova.wounded).toBe(true);
    expect(next.heroes.nova.hp).toBe(0);
    expect(next.combat.zonesCleared).toEqual([COMBAT_ZONE_LIST[0].id, COMBAT_ZONE_LIST[1].id]); // 未通关
    expect(next.inventory.scrap_metal).toBe(5); // 无掉落
  });

  it('re-fighting a cleared boss works (刷 BOSS 掉落) without duplicating the clear record', () => {
    const zone = COMBAT_ZONE_LIST[0];
    const state = makeState({
      ...withCleared([zone.id]),
      party: ['nova', 'soldier'],
      heroes: {
        nova: createInitialHero('nova'),
        soldier: createInitialHero('soldier')
      }
    });
    const { state: next, result } = startBossBattleUpdate(state, zone.id);
    expect(result.settlement?.battle.victory).toBe(true);
    expect(next.combat.zonesCleared).toEqual([zone.id]);
  });
});

describe('Save compatibility (zonesCleared)', () => {
  it('old saves without combat fields get empty zonesCleared', () => {
    const oldSave = JSON.parse(JSON.stringify(INITIAL_STATE)) as GameState;
    delete (oldSave as Partial<GameState>).combat;
    const merged = mergeSavedState(oldSave, INITIAL_STATE);
    expect(merged.combat.zonesCleared).toEqual([]);
  });

  it('saves with combat but without zonesCleared fall back to empty', () => {
    const oldSave = JSON.parse(JSON.stringify(INITIAL_STATE)) as GameState;
    oldSave.combat = { zoneId: null, lastSettlement: null } as GameState['combat'];
    const merged = mergeSavedState(oldSave, INITIAL_STATE);
    expect(merged.combat.zonesCleared).toEqual([]);
  });

  it('preserves zonesCleared from new saves', () => {
    const save = JSON.parse(JSON.stringify(INITIAL_STATE)) as GameState;
    save.combat.zonesCleared = ['wasteland_entrance'];
    const merged = mergeSavedState(save, INITIAL_STATE);
    expect(merged.combat.zonesCleared).toEqual(['wasteland_entrance']);
  });
});
