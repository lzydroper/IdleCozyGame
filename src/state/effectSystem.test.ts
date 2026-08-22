import { describe, it, expect } from 'vitest';
import { createBattleContext, type BattleContext } from './battleContext';
import type { BattleEvent, BattleUnitRuntime, TurnRuntime } from './turnEngine';
import {
  defaultChainKey,
  resolveEffect,
  calculateDamageAmount,
  type EffectInstance
} from './effectSystem';
import { makeBattleUnit, makeFakeRuntime } from './testFixtures/battleRuntime';

// 共享工厂（combat-assembly 04 / E#7）：单位与 runtime 桩抽取到 testFixtures/battleRuntime。
const makeUnit = makeBattleUnit;

const makeRuntime = (units: Map<string, BattleUnitRuntime>): { runtime: TurnRuntime; events: BattleEvent[] } =>
  makeFakeRuntime([...units.values()]);

const makeCtx = (units: Map<string, BattleUnitRuntime>): { ctx: BattleContext; events: BattleEvent[] } => {
  const { runtime, events } = makeRuntime(units);
  return { ctx: createBattleContext(runtime), events };
};

const effect = (kind: EffectInstance['kind'], params: EffectInstance['params'], overrides: Partial<EffectInstance> = {}): EffectInstance => ({
  id: 'e1',
  effectId: 'test',
  kind,
  sourceId: 'a',
  targetId: 'b',
  params,
  origin: { kind: 'ability', id: 'ability-1' },
  ...overrides
});

describe('resolveEffect 主 seam', () => {
  it('伤害效果落地：公式结算、扣血、派发 effectApplied', () => {
    const units = new Map<string, BattleUnitRuntime>([
      ['a', makeUnit('a', 100)],
      ['b', makeUnit('b', 100)]
    ]);
    const { ctx, events } = makeCtx(units);
    const result = resolveEffect(ctx, effect('damage', { amount: 20 }));

    expect(result.applied).toBe(true);
    expect(result.values.damage).toBe(20);
    expect(result.targetDied).toBe(false);
    expect(units.get('b')!.hp).toBe(80);
    expect(events.some(e => e.key === 'effectApplied')).toBe(true);
    const applied = events.find(e => e.key === 'effectApplied')!;
    expect(applied.data.kind).toBe('damage');
    expect(applied.data.values).toEqual({ damage: 20 });
  });

  it('治疗效果落地：恢复生命并派发 effectApplied', () => {
    const b = makeUnit('b', 100);
    b.hp = 80; // 80/100：缺 2 0 点余量
    const units = new Map<string, BattleUnitRuntime>([
      ['a', makeUnit('a', 100)],
      ['b', b]
    ]);
    const { ctx, events } = makeCtx(units);
    const result = resolveEffect(ctx, effect('heal', { amount: 10 }));

    expect(result.applied).toBe(true);
    expect(result.values.heal).toBe(10);
    expect(units.get('b')!.hp).toBe(90);
    expect(events.some(e => e.key === 'effectApplied' && e.data.kind === 'heal')).toBe(true);
  });

  it('effect.* Modifier 修正效果数值', () => {
    const b = makeUnit('b', 100);
    b.hp = 80;
    const units = new Map<string, BattleUnitRuntime>([
      ['a', makeUnit('a', 100)],
      ['b', b]
    ]);
    const { ctx } = makeCtx(units);
    ctx.addModifier('b', { target: 'effect.heal', op: 'multiply', value: 0.1 });
    const result = resolveEffect(ctx, effect('heal', { amount: 10 }));
    expect(result.values.heal).toBe(11);
  });

  it('chainKey guard 拦截递归', () => {
    const units = new Map<string, BattleUnitRuntime>([
      ['a', makeUnit('a', 100)],
      ['b', makeUnit('b', 100)]
    ]);
    const { ctx } = makeCtx(units);
    const inst = effect('damage', { amount: 20 });
    const result = resolveEffect(ctx, inst, new Set([defaultChainKey(inst)]));
    expect(result.applied).toBe(false);
    expect(result.interrupted).toBe('recursion');
  });
});

describe('statModify 效果', () => {
  it('增加 Modifier，并应用 effect.value 加算修正', () => {
    const units = new Map<string, BattleUnitRuntime>([
      ['a', makeUnit('a', 100)],
      ['b', makeUnit('b', 100)]
    ]);
    const { ctx } = makeCtx(units);
    ctx.addModifier('b', { target: 'effect.value', op: 'add', value: 5 });
    const result = resolveEffect(ctx, effect('statModify', { modifier: { target: 'stat.attack', op: 'add', value: 10 } }));

    expect(result.applied).toBe(true);
    expect(result.values.value).toBe(15);
    expect(ctx.getModifiers('b', 'stat')).toContainEqual({ target: 'stat.attack', op: 'add', value: 15, source: undefined });
  });

  it('effect.value 乘算修正生效', () => {
    const units = new Map<string, BattleUnitRuntime>([
      ['a', makeUnit('a', 100)],
      ['b', makeUnit('b', 100)]
    ]);
    const { ctx } = makeCtx(units);
    ctx.addModifier('b', { target: 'effect.value', op: 'multiply', value: 0.5 });
    const result = resolveEffect(ctx, effect('statModify', { modifier: { target: 'stat.attack', op: 'add', value: 10 } }));

    expect(result.values.value).toBe(15);
    expect(ctx.getModifiers('b', 'stat')).toContainEqual({ target: 'stat.attack', op: 'add', value: 15, source: undefined });
  });

  it('返回 Modifier 句柄，供 Buff 到期按句柄移除', () => {
    const units = new Map<string, BattleUnitRuntime>([
      ['a', makeUnit('a', 100)],
      ['b', makeUnit('b', 100)]
    ]);
    const { ctx } = makeCtx(units);
    const result = resolveEffect(ctx, effect('statModify', { modifier: { target: 'stat.attack', op: 'add', value: 10 } }));

    expect(result.modifierId).toBeDefined();
    expect(ctx.removeModifier('b', result.modifierId!)).toBe(true);
    expect(ctx.getModifiers('b', 'stat')).toEqual([]);
  });
});

describe('applyBuff / stun 效果', () => {
  it('applyBuff 落地 Buff 实例，duration 修正生效', () => {
    const units = new Map<string, BattleUnitRuntime>([
      ['a', makeUnit('a', 100)],
      ['b', makeUnit('b', 100)]
    ]);
    const { ctx } = makeCtx(units);
    ctx.addModifier('b', { target: 'effect.duration', op: 'add', value: 1 });
    const result = resolveEffect(ctx, effect('applyBuff', {
      buffInstance: { id: 'b1', buffId: 'burn', sourceId: 'a', targetId: 'b', stacks: 1, duration: 5, values: {} }
    }));

    expect(result.applied).toBe(true);
    expect(result.values.stacks).toBe(1);
    expect(ctx.getBuff('b', 'burn')?.duration).toBe(6);
  });

  it('stun 不再走二元意志抵抗，按 durationReduction 时长减免', () => {
    const units = new Map<string, BattleUnitRuntime>([
      ['a', makeUnit('a', 100)],
      ['b', makeUnit('b', 100)]
    ]);
    const { ctx } = makeCtx(units);

    // 来源意志低于目标也不再直接 resisted。
    units.get('a')!.stats.willpower = 0;
    units.get('b')!.stats.willpower = 5;
    units.get('b')!.stats.durationReduction = 0;
    const hit = resolveEffect(ctx, effect('stun', { duration: 2 }));
    expect(hit.applied).toBe(true);
    expect(ctx.getBuff('b', 'stun')?.duration).toBe(2);

    // 50% 减免：ceil(2 * 0.5) = 1。
    ctx.removeBuff('b', 'stun');
    units.get('b')!.stats.durationReduction = 0.5;
    const reduced = resolveEffect(ctx, effect('stun', { duration: 2 }));
    expect(reduced.applied).toBe(true);
    expect(ctx.getBuff('b', 'stun')?.duration).toBe(1);

    // 100% 减免：归零不落地。
    ctx.removeBuff('b', 'stun');
    units.get('b')!.stats.durationReduction = 1;
    const zeroed = resolveEffect(ctx, effect('stun', { duration: 1 }));
    expect(zeroed.applied).toBe(false);
    expect(zeroed.interrupted).toBe('zeroed'); // 归零 ≠ 免疫（combat-aftermath 02 D2）
    expect(ctx.getBuff('b', 'stun')).toBeUndefined();
  });
});

describe('dispel / immunity / taunt 效果', () => {
  it('dispel 按 buffKind 移除目标 Buff', () => {
    const units = new Map<string, BattleUnitRuntime>([
      ['a', makeUnit('a', 100)],
      ['b', makeUnit('b', 100)]
    ]);
    const { ctx } = makeCtx(units);
    ctx.applyBuff('b', { id: 'b1', buffId: 'burn', sourceId: 'a', targetId: 'b', stacks: 1, duration: 3, values: {} });
    const result = resolveEffect(ctx, effect('dispel', { buffKind: 'burn' }));
    expect(result.applied).toBe(true);
    expect(ctx.getBuff('b', 'burn')).toBeUndefined();
  });

  it('dispel / taunt 走二元抵抗：来源意志低于目标意志时被抵抗', () => {
    const units = new Map<string, BattleUnitRuntime>([
      ['a', makeUnit('a', 100)],
      ['b', makeUnit('b', 100)]
    ]);
    const { ctx } = makeCtx(units);
    ctx.applyBuff('b', { id: 'b1', buffId: 'burn', sourceId: 'a', targetId: 'b', stacks: 1, duration: 3, values: {} });
    units.get('a')!.stats.willpower = 0;
    units.get('b')!.stats.willpower = 5;

    const dispelResisted = resolveEffect(ctx, effect('dispel', { buffKind: 'burn' }));
    expect(dispelResisted.applied).toBe(false);
    expect(dispelResisted.interrupted).toBe('resisted');
    expect(ctx.getBuff('b', 'burn')).toBeDefined();

    const tauntResisted = resolveEffect(ctx, effect('taunt', { value: 5 }));
    expect(tauntResisted.applied).toBe(false);
    expect(tauntResisted.interrupted).toBe('resisted');
    expect(ctx.getFlag('b', 'taunt')).toBe(0);
  });

  it('immunity / taunt 写 BattleFlag', () => {
    const units = new Map<string, BattleUnitRuntime>([
      ['a', makeUnit('a', 100)],
      ['b', makeUnit('b', 100)]
    ]);
    const { ctx } = makeCtx(units);
    resolveEffect(ctx, effect('immunityElement', { element: 'arcane' }));
    resolveEffect(ctx, effect('immunityBuff', { buffKind: 'weak' }));
    resolveEffect(ctx, effect('taunt', { value: 5 }));
    expect(ctx.getFlag('b', 'immunityElement:arcane')).toBe(1);
    expect(ctx.getFlag('b', 'immunityBuff:weak')).toBe(1);
    expect(ctx.getFlag('b', 'taunt')).toBe(5);
  });

  it('stun 免疫在意志减免前拦截', () => {
    const units = new Map<string, BattleUnitRuntime>([
      ['a', makeUnit('a', 100)],
      ['b', makeUnit('b', 100)]
    ]);
    const { ctx } = makeCtx(units);
    ctx.setFlag('b', 'immunityBuff:stun', 1);
    const result = resolveEffect(ctx, effect('stun', { duration: 2 }));
    expect(result.applied).toBe(false);
    expect(result.interrupted).toBe('negated');
    expect(ctx.getBuff('b', 'stun')).toBeUndefined();
  });
});

describe('summon 效果', () => {
  it('按 count 创建多个单位，targetId 记首个/主单位', () => {
    const units = new Map<string, BattleUnitRuntime>([['a', makeUnit('a', 100)]]);
    const { ctx, events } = makeCtx(units);
    const configRef = { kind: 'enemy' as const, id: 'test_dummy' };
    const result = resolveEffect(ctx, effect('summon', { count: 2, configRef }, { targetId: 's1' }));

    expect(result.applied).toBe(true);
    expect(result.values.count).toBe(2);
    expect(ctx.turn.getUnit('s1')).toBeDefined();
    expect(ctx.turn.getUnit('s1-1')).toBeDefined();
    expect(events.some(e => e.key === 'summon' && e.unitId === 's1')).toBe(true);
  });

  it('effect.count 修正从来源读取，count=1 时修正后创建对应数量', () => {
    const units = new Map<string, BattleUnitRuntime>([['a', makeUnit('a', 100)]]);
    const { ctx } = makeCtx(units);
    ctx.addModifier('a', { target: 'effect.count', op: 'add', value: 1 });
    const configRef = { kind: 'enemy' as const, id: 'test_dummy' };
    const result = resolveEffect(ctx, effect('summon', { count: 1, configRef }, { targetId: 's1' }));

    expect(result.applied).toBe(true);
    expect(result.values.count).toBe(2);
    expect(ctx.turn.getUnit('s1')).toBeDefined();
    expect(ctx.turn.getUnit('s1-1')).toBeDefined();
  });
});

describe('calculateDamageAmount', () => {
  it('防御减免公式 DEF/(100+DEF) + 最小伤害底线', () => {
    const attacker = makeUnit('a', 100).stats;
    const defender = makeUnit('b', 100).stats;
    // 100/(100+0)=1 → 20
    expect(calculateDamageAmount(20, attacker, { ...defender, defense: 0 })).toBe(20);
    // 100/(100+100)=0.5 → 10
    expect(calculateDamageAmount(20, attacker, { ...defender, defense: 100 })).toBe(10);
  });
});
