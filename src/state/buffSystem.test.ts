import { describe, it, expect } from 'vitest';
import { calculateEntityStats, DEFAULT_PRIMARY_ATTRIBUTES } from './statSystem';
import { collectBuffModifiers, tickBuffs } from './buffSystem';
import type { ActiveBuff } from './buffSystem';

describe('buffSystem - 统一管道模式（stat-bonus-unification 07）', () => {
  const baseParams = {
    baseAttributes: {
      attack: 100,
      defense: 50,
      maxHp: 1000,
      maxMp: 200,
      critRate: 0.05,
      critDmg: 1.50
    },
    primaryAttributes: DEFAULT_PRIMARY_ATTRIBUTES
  };

  it('buff 修饰符与常驻修饰符合并进统一管道：flat 先加、percent 后乘', () => {
    const buffs: ActiveBuff[] = [
      {
        id: 'buff_atk_flat',
        name: '战鼓',
        type: 'buff',
        duration: 3,
        maxDuration: 3,
        statModifiers: [{ stat: 'attack', kind: 'flat', value: 30 }]
      },
      {
        id: 'buff_atk_percent',
        name: '狂暴术',
        type: 'buff',
        duration: 2,
        maxDuration: 2,
        statModifiers: [{ stat: 'attack', kind: 'percent', value: 0.20 }] // +20%
      }
    ];

    const updated = calculateEntityStats(baseParams, collectBuffModifiers(buffs, 0));
    // Attack = (Base 100 + Flat 30) * (1 + 0.20) = 156
    expect(updated.attack).toBeCloseTo(156);
  });

  it('debuff 按意志减免（effectReduction）调整数值', () => {
    // 20 Willpower = 10% effect reduction (20 * 0.5%)
    const paramsWithWillpower = {
      ...baseParams,
      primaryAttributes: { ...DEFAULT_PRIMARY_ATTRIBUTES, willpower: 20 }
    };
    // 意志减免来自基础面板（不含 buff），与旧 applyBuffsToStats 语义一致
    const baseReduction = calculateEntityStats(paramsWithWillpower).effectReduction;

    const debuffs: ActiveBuff[] = [
      {
        id: 'debuff_atk_flat',
        name: '虚弱术',
        type: 'debuff',
        duration: 3,
        maxDuration: 3,
        statModifiers: [{ stat: 'attack', kind: 'flat', value: -40 }] // 基础 -40，意志减免 10% → -36
      }
    ];

    const updated = calculateEntityStats(paramsWithWillpower, collectBuffModifiers(debuffs, baseReduction));
    expect(updated.attack).toBeCloseTo(64); // 100 - 36
  });

  it('元属性 buff 经折算生效（修掉旧 applyBuffsToStats 元属性累积不生效缺陷）', () => {
    const buffs: ActiveBuff[] = [
      {
        id: 'buff_str',
        name: '巨力术',
        type: 'buff',
        duration: 2,
        maxDuration: 2,
        statModifiers: [{ stat: 'strength', kind: 'flat', value: 5 }]
      }
    ];

    const updated = calculateEntityStats(baseParams, collectBuffModifiers(buffs, 0));
    expect(updated.attack).toBeCloseTo(110); // 100 + 5 * 2
    expect(updated.critDmg).toBeCloseTo(1.525); // 1.5 + 5 * 0.005
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
