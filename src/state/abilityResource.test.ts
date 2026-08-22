import { describe, it, expect } from 'vitest';
import { createBattleContext } from './battleContext';
import { runTurnEngine, type TurnRuntime, type BattleEvent, type BattleUnitRuntime, type BattleUnitSnapshot } from './turnEngine';

const fakeRuntime = (unit: BattleUnitRuntime): TurnRuntime => ({
  round: 0,
  rng: () => 0.5,
  register: () => () => {},
  unregister: () => {},
  dispatchEvent: (): BattleEvent => ({ seq: 0, round: 0, key: '', unitId: null, sourceId: null, targetId: null, unitName: null, sourceName: null, targetName: null, data: {} }),
  dealDamage: () => 0,
  applyHeal: () => 0,
  updateInitiative: () => {},
  summonUnit: () => unit,
  requestEnd: () => {},
  getUnit: (id) => (id === unit.id ? unit : undefined),
  getLivingUnits: () => [unit]
});

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
    let runtime: TurnRuntime | null = null;
    runTurnEngine([snapshot], {
      maxRounds: 0,
      setup: (rt) => {
        runtime = rt;
      }
    });
    expect(runtime!.getUnit('a')?.currentMp).toBe(7);
  });
});
