import { describe, it, expect } from 'vitest';
import { createBattleContext } from './battleContext';
import type { TurnRuntime, BattleEvent, BattleUnitRuntime } from './turnEngine';

const fakeRuntime = (unit: BattleUnitRuntime): TurnRuntime => ({
  round: 0,
  rng: () => 0.5,
  register: () => {},
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

  it('无 statParams 时回退到静态面板', () => {
    const u = makeUnit();
    u.statParams = undefined;
    const ctx = createBattleContext(fakeRuntime(u));
    expect(ctx.resolveStats('a').attack).toBe(120);
  });
});
