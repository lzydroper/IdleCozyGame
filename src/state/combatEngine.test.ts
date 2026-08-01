import { describe, it, expect } from 'vitest';
import { calculateEntityStats, DEFAULT_PRIMARY_ATTRIBUTES } from './statSystem';
import { calculateDamage, createMonsterStats } from './combatEngine';

describe('combatEngine - Special Attributes & Combat Damage Calculation Engine', () => {
  const attackerStats = calculateEntityStats({
    baseAttributes: {
      attack: 200,
      defense: 20,
      maxHp: 500,
      maxMp: 100,
      critRate: 0.20,
      critDmg: 1.50
    },
    primaryAttributes: DEFAULT_PRIMARY_ATTRIBUTES,
    specialAttributes: {
      arcaneBoost: 0.15,
      voidSpirit: 0
    }
  });

  const defenderStats = calculateEntityStats({
    baseAttributes: {
      attack: 80,
      defense: 100, // 100 DEF -> 50% damage reduction
      maxHp: 1000,
      maxMp: 50,
      critRate: 0.05,
      critDmg: 1.50
    },
    primaryAttributes: DEFAULT_PRIMARY_ATTRIBUTES,
    specialAttributes: {
      voidSpirit: 0.10 // 10% void spirit damage exemption
    }
  });

  it('calculates non-crit physical damage with defense percentage reduction and void spirit exemption', () => {
    // Attack 200
    // Defense reduction 100 / (100 + 100) = 50% -> 100 damage
    // Void Spirit exemption = 10% -> 90 damage
    const result = calculateDamage({
      attacker: attackerStats,
      defender: defenderStats,
      isCrit: false,
      element: 'physical'
    });

    expect(result.damage).toBe(90);
    expect(result.isCrit).toBe(false);
  });

  it('calculates critical hit damage correctly', () => {
    // Attack 200 * CritDmg 1.50 = 300
    // Defense reduction 50% -> 150 damage
    // Void Spirit exemption 10% -> 135 damage
    const result = calculateDamage({
      attacker: attackerStats,
      defender: defenderStats,
      isCrit: true,
      element: 'physical'
    });

    expect(result.damage).toBe(135);
    expect(result.isCrit).toBe(true);
  });

  it('calculates elemental arcane damage with Arcane Boost', () => {
    // Attack 200 * (1 + ArcaneBoost 0.15) = 230
    // Defense reduction 50% -> 115 damage
    // Void Spirit exemption 10% -> 103.5 -> 103 damage
    const result = calculateDamage({
      attacker: attackerStats,
      defender: defenderStats,
      isCrit: false,
      element: 'arcane'
    });

    expect(result.damage).toBe(103);
  });

  it('creates monster entity stats using the unified stat system', () => {
    const monster = createMonsterStats({
      name: '废土小恶魔',
      level: 5,
      baseAttack: 50,
      baseDefense: 30,
      baseHp: 400
    });

    expect(monster.attack).toBeGreaterThanOrEqual(50);
    expect(monster.maxHp).toBeGreaterThanOrEqual(400);
    const expectedDef = 30 + 5 * 1; // 35 DEF
    expect(monster.damageReduction).toBeCloseTo(expectedDef / (100 + expectedDef));
  });
});
