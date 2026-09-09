import { describe, it, expect } from 'vitest';
import {
  fromStatModifier,
  toStatModifier,
  applyEffectModifiers,
  type Modifier
} from './modifier';

describe('统一 Modifier 适配器', () => {
  it('StatModifier → Modifier：flat→add、percent→multiply、source 保留', () => {
    expect(fromStatModifier({ stat: 'attack', kind: 'flat', value: 5, source: '剑' })).toEqual({
      target: 'stat.attack',
      op: 'add',
      value: 5,
      source: '剑'
    });
    expect(fromStatModifier({ stat: 'maxHp', kind: 'percent', value: 0.1 })).toEqual({
      target: 'stat.maxHp',
      op: 'multiply',
      value: 0.1,
      source: undefined
    });
  });

  it('Modifier → StatModifier 往返无损；effect.* 返回 null', () => {
    const stat: Modifier = { target: 'stat.strength', op: 'multiply', value: 0.2, source: '羁绊' };
    expect(toStatModifier(stat)).toEqual({ stat: 'strength', kind: 'percent', value: 0.2, source: '羁绊' });
    expect(toStatModifier({ target: 'effect.heal', op: 'multiply', value: 0.1 })).toBeNull();
    expect(fromStatModifier(toStatModifier(stat)!)).toEqual(stat);
  });

  it('effect.* 聚合：(base + Σadd) × (1 + Σmultiply)，一次应用', () => {
    const mods: Modifier[] = [
      { target: 'effect.heal', op: 'add', value: 10 },
      { target: 'effect.heal', op: 'multiply', value: 0.1 },
      { target: 'effect.heal', op: 'multiply', value: 0.2 },
      { target: 'effect.damage', op: 'add', value: 99 }
    ];
    // (100 + 10) × (1 + 0.3) = 143
    expect(applyEffectModifiers(100, mods, 'effect.heal')).toBe(143);
    expect(applyEffectModifiers(100, mods, 'effect.damage')).toBe(199);
  });
});
