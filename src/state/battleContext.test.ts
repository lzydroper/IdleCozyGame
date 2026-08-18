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
  summonUnit: (): BattleUnitRuntime => ({ id: '', name: '', faction: 'hero', hp: 0, maxHp: 0, initiative: 0, abilities: [], stats: { attack: 0, defense: 0, maxHp: 0, maxMp: 0, critRate: 0, critDmg: 1.5 }, entryOrder: 0 }),
  requestEnd: () => {},
  getUnit: () => undefined,
  getLivingUnits: () => []
});

const buff = (buffId: string, duration: number | null = 3): BuffInstance => ({
  id: `${buffId}-1`,
  buffId,
  sourceId: 'src',
  targetId: 't',
  stacks: 1,
  duration
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

  it('Buff 占位：同 buffId 不重复挂载，返回 refreshed', () => {
    const ctx = createBattleContext(fakeRuntime());
    const first = ctx.applyBuff('a', buff('burn'));
    expect(first.refreshed).toBe(false);
    expect(first.instance.buffId).toBe('burn');

    const second = ctx.applyBuff('a', buff('burn'));
    expect(second.refreshed).toBe(true);
    expect(second.instance).toBe(first.instance);
    expect(ctx.listBuffs('a')).toHaveLength(1);

    expect(ctx.removeBuff('a', 'burn')).toBe(true);
    expect(ctx.getBuff('a', 'burn')).toBeUndefined();
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
