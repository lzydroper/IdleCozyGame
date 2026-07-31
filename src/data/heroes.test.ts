import { describe, it, expect } from 'vitest';
import type { GameState } from '../types/game';
import { HEROES_CONFIG, HERO_CLASS_LABELS, HERO_FACTION_LABELS, STARTER_HERO_ID } from './heroes';
import { INITIAL_HEROES, createInitialHero, INITIAL_STATE } from './initialState';
import { mergeSavedState } from '../state/persistence';

describe('Heroes data config', () => {
  it('has 9 heroes with valid class and faction labels', () => {
    const ids = Object.keys(HEROES_CONFIG);
    expect(ids).toHaveLength(9);
    ids.forEach(id => {
      const c = HEROES_CONFIG[id];
      expect(c.id).toBe(id);
      expect(HERO_CLASS_LABELS[c.heroClass]).toBeDefined();
      expect(HERO_FACTION_LABELS[c.faction]).toBeDefined();
      expect(c.baseHp).toBeGreaterThan(0);
      expect(c.baseAttack).toBeGreaterThan(0);
    });
  });

  it('covers all three classes and all six factions', () => {
    const classes = new Set(Object.values(HEROES_CONFIG).map(c => c.heroClass));
    const factions = new Set(Object.values(HEROES_CONFIG).map(c => c.faction));
    expect(classes.size).toBe(3);
    expect(factions.size).toBe(6);
  });
});

describe('Initial heroes', () => {
  it('grants the starter hero Nova on a new game', () => {
    const nova = INITIAL_HEROES[STARTER_HERO_ID];
    expect(nova).toBeDefined();
    expect(nova.level).toBe(1);
    expect(nova.exp).toBe(0);
    expect(nova.star).toBe(1);
    expect(nova.wounded).toBe(false);
    expect(nova.hp).toBe(HEROES_CONFIG[STARTER_HERO_ID].baseHp);
    expect(nova.maxHp).toBe(HEROES_CONFIG[STARTER_HERO_ID].baseHp);
  });

  it('createInitialHero throws for unknown config id', () => {
    expect(() => createInitialHero('unknown_hero')).toThrow();
  });
});

describe('Save compatibility', () => {
  // 模拟旧版存档：无 heroes 字段（JSON 场景）
  const buildOldSave = (): GameState => {
    const save = JSON.parse(JSON.stringify(INITIAL_STATE)) as GameState;
    delete (save as Partial<GameState>).heroes;
    return save;
  };

  it('merges old saves without heroes field (falls back to starter hero)', () => {
    const merged = mergeSavedState(buildOldSave(), INITIAL_STATE);
    expect(merged.heroes[STARTER_HERO_ID]).toBeDefined();
    expect(Object.keys(merged.heroes)).toEqual([STARTER_HERO_ID]);
  });

  it('merges old saves with empty heroes object (falls back to starter hero)', () => {
    const oldSave = buildOldSave();
    oldSave.heroes = {};
    const merged = mergeSavedState(oldSave, INITIAL_STATE);
    expect(merged.heroes[STARTER_HERO_ID]).toBeDefined();
  });

  it('preserves heroes from new saves', () => {
    const newSave = buildOldSave();
    newSave.heroes = {
      nova: createInitialHero('nova'),
      roy: createInitialHero('roy')
    };
    const merged = mergeSavedState(newSave, INITIAL_STATE);
    expect(Object.keys(merged.heroes)).toEqual(['nova', 'roy']);
  });

  it('merges old saves without summon economy fields (falls back to defaults)', () => {
    const save = JSON.parse(JSON.stringify(INITIAL_STATE)) as GameState;
    delete (save as Partial<GameState>).soulEchoes;
    delete (save as Partial<GameState>).resonanceShards;
    delete (save as Partial<GameState>).soulShards;
    delete (save as Partial<GameState>).summon;

    const merged = mergeSavedState(save, INITIAL_STATE);
    expect(merged.soulEchoes).toBe(INITIAL_STATE.soulEchoes);
    expect(merged.resonanceShards).toBe(0);
    expect(merged.soulShards).toEqual({});
    expect(merged.summon).toEqual({ pityCount: 0 });
  });
});
