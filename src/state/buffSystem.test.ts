import { describe, it, expect } from 'vitest';
import { calculateEntityStats, DEFAULT_PRIMARY_ATTRIBUTES } from './statSystem';
import { applyBuffsToStats, tickBuffs } from './buffSystem';
import type { ActiveBuff } from './buffSystem';

describe('buffSystem - Buff/Debuff State Machine & Effect Engine', () => {
  const baseCalculatedStats = calculateEntityStats({
    baseAttributes: {
      attack: 100,
      defense: 50,
      maxHp: 1000,
      maxMp: 200,
      critRate: 0.05,
      critDmg: 1.50
    },
    primaryAttributes: DEFAULT_PRIMARY_ATTRIBUTES
  });

  it('correctly applies flat attack buff and percent attack buff', () => {
    const buffs: ActiveBuff[] = [
      {
        id: 'buff_atk_flat',
        name: '战鼓',
        type: 'buff',
        duration: 3,
        maxDuration: 3,
        statModifiers: [
          { stat: 'attack', kind: 'flat', value: 30 }
        ]
      },
      {
        id: 'buff_atk_percent',
        name: '狂暴术',
        type: 'buff',
        duration: 2,
        maxDuration: 2,
        statModifiers: [
          { stat: 'attack', kind: 'percent', value: 0.20 } // +20%
        ]
      }
    ];

    const updatedStats = applyBuffsToStats(baseCalculatedStats, buffs);

    // Attack = (Base 100 + Flat 30) * (1 + Percent 0.20) = 130 * 1.20 = 156
    expect(updatedStats.attack).toBe(156);
  });

  it('applies Willpower effect reduction to Debuffs', () => {
    // 20 Willpower = 10% effect reduction (20 * 0.5%)
    const statsWithWillpower = calculateEntityStats({
      baseAttributes: {
        attack: 100,
        defense: 50,
        maxHp: 1000,
        maxMp: 200,
        critRate: 0.05,
        critDmg: 1.50
      },
      primaryAttributes: {
        ...DEFAULT_PRIMARY_ATTRIBUTES,
        willpower: 20
      }
    });

    const debuffs: ActiveBuff[] = [
      {
        id: 'debuff_atk_flat',
        name: '虚弱术',
        type: 'debuff',
        duration: 3,
        maxDuration: 3,
        statModifiers: [
          { stat: 'attack', kind: 'flat', value: -40 } // Base -40 ATK, but 10% reduced by willpower -> -36 ATK
        ]
      }
    ];

    const updatedStats = applyBuffsToStats(statsWithWillpower, debuffs);

    // Debuff reduction = -40 * (1 - 0.10) = -36
    // Final ATK = 100 - 36 = 64
    expect(updatedStats.attack).toBe(64);
  });

  it('correctly ticks duration down and removes expired buffs', () => {
    const buffs: ActiveBuff[] = [
      {
        id: 'buff_1',
        name: '加速',
        type: 'buff',
        duration: 2,
        maxDuration: 2,
        statModifiers: []
      },
      {
        id: 'buff_2',
        name: '护盾',
        type: 'buff',
        duration: 1,
        maxDuration: 1,
        statModifiers: []
      }
    ];

    const afterOneTick = tickBuffs(buffs);
    expect(afterOneTick.length).toBe(1);
    expect(afterOneTick[0].id).toBe('buff_1');
    expect(afterOneTick[0].duration).toBe(1);

    const afterTwoTicks = tickBuffs(afterOneTick);
    expect(afterTwoTicks.length).toBe(0);
  });
});
