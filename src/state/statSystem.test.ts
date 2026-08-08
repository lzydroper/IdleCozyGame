import { describe, it, expect } from 'vitest';
import { calculateEntityStats, aggregateModifiers, aggregateModifiersBySource, getStatSourcesByStat, formatModifiers, DEFAULT_PRIMARY_ATTRIBUTES } from './statSystem';
import type { BaseAttributes, PrimaryAttributes } from './statSystem';

describe('statSystem - Primary Attribute Bonus Engine', () => {
  const sampleBaseStats: BaseAttributes = {
    attack: 100,
    defense: 50,
    maxHp: 1000,
    maxMp: 200,
    critRate: 0.05, // 5%
    critDmg: 1.50   // 150%
  };

  it('calculates stats correctly with zero primary attributes', () => {
    const primaryStats: PrimaryAttributes = {
      strength: 0,
      constitution: 0,
      agility: 0,
      intelligence: 0,
      willpower: 0,
      transcendence: 0
    };

    const result = calculateEntityStats({
      baseAttributes: sampleBaseStats,
      primaryAttributes: primaryStats
    });

    expect(result.attack).toBe(100);
    expect(result.defense).toBe(50);
    expect(result.maxHp).toBe(1000);
    expect(result.maxMp).toBe(200);
    expect(result.critRate).toBe(0.05);
    expect(result.critDmg).toBe(1.50);
  });

  it('correctly applies Strength bonuses to Attack and Crit Damage', () => {
    const primaryStats: PrimaryAttributes = {
      ...DEFAULT_PRIMARY_ATTRIBUTES,
      strength: 10 // +20 Attack, +5% CritDmg
    };

    const result = calculateEntityStats({
      baseAttributes: sampleBaseStats,
      primaryAttributes: primaryStats
    });

    expect(result.attack).toBe(120); // 100 + 10 * 2
    expect(result.critDmg).toBeCloseTo(1.55); // 1.50 + 10 * 0.005
  });

  it('correctly applies Constitution bonuses to Max HP and Defense', () => {
    const primaryStats: PrimaryAttributes = {
      ...DEFAULT_PRIMARY_ATTRIBUTES,
      constitution: 20 // +200 Max HP, +20 Defense
    };

    const result = calculateEntityStats({
      baseAttributes: sampleBaseStats,
      primaryAttributes: primaryStats
    });

    expect(result.maxHp).toBe(1200); // 1000 + 20 * 10
    expect(result.defense).toBe(70);   // 50 + 20 * 1
  });

  it('correctly applies Agility bonuses to Crit Rate and Crit Resist', () => {
    const primaryStats: PrimaryAttributes = {
      ...DEFAULT_PRIMARY_ATTRIBUTES,
      agility: 25 // +5% CritRate, +2.5% CritResist
    };

    const result = calculateEntityStats({
      baseAttributes: sampleBaseStats,
      primaryAttributes: primaryStats
    });

    expect(result.critRate).toBeCloseTo(0.10); // 0.05 + 25 * 0.002
    expect(result.critResist).toBeCloseTo(0.025); // 25 * 0.001
  });

  it('correctly applies Intelligence bonuses to Max MP and Arcane Boost', () => {
    const primaryStats: PrimaryAttributes = {
      ...DEFAULT_PRIMARY_ATTRIBUTES,
      intelligence: 30 // +150 Max MP, +15% ArcaneBoost
    };

    const result = calculateEntityStats({
      baseAttributes: sampleBaseStats,
      primaryAttributes: primaryStats
    });

    expect(result.maxMp).toBe(350); // 200 + 30 * 5
    expect(result.specialAttributes.arcaneBoost).toBeCloseTo(0.15); // 30 * 0.005
  });

  it('calculates defense percentage reduction correctly', () => {
    const result = calculateEntityStats({
      baseAttributes: { ...sampleBaseStats, defense: 100 },
      primaryAttributes: DEFAULT_PRIMARY_ATTRIBUTES
    });

    // Damage taken multiplier = 100 / (100 + 100) = 0.5 -> 50% damage reduction
    expect(result.damageReduction).toBeCloseTo(0.50);
  });
});

describe('statSystem - Modifier Pipeline (stat-bonus-unification 01)', () => {
  const base = {
    attack: 100,
    defense: 50,
    maxHp: 1000,
    maxMp: 200,
    critRate: 0.05,
    critDmg: 1.5
  };

  describe('aggregateModifiers', () => {
    it('sums flat and percent separately per stat (percent additive)', () => {
      const agg = aggregateModifiers([
        { stat: 'attack', kind: 'percent', value: 0.10 },
        { stat: 'attack', kind: 'percent', value: 0.05 },
        { stat: 'attack', kind: 'flat', value: 15 },
        { stat: 'maxHp', kind: 'percent', value: 0.08 }
      ]);
      expect(agg.attack).toBeDefined();
      expect(agg.attack!.flat).toBe(15);
      expect(agg.attack!.percent).toBeCloseTo(0.15);
      expect(agg.maxHp!.flat).toBe(0);
      expect(agg.maxHp!.percent).toBe(0.08);
    });

    it('returns empty map for no modifiers', () => {
      expect(aggregateModifiers([])).toEqual({});
    });
  });

  describe('calculateEntityStats with modifiers', () => {
    it('applies flat first then percent: (base + flat) * (1 + percent)', () => {
      const result = calculateEntityStats(
        { baseAttributes: base, primaryAttributes: DEFAULT_PRIMARY_ATTRIBUTES },
        [
          { stat: 'attack', kind: 'flat', value: 10 },
          { stat: 'attack', kind: 'percent', value: 0.10 }
        ]
      );
      expect(result.attack).toBeCloseTo(121); // (100 + 10) * 1.1
    });

    it('adds percent modifiers from multiple sources', () => {
      const result = calculateEntityStats(
        { baseAttributes: base, primaryAttributes: DEFAULT_PRIMARY_ATTRIBUTES },
        [
          { stat: 'attack', kind: 'percent', value: 0.10 },
          { stat: 'attack', kind: 'percent', value: 0.05 }
        ]
      );
      expect(result.attack).toBeCloseTo(115); // 100 * 1.15
    });

    it('converts primary modifiers through the scaling config (strength +5 -> attack +10)', () => {
      const result = calculateEntityStats(
        { baseAttributes: base, primaryAttributes: DEFAULT_PRIMARY_ATTRIBUTES },
        [{ stat: 'strength', kind: 'flat', value: 5 }]
      );
      expect(result.attack).toBe(110); // 100 + 5 * 2
      expect(result.critDmg).toBeCloseTo(1.525); // 1.5 + 5 * 0.005
    });

    it('scales primary percent by (1 + percent) on the converted value', () => {
      const result = calculateEntityStats(
        { baseAttributes: base, primaryAttributes: DEFAULT_PRIMARY_ATTRIBUTES },
        [
          { stat: 'strength', kind: 'flat', value: 5 },
          { stat: 'strength', kind: 'percent', value: 0.10 }
        ]
      );
      expect(result.attack).toBeCloseTo(111); // 100 + 5 * 1.1 * 2
    });

    it('clamps critRate at the upper bound (final-level clamp)', () => {
      const result = calculateEntityStats(
        { baseAttributes: base, primaryAttributes: DEFAULT_PRIMARY_ATTRIBUTES },
        [{ stat: 'critRate', kind: 'percent', value: 100 }] // +10000% -> clamped to 100%
      );
      expect(result.critRate).toBe(1.0);
    });

    it('clamps critDmg at the lower bound', () => {
      const result = calculateEntityStats(
        { baseAttributes: base, primaryAttributes: DEFAULT_PRIMARY_ATTRIBUTES },
        [{ stat: 'critDmg', kind: 'percent', value: -0.9 }] // 1.5 * 0.1 = 0.15 -> clamped to 1.0
      );
      expect(result.critDmg).toBe(1.0);
    });

    it('applies special attribute modifiers (arcaneBoost flat)', () => {
      const result = calculateEntityStats(
        { baseAttributes: base, primaryAttributes: DEFAULT_PRIMARY_ATTRIBUTES },
        [{ stat: 'arcaneBoost', kind: 'flat', value: 0.1 }]
      );
      expect(result.specialAttributes.arcaneBoost).toBeCloseTo(0.1);
    });

    it('applies willpower modifiers to derived reductions (agility/willpower path)', () => {
      const result = calculateEntityStats(
        { baseAttributes: base, primaryAttributes: DEFAULT_PRIMARY_ATTRIBUTES },
        [{ stat: 'agility', kind: 'flat', value: 25 }]
      );
      expect(result.critRate).toBeCloseTo(0.10); // 0.05 + 25 * 0.002
      expect(result.critResist).toBeCloseTo(0.025); // 25 * 0.001
    });

    it('leaves result unchanged with no modifiers (backwards compatible)', () => {
      const withMods = calculateEntityStats({ baseAttributes: base, primaryAttributes: DEFAULT_PRIMARY_ATTRIBUTES }, []);
      const without = calculateEntityStats({ baseAttributes: base, primaryAttributes: DEFAULT_PRIMARY_ATTRIBUTES });
      expect(withMods).toEqual(without);
    });
  });

  describe('formatModifiers', () => {
    it('merges flat and percent of the same stat into one entry', () => {
      expect(formatModifiers([
        { stat: 'attack', kind: 'flat', value: 5 },
        { stat: 'attack', kind: 'percent', value: 0.10 }
      ])).toBe('攻击 +5、+10%');
    });

    it('shows percent-display stats in percent units (critRate flat 0.02 -> +2%)', () => {
      expect(formatModifiers([
        { stat: 'critRate', kind: 'flat', value: 0.02 }
      ])).toBe('暴击率 +2%');
    });

    it('shows negative modifiers with minus sign', () => {
      expect(formatModifiers([
        { stat: 'attack', kind: 'flat', value: -5 }
      ])).toBe('攻击 -5');
    });

    it('formats multiple stats joined by 、', () => {
      expect(formatModifiers([
        { stat: 'attack', kind: 'percent', value: 0.10 },
        { stat: 'defense', kind: 'percent', value: 0.10 }
      ])).toBe('攻击 +10%、防御 +10%');
    });
  });
});

describe('statSystem - Source-Grouped Aggregation (detailed-stats-panel-rework 01)', () => {
  describe('aggregateModifiersBySource', () => {
    it('groups modifiers by source, summing flat/percent per stat within each source', () => {
      const grouped = aggregateModifiersBySource([
        { stat: 'attack', kind: 'flat', value: 10, source: '废土利刃' },
        { stat: 'attack', kind: 'percent', value: 0.05, source: '废土利刃' },
        { stat: 'attack', kind: 'flat', value: 5, source: '钢铁壁垒' },
        { stat: 'maxHp', kind: 'percent', value: 0.10, source: '废土利刃' }
      ]);

      expect(grouped['废土利刃']).toBeDefined();
      expect(grouped['废土利刃'].attack!.flat).toBe(10);
      expect(grouped['废土利刃'].attack!.percent).toBeCloseTo(0.05);
      expect(grouped['废土利刃'].maxHp!.percent).toBeCloseTo(0.10);

      expect(grouped['钢铁壁垒']).toBeDefined();
      expect(grouped['钢铁壁垒'].attack!.flat).toBe(5);
    });

    it('assigns modifiers without source to "未知来源"', () => {
      const grouped = aggregateModifiersBySource([
        { stat: 'attack', kind: 'flat', value: 10 },
        { stat: 'defense', kind: 'percent', value: 0.05, source: '装备' }
      ]);

      expect(grouped['未知来源']).toBeDefined();
      expect(grouped['未知来源'].attack!.flat).toBe(10);
      expect(grouped['装备']).toBeDefined();
      expect(grouped['装备'].defense!.percent).toBeCloseTo(0.05);
    });

    it('returns empty object for no modifiers', () => {
      expect(aggregateModifiersBySource([])).toEqual({});
    });

    it('keeps sources separate even for the same stat', () => {
      const grouped = aggregateModifiersBySource([
        { stat: 'attack', kind: 'flat', value: 10, source: '来源A' },
        { stat: 'attack', kind: 'flat', value: 20, source: '来源B' }
      ]);

      expect(grouped['来源A'].attack!.flat).toBe(10);
      expect(grouped['来源B'].attack!.flat).toBe(20);
    });

    it('sums same-source same-stat flat and percent independently', () => {
      const grouped = aggregateModifiersBySource([
        { stat: 'attack', kind: 'flat', value: 5, source: '来源A' },
        { stat: 'attack', kind: 'flat', value: 3, source: '来源A' },
        { stat: 'attack', kind: 'percent', value: 0.10, source: '来源A' }
      ]);

      expect(grouped['来源A'].attack!.flat).toBe(8);
      expect(grouped['来源A'].attack!.percent).toBeCloseTo(0.10);
    });
  });

  describe('getStatSourcesByStat', () => {
    it('extracts all source contributions for a given stat', () => {
      const grouped = aggregateModifiersBySource([
        { stat: 'attack', kind: 'flat', value: 10, source: '废土利刃' },
        { stat: 'attack', kind: 'percent', value: 0.05, source: '钢铁壁垒' },
        { stat: 'maxHp', kind: 'percent', value: 0.10, source: '废土利刃' }
      ]);

      const attackSources = getStatSourcesByStat(grouped, 'attack');
      expect(attackSources).toHaveLength(2);
      expect(attackSources).toContainEqual({ source: '废土利刃', flat: 10, percent: 0 });
      expect(attackSources).toContainEqual({ source: '钢铁壁垒', flat: 0, percent: 0.05 });
    });

    it('returns empty array for a stat with no modifiers', () => {
      const grouped = aggregateModifiersBySource([
        { stat: 'attack', kind: 'flat', value: 10, source: '废土利刃' }
      ]);

      expect(getStatSourcesByStat(grouped, 'defense')).toEqual([]);
    });

    it('excludes source entries where both flat and percent are zero', () => {
      const grouped = aggregateModifiersBySource([
        { stat: 'attack', kind: 'flat', value: 0, source: '来源A' },
        { stat: 'attack', kind: 'flat', value: 10, source: '来源B' }
      ]);

      const attackSources = getStatSourcesByStat(grouped, 'attack');
      expect(attackSources).toHaveLength(1);
      expect(attackSources[0].source).toBe('来源B');
    });
  });
});
