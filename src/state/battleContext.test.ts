import { describe, it, expect } from 'vitest';
import { createBattleContext, type BuffInstance } from './battleContext';
import type { TurnRuntime, BattleEvent, BattleUnitRuntime } from './turnEngine';
import type { Modifier } from './modifier';

const fakeRuntime = (): TurnRuntime => ({
  round: 0,
  rng: () => 0.5,
  register: () => {},
  unregister: () => {},
  dispatchEvent: (): BattleEvent => ({ seq: 0, round: 0, key: '', unitId: null, sourceId: null, targetId: null, unitName: null, sourceName: null, targetName: null, data: {} }),
  dealDamage: () => 0,
  applyHeal: () => 0,
  updateInitiative: () => {},
  summonUnit: (): BattleUnitRuntime => ({ id: '', name: '', side: 'hero', hp: 0, maxHp: 0, initiative: 0, abilities: [], stats: { attack: 0, defense: 0, maxHp: 0, maxMp: 0, critRate: 0, critDmg: 1.5 }, entryOrder: 0 }),
  requestEnd: () => {},
  getUnit: () => undefined,
  getLivingUnits: () => []
});

const buff = (buffId: string, duration: number | null = 3, overrides: Partial<BuffInstance> = {}): BuffInstance => ({
  id: overrides.id ?? buffId + '-1',
  buffId,
  sourceId: 'src',
  targetId: 't',
  stacks: 1,
  duration,
  values: {},
  ...overrides
});

describe('BattleContext 骨架', () => {
  it('Modifier 注册表：增删查与命名空间过滤', () => {
    const ctx = createBattleContext(fakeRuntime());
    const attack: Modifier = { target: 'stat.attack', op: 'add', value: 5 };
    const heal: Modifier = { target: 'effect.heal', op: 'multiply', value: 0.1 };
    const aId = ctx.addModifier('a', attack);
    ctx.addModifier('a', heal);

    expect(ctx.getModifiers('a')).toEqual([attack, heal]);
    expect(ctx.getModifiers('a', 'stat')).toEqual([attack]);
    expect(ctx.getModifiers('a', 'effect')).toEqual([heal]);
    expect(ctx.removeModifier('a', aId)).toBe(true);
    expect(ctx.getModifiers('a')).toEqual([heal]);
    expect(ctx.removeModifier('a', aId)).toBe(false);
  });

  it('applyBuff 同 buffId 同 source 命中已有实例并刷新', () => {
    const ctx = createBattleContext(fakeRuntime());
    const first = ctx.applyBuff('a', buff('burn'));
    expect(first.applied).toBe(true);
    expect(first.refreshed).toBe(false);
    expect(first.instance.buffId).toBe('burn');

    const second = ctx.applyBuff('a', buff('burn'));
    expect(second.applied).toBe(true);
    expect(second.refreshed).toBe(true);
    expect(second.instance).toBe(first.instance);
    expect(ctx.listBuffs('a')).toHaveLength(1);

    expect(ctx.removeBuff('a', 'burn')).toBe(true);
    expect(ctx.getBuff('a', 'burn')).toBeUndefined();
  });

  it('Renew 取 max：重复获得不缩短剩余时长', () => {
    const ctx = createBattleContext(fakeRuntime());
    ctx.applyBuff('a', buff('burn', 5));
    const second = ctx.applyBuff('a', buff('burn', 3));
    expect(second.refreshed).toBe(true);
    expect(second.instance.duration).toBe(5);
  });

  it('Stack 无上限：每次重复获得叠加配置增量', () => {
    const ctx = createBattleContext(fakeRuntime());
    ctx.applyBuff('a', buff('burn', 5));
    const second = ctx.applyBuff('a', buff('burn', 5));
    const third = ctx.applyBuff('a', buff('burn', 5));
    expect(second.stacks).toBe(2);
    expect(third.stacks).toBe(3);
  });

  it('Renew 与 Stack 独立判定，可同时生效', () => {
    const ctx = createBattleContext(fakeRuntime());
    ctx.applyBuff('a', buff('burn', 5));
    const second = ctx.applyBuff('a', buff('burn', 6));
    expect(second.instance.duration).toBe(6);
    expect(second.stacks).toBe(2);
  });

  it('不同 source 同 buffId 在挂载层拒绝，实例不变', () => {
    const ctx = createBattleContext(fakeRuntime());
    const first = ctx.applyBuff('a', buff('burn', 5));
    const rejected = ctx.applyBuff('a', buff('burn', 8, { id: 'burn-2', sourceId: 'other' }));
    expect(rejected.applied).toBe(false);
    expect(rejected.instance).toBe(first.instance);
    expect(ctx.getBuff('a', 'burn')?.sourceId).toBe('src');
    expect(ctx.getBuff('a', 'burn')?.stacks).toBe(1);
    expect(ctx.getBuff('a', 'burn')?.duration).toBe(5);
  });

  it('未知 buffId 不落地', () => {
    const ctx = createBattleContext(fakeRuntime());
    const result = ctx.applyBuff('a', buff('unknown'));
    expect(result.applied).toBe(false);
    expect(ctx.listBuffs('a')).toHaveLength(0);
  });

  it('removeBuff 回收以实例 id 为 source 的 owned Modifier', () => {
    const ctx = createBattleContext(fakeRuntime());
    ctx.applyBuff('a', buff('warSpirit', null, { id: 'war-1' }));
    ctx.addModifier('a', { target: 'stat.strength', op: 'add', value: 5, source: 'war-1' });
    ctx.addModifier('a', { target: 'stat.attack', op: 'add', value: 3, source: 'other' });

    expect(ctx.getModifiers('a')).toHaveLength(2);
    ctx.removeBuff('a', 'warSpirit');

    const mods = ctx.getModifiers('a');
    expect(mods).toHaveLength(1);
    expect(mods[0].source).toBe('other');
  });

  it('BattleFlag 读写，缺省为 0', () => {
    const ctx = createBattleContext(fakeRuntime());
    expect(ctx.getFlag('a', 'taunt')).toBe(0);
    ctx.setFlag('a', 'taunt', 5);
    expect(ctx.getFlag('a', 'taunt')).toBe(5);
    ctx.setFlag('a', 'taunt', 0);
    expect(ctx.getFlag('a', 'taunt')).toBe(0);
  });
});
