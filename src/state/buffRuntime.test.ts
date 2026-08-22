import { describe, it, expect } from 'vitest';
import { runTurnEngine, type BattleEvent, type BattleUnitRuntime, type BattleUnitSnapshot, type TurnRuntime, type TurnTimingContext } from './turnEngine';
import { createBattleContext, type BattleContext } from './battleContext';
import { BUFF_CONFIGS, type BuffInstance } from './buffTypes';
import { canTriggerBuff, createBuffTriggerHooks, settleBuffTrigger } from './buffRuntime';

const makeUnit = (
  id: string,
  side: 'hero' | 'enemy',
  hp = 1000,
  attack = 10
): BattleUnitSnapshot => ({
  id,
  name: id,
  side,
  hp,
  maxHp: hp,
  initiative: 100,
  abilities: [],
  stats: {
    attack,
    defense: 0,
    maxHp: hp,
    maxMp: 0,
    critRate: 0,
    critDmg: 1.5,
    willpower: 0,
    durationReduction: 0,
    effectReduction: 0
  }
});

const runBuffBattle = (
  units: BattleUnitSnapshot[],
  maxRounds: number,
  setup: (ctx: BattleContext) => void,
  performAction?: (unit: BattleUnitRuntime, runtime: TurnRuntime) => void
): { result: ReturnType<typeof runTurnEngine>; ctx: BattleContext } => {
  let ctx!: BattleContext;
  const result = runTurnEngine(units, {
    maxRounds,
    rng: () => 0.5,
    setup(runtime) {
      ctx = createBattleContext(runtime, BUFF_CONFIGS, createBuffTriggerHooks(() => ctx));
      setup(ctx);
    },
    performAction: performAction ?? (() => {})
  });
  return { result, ctx };
};

describe('Buff 触发运行时', () => {
  it('canTriggerBuff 判定 timing 与 target/source 归属', () => {
    const instance: BuffInstance = {
      id: 'b1',
      buffId: 'burn',
      sourceId: 'src',
      targetId: 'tgt',
      stacks: 1,
      duration: 2,
      values: {}
    };
    const targetTrigger = BUFF_CONFIGS.burn.triggers[0];
    expect(canTriggerBuff(instance, targetTrigger, 'turnStart', 'tgt')).toBe(true);
    expect(canTriggerBuff(instance, targetTrigger, 'turnStart', 'src')).toBe(false);
    expect(canTriggerBuff(instance, targetTrigger, 'turnEnd', 'tgt')).toBe(false);

    const sourceTrigger = { timing: 'turnStart', unitRef: 'source' } as const;
    expect(canTriggerBuff(instance, sourceTrigger, 'turnStart', 'src')).toBe(true);
    expect(canTriggerBuff(instance, sourceTrigger, 'turnStart', 'tgt')).toBe(false);
  });

  it('fireCount 放大效果但不额外扣 duration', () => {
    const unitA: BattleUnitRuntime = {
      id: 'a', name: 'a', side: 'hero', hp: 1000, maxHp: 1000, initiative: 100,
      abilities: [], stats: { attack: 10, defense: 0, maxHp: 1000, maxMp: 0, critRate: 0, critDmg: 1.5, willpower: 0, durationReduction: 0, effectReduction: 0 }, entryOrder: 0
    };
    const unitB: BattleUnitRuntime = {
      id: 'b', name: 'b', side: 'enemy', hp: 1000, maxHp: 1000, initiative: 100,
      abilities: [], stats: { attack: 10, defense: 0, maxHp: 1000, maxMp: 0, critRate: 0, critDmg: 1.5, willpower: 0, durationReduction: 0, effectReduction: 0 }, entryOrder: 1
    };
    const units = new Map<string, BattleUnitRuntime>([['a', unitA], ['b', unitB]]);
    const events: BattleEvent[] = [];
    const runtime: TurnRuntime = {
      round: 0,
      rng: () => 0.5,
      register: () => () => {},
      unregister: () => () => {},
      dispatchEvent: (key, opts = {}) => {
        const event: BattleEvent = {
          seq: events.length, round: 0, key,
          unitId: opts.unitId ?? null, sourceId: opts.sourceId ?? null, targetId: opts.targetId ?? null,
          unitName: null, sourceName: null, targetName: null, data: opts.data ?? {}
        };
        events.push(event);
        return event;
      },
      dealDamage: (targetId, amount) => {
        const unit = units.get(targetId);
        if (!unit) return 0;
        const actual = Math.min(unit.hp, amount);
        unit.hp -= actual;
        return actual;
      },
      applyHeal: () => 0,
      updateInitiative: () => {},
      summonUnit: () => unitB,
      requestEnd: () => {},
      getUnit: (id) => units.get(id),
      getLivingUnits: () => Array.from(units.values())
    };
    const ctx = createBattleContext(runtime);
    const instance: BuffInstance = {
      id: 'burn-1', buffId: 'burn', sourceId: 'a', targetId: 'b',
      stacks: 1, duration: 2, values: { amount: 30 }
    };
    ctx.applyBuff('b', instance);
    const timingCtx: TurnTimingContext = {
      key: 'turnStart', round: 1, unit: unitB, source: null, target: null, runtime, data: { fireCount: 2 }
    };

    settleBuffTrigger(ctx, instance, timingCtx);

    const damageEvents = events.filter(e => e.key === 'effectApplied' && e.data.kind === 'damage');
    expect(damageEvents).toHaveLength(2);
    expect(instance.duration).toBe(1);
    expect(instance.stacks).toBe(1);
  });

  it('灼烧按触发递减：每回合触发一次，归零移除', () => {
    const units = [makeUnit('a', 'hero'), makeUnit('b', 'enemy')];
    const { result, ctx } = runBuffBattle(units, 2, (battle) => {
      battle.applyBuff('b', {
        id: 'burn-1',
        buffId: 'burn',
        sourceId: 'a',
        targetId: 'b',
        stacks: 1,
        duration: 2,
        values: { amount: 30 }
      });
    });

    const burnTicks = result.events.filter(
      e => e.key === 'effectApplied' && e.data.kind === 'damage' && e.data.effectId === 'burn_tick'
    );
    expect(burnTicks).toHaveLength(2);
    expect(ctx.getBuff('b', 'burn')).toBeUndefined();
  });

  it('战意每次触发先清旧 Modifier 再挂新，最终只保留一份', () => {
    const units = [makeUnit('a', 'hero'), makeUnit('b', 'enemy')];
    const { ctx } = runBuffBattle(units, 2, (battle) => {
      battle.applyBuff('a', {
        id: 'war-1', buffId: 'warSpirit', sourceId: 'b', targetId: 'a',
        stacks: 1, duration: null, values: {}
      });
    });

    const warMods = ctx.getModifiers('a', 'stat').filter(m => m.source === 'war-1');
    expect(warMods).toHaveLength(1);
    expect(warMods[0].value).toBe(1.5);
  });

  it('折焰按层数消耗：攻击后附加伤害，归零移除', () => {
    const units = [makeUnit('a', 'hero', 1000, 10), makeUnit('b', 'enemy', 1000, 10)];
    const attackAction = (unit: BattleUnitRuntime, runtime: TurnRuntime): void => {
      const target = runtime
        .getLivingUnits(unit.side === 'hero' ? 'enemy' : 'hero')[0];
      if (!target) return;
      runtime.dealDamage(target.id, 1, unit.id, { kind: 'attack' });
      runtime.dispatchEvent('attackAfter', {
        unitId: unit.id,
        sourceId: unit.id,
        targetId: target.id,
        data: {}
      });
    };

    const { result, ctx } = runBuffBattle(units, 2, (battle) => {
      battle.applyBuff('a', {
        id: 'fold-1',
        buffId: 'foldFlame',
        sourceId: 'b',
        targetId: 'a',
        stacks: 2,
        duration: null,
        values: { amount: 5 }
      });
    }, attackAction);

    const bonusHits = result.events.filter(
      e => e.key === 'effectApplied' && e.data.kind === 'damage' && e.data.effectId === 'fold_flame_bonus'
    );
    expect(bonusHits).toHaveLength(2);
    expect(ctx.getBuff('a', 'foldFlame')).toBeUndefined();
  });
});
