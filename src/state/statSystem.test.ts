import { describe, it, expect } from 'vitest';
import { calculateEntityStats, DEFAULT_PRIMARY_ATTRIBUTES } from './statSystem';
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
