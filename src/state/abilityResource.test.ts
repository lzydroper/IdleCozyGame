import { describe, it, expect } from 'vitest';
import { createBattleContext } from './battleContext';
import { createTurnRuntime, type TurnRuntime, type BattleUnitRuntime, type BattleUnitSnapshot } from './turnEngine';
import { makeFakeRuntime } from './testFixtures/battleRuntime';

// 共享工厂（combat-assembly 04 / E#7）。
const fakeRuntime = (unit: BattleUnitRuntime): TurnRuntime => makeFakeRuntime([unit]).runtime;

const unit = (id: string, currentMp: number, maxMp: number): BattleUnitRuntime => ({
  id,
  name: id,
  side: 'hero',
  hp: 10,
  maxHp: 10,
  initiative: 0,
  abilities: [],
  stats: { attack: 1, defense: 0, maxHp: 10, maxMp, critRate: 0, critDmg: 1.5 },
  entryOrder: 1,
  currentMp
});

describe('资源消耗 seam', () => {
  it('canAfford 依据当前魔力判定', () => {
    const ctx = createBattleContext(fakeRuntime(unit('a', 10, 20)));
    expect(ctx.canAfford('a', { resource: 'mp', amount: 5 })).toBe(true);
    expect(ctx.canAfford('a', { resource: 'mp', amount: 11 })).toBe(false);
  });

  it('spendCost 扣减当前魔力并返回是否成功', () => {
    const u = unit('a', 10, 20);
    const ctx = createBattleContext(fakeRuntime(u));

    expect(ctx.spendCost('a', { resource: 'mp', amount: 4 })).toBe(true);
    expect(u.currentMp).toBe(6);
    expect(ctx.spendCost('a', { resource: 'mp', amount: 99 })).toBe(false);
    expect(u.currentMp).toBe(6);
  });

  it('未知单位不可支付、不可扣费', () => {
    const ctx = createBattleContext(fakeRuntime(unit('a', 10, 20)));
    expect(ctx.canAfford('missing', { resource: 'mp', amount: 1 })).toBe(false);
    expect(ctx.spendCost('missing', { resource: 'mp', amount: 1 })).toBe(false);
  });

  it('runTurnEngine 入场时以最大魔力初始化当前魔力', () => {
    const snapshot: BattleUnitSnapshot = {
      id: 'a',
      name: 'a',
      side: 'hero',
      hp: 10,
      maxHp: 10,
      initiative: 0,
      abilities: [],
      stats: { attack: 1, defense: 0, maxHp: 10, maxMp: 7, critRate: 0, critDmg: 1.5 }
    };
    const runtime = createTurnRuntime([snapshot], { maxRounds: 0 });
    expect(runtime.getUnit('a')?.currentMp).toBe(7);
  });
});
