import { describe, it, expect } from 'vitest';
import { createBattleContext } from './battleContext';
import type { TurnRuntime, BattleUnitRuntime } from './turnEngine';
import { makeFakeRuntime } from './testFixtures/battleRuntime';

// 共享工厂（combat-assembly 04 / E#7）。
const fakeRuntime = (unit: BattleUnitRuntime): TurnRuntime => makeFakeRuntime([unit]).runtime;

const makeUnit = (): BattleUnitRuntime => ({
  id: 'a',
  name: 'a',
  side: 'hero',
  hp: 100,
  maxHp: 100,
  initiative: 0,
  abilities: [],
  stats: { attack: 120, defense: 0, maxHp: 1000, maxMp: 50, critRate: 0, critDmg: 1.5 },
  currentMp: 50,
  entryOrder: 1,
  statParams: {
    baseAttributes: { attack: 100, defense: 0, maxHp: 1000, maxMp: 50, critRate: 0, critDmg: 1.5 },
    permanentModifiers: [{ stat: 'attack', kind: 'flat', value: 20 }]
  }
});

describe('resolveStats', () => {
  it('用原始配方 + 常驻 + 动态修正符现算当前面板', () => {
    const u = makeUnit();
    const ctx = createBattleContext(fakeRuntime(u));
    expect(ctx.resolveStats('a').attack).toBe(120);

    ctx.addModifier('a', { target: 'stat.attack', op: 'add', value: 30, source: 'test' });
    expect(ctx.resolveStats('a').attack).toBe(150);
  });

  it('静态入场面板不随动态修正符改变', () => {
    const u = makeUnit();
    const ctx = createBattleContext(fakeRuntime(u));
    ctx.addModifier('a', { target: 'stat.attack', op: 'multiply', value: 0.5, source: 'test' });

    expect(u.stats.attack).toBe(120);
    expect(ctx.resolveStats('a').attack).toBe(180);
  });

  it('无 statParams 时抛明确错误（combat-assembly 03 / M1 回退收紧）', () => {
    const u = makeUnit();
    u.statParams = undefined;
    const ctx = createBattleContext(fakeRuntime(u));
    expect(() => ctx.resolveStats('a')).toThrow(/缺少 statParams/);
  });
});
