import { describe, it, expect } from 'vitest';
import type { GameState } from '../types/game';
import { HEROES_CONFIG, HERO_CLASS_LABELS, HERO_FACTION_LABELS, STARTER_HERO_ID } from './heroes';
import { INITIAL_HEROES, createInitialHero, INITIAL_STATE } from './initialState';
import { mergeSavedState } from '../state/persistence';
import { getLevelMilestoneBonus } from './heroGrowth';

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

describe('Level milestones (stat-bonus-unification 06: 三层全覆盖)', () => {
  it('base 三件套里程碑生效且多档可叠加（攻击/生命/防御走 heroAttack 等唯一真相源）', () => {
    const nova = HEROES_CONFIG.nova; // { 10: { attack: 5 }, 20: { critRate: 0.02 } }
    expect(getLevelMilestoneBonus(nova, 5)).toEqual({});
    expect(getLevelMilestoneBonus(nova, 10)).toEqual({ attack: 5 });
    expect(getLevelMilestoneBonus(nova, 20)).toEqual({ attack: 5, critRate: 0.02 });
    expect(getLevelMilestoneBonus(nova, 30)).toEqual({ attack: 5, critRate: 0.02 });
  });

  it('元属性与特殊属性里程碑可配置（三层 21 项全覆盖）', () => {
    const custom = { ...HEROES_CONFIG.nova, levelMilestones: { 10: { strength: 2, arcaneBoost: 0.1 } } };
    expect(getLevelMilestoneBonus(custom, 10)).toEqual({ strength: 2, arcaneBoost: 0.1 });
    expect(getLevelMilestoneBonus(custom, 5)).toEqual({});
  });

  it('多档同类属性线性叠加', () => {
    const custom = { ...HEROES_CONFIG.nova, levelMilestones: { 10: { attack: 2 }, 15: { attack: 3 } } };
    expect(getLevelMilestoneBonus(custom, 14)).toEqual({ attack: 2 });
    expect(getLevelMilestoneBonus(custom, 20)).toEqual({ attack: 5 });
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

  it('merges old saves without summon economy items (falls back to defaults)', () => {
    const save = JSON.parse(JSON.stringify(INITIAL_STATE)) as GameState;
    delete (save as Partial<GameState>).summon;
    delete save.inventory.soul_echo;
    delete save.inventory.resonance_shard;
    Object.keys(save.inventory).filter(k => k.startsWith('shard_')).forEach(k => { delete save.inventory[k]; });

    const merged = mergeSavedState(save, INITIAL_STATE);
    expect(merged.inventory.soul_echo).toBe(INITIAL_STATE.inventory.soul_echo);
    expect(merged.inventory.resonance_shard).toBe(0);
    expect(merged.inventory.shard_nova).toBe(0);
    expect(merged.summon).toEqual({ pityCount: 0 });
  });
});
