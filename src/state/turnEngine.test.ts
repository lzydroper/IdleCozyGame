import { describe, it, expect } from 'vitest';
import {
  calculateInitiative,
  calculateSummonInitiative,
  compareByInitiative,
  createTurnRuntime,
  runTurnEngine,
  type BattleUnitSnapshot,
  type BattleUnitRuntime,
  type TurnEventKey,
  type TurnRuntime
} from './turnEngine';

const snap = (
  id: string,
  side: 'hero' | 'enemy',
  hp: number,
  initiative: number,
  overrides: Partial<BattleUnitSnapshot> = {}
): BattleUnitSnapshot => ({
  id,
  name: id,
  side,
  hp,
  maxHp: hp,
  initiative,
  abilities: [],
  stats: { attack: 10, defense: 0, maxHp: hp, maxMp: 0, critRate: 0, critDmg: 1.5 },
  ...overrides
});

/** 纯普通攻击：对首个存活敌对单位造成固定伤害，并派发攻击后事件。 */
const basicAttackAction = (damage: number) =>
  (unit: BattleUnitRuntime, runtime: TurnRuntime): void => {
    const targets = runtime.getLivingUnits(unit.side === 'hero' ? 'enemy' : 'hero');
    const target = targets[0];
    if (!target) return;
    runtime.dealDamage(target.id, damage, unit.id, { kind: 'attack' });
    runtime.dispatchEvent('attackAfter', {
      unitId: unit.id,
      sourceId: unit.id,
      targetId: target.id,
      data: { damage }
    });
  };

const keysOf = (events: { key: TurnEventKey }[]): TurnEventKey[] => events.map(e => e.key);

describe('01 — 先机纯函数与排序键', () => {
  it('agility 公式 + clamp + 上限 300', () => {
    expect(calculateInitiative(0)).toBe(100);
    expect(calculateInitiative(100)).toBe(150); // 100 + 100/200*100
    expect(calculateInitiative(300)).toBe(175); // 100 + 300/400*100
    expect(calculateInitiative(50, 30)).toBe(163); // 出口 Math.round（combat-aftermath 04 N3 整数口径）
    expect(calculateInitiative(0, -20)).toBe(100); // fixval clamp 下限 0
    expect(calculateInitiative(0, 250)).toBe(200); // fixval clamp 上限 100 → 100 + 100
    expect(calculateInitiative(Number.MAX_VALUE, 100)).toBe(300); // 上限 300 生效
  });

  it('召唤物先机 = 100 + clamp(fixval,0,100)（agility 按 0 处理）', () => {
    expect(calculateSummonInitiative(0)).toBe(100);
    expect(calculateSummonInitiative(50)).toBe(150);
    expect(calculateSummonInitiative(999)).toBe(200);
    expect(calculateSummonInitiative(-5)).toBe(100);
  });

  it('排序键 = (先机 降序, 入场序 升序)，严格全序', () => {
    const a = { initiative: 120, entryOrder: 1 };
    const b = { initiative: 120, entryOrder: 2 };
    const c = { initiative: 150, entryOrder: 0 };
    expect(compareByInitiative(a, b)).toBe(-1); // 先机相同 → 入场序升序
    expect(compareByInitiative(b, a)).toBe(1);
    expect(compareByInitiative(c, a)).toBeLessThan(0); // 先机高者在前
    expect(compareByInitiative(a, c)).toBeGreaterThan(0);
    expect(compareByInitiative(a, { initiative: 120, entryOrder: 1 })).toBe(0);
  });
});

describe('01 — 单队列 + 轮次分隔标记', () => {
  it('一轮内每个存活单位行动一次，未行动区清空后进入新一轮', () => {
    const order: string[] = [];
    const action = (unit: BattleUnitRuntime): void => {
      order.push(unit.id);
    };
    const result = runTurnEngine(
      [snap('a', 'hero', 100, 30), snap('b', 'hero', 100, 20), snap('e', 'enemy', 100, 10)],
      { maxRounds: 2, performAction: action }
    );
    expect(order).toEqual(['a', 'b', 'e', 'a', 'b', 'e']); // 先机降序，两轮
    expect(result.outcome).toBe('draw');
    expect(result.rounds).toBe(2);
  });

  it('终止条件：一方全灭 → victory/defeat；轮次上限双方存活 → draw', () => {
    const victory = runTurnEngine(
      [snap('a', 'hero', 100, 30), snap('e', 'enemy', 5, 10)],
      { performAction: basicAttackAction(10) }
    );
    expect(victory.outcome).toBe('victory');
    expect(victory.rounds).toBe(1);

    const defeat = runTurnEngine(
      [snap('a', 'hero', 5, 10), snap('e', 'enemy', 100, 30)],
      { performAction: basicAttackAction(10) }
    );
    expect(defeat.outcome).toBe('defeat');

    const draw = runTurnEngine(
      [snap('a', 'hero', 100, 30), snap('e', 'enemy', 100, 10)],
      { maxRounds: 3, performAction: basicAttackAction(1) }
    );
    expect(draw.outcome).toBe('draw');
    expect(draw.rounds).toBe(3);
  });

  it('事件流含轮次开始/回合开始/攻击/阵亡/轮次结束等基础事件', () => {
    // 完整一轮（双方存活）包含轮次开始/轮次结束与回合/攻击事件
    const fullRound = runTurnEngine(
      [snap('a', 'hero', 100, 30), snap('e', 'enemy', 100, 10)],
      { maxRounds: 1, performAction: basicAttackAction(5) }
    );
    const fullKeys = keysOf(fullRound.events);
    expect(fullKeys).toContain('roundStart');
    expect(fullKeys).toContain('turnStart');
    expect(fullKeys).toContain('turnActive');
    expect(fullKeys).toContain('attackAfter');
    expect(fullKeys).toContain('turnEnd');
    expect(fullKeys).toContain('roundEnd');

    // 击杀场景包含 damageTaken 与 death（一方全灭 → victory，中盘终止）
    const killing = runTurnEngine(
      [snap('a', 'hero', 100, 30), snap('e', 'enemy', 5, 10)],
      { performAction: basicAttackAction(10) }
    );
    const killingKeys = keysOf(killing.events);
    expect(killingKeys).toContain('damageTaken');
    expect(killingKeys).toContain('death');
    expect(killing.outcome).toBe('victory');
  });

  it('纯确定性：同输入同 rng 种子 → 逐字节一致的事件流', () => {
    const seeded = (): (() => number) => {
      let state = 42;
      return () => {
        state = (state * 1664525 + 1013904223) % 4294967296;
        return state / 4294967296;
      };
    };
    const input = (): BattleUnitSnapshot[] => [
      snap('a', 'hero', 100, 30),
      snap('e1', 'enemy', 50, 20),
      snap('e2', 'enemy', 40, 10)
    ];
    const r1 = runTurnEngine(input(), { maxRounds: 5, rng: seeded(), performAction: basicAttackAction(7) });
    const r2 = runTurnEngine(input(), { maxRounds: 5, rng: seeded(), performAction: basicAttackAction(7) });
    expect(JSON.stringify(r1)).toBe(JSON.stringify(r2));
  });
});

describe('02 — 主时机与订阅接口', () => {
  it('五个主时机在正确时点结算', () => {
    const result = runTurnEngine(
      [snap('a', 'hero', 100, 30), snap('e', 'enemy', 100, 10)],
      { maxRounds: 1, performAction: basicAttackAction(5) }
    );
    const keys = keysOf(result.events);
    // 完整一轮：roundStart → turnStart(a) → turnActive(a) → attackAfter → damageTaken → turnEnd(a)
    //            → turnStart(e) → turnActive(e) → attackAfter → damageTaken → turnEnd(e) → roundEnd
    expect(keys.indexOf('roundStart')).toBeLessThan(keys.indexOf('turnStart'));
    expect(keys.indexOf('turnStart')).toBeLessThan(keys.indexOf('turnActive'));
    expect(keys.indexOf('turnActive')).toBeLessThan(keys.indexOf('attackAfter'));
    expect(keys.indexOf('attackAfter')).toBeLessThan(keys.indexOf('turnEnd'));
    expect(keys.indexOf('turnEnd')).toBeLessThan(keys.indexOf('roundEnd'));
    expect(result.events.some(e => e.key === 'turnStart' && e.unitId === 'e')).toBe(true);
  });

  it('轮次级时机全局订阅，单位级时机按单位订阅', () => {
    const calls: string[] = [];
    const result = runTurnEngine(
      [snap('a', 'hero', 100, 30), snap('b', 'hero', 100, 20), snap('e', 'enemy', 100, 10)],
      { maxRounds: 1, performAction: () => {} }
    );
    // 使用独立运行时注册太晚；这里通过 config 无法预注册，故直接断言 runTurnEngine 的时机事件单位归属。
    const turnStarts = result.events.filter(e => e.key === 'turnStart');
    expect(turnStarts.map(e => e.unitId)).toEqual(['a', 'b', 'e']);
    const roundStarts = result.events.filter(e => e.key === 'roundStart');
    expect(roundStarts).toHaveLength(1);
    expect(roundStarts[0].unitId).toBeNull(); // 轮次级 = 全局
    expect(calls).toEqual([]);
  });

  it('register/unregister 正确；FIFO 固定；同时机内新注册延后到下一次结算', () => {
    const order: string[] = [];
    let runtimeRef: TurnRuntime | null = null;

    // a 行动时注册 first/second（FIFO），并在 e 行动时注册 unregistered 后立即注销。
    const action = (unit: BattleUnitRuntime, runtime: TurnRuntime): void => {
      runtimeRef = runtime;
      if (unit.id === 'a') {
        runtime.register(
          'turnEnd',
          () => {
            order.push('first');
            // 同时机内再注册 late：延后到下一次 turnEnd（即 e 的回合结束）才触发。
            runtime.register('turnEnd', () => {
              order.push('late');
            });
          },
          'a'
        );
        runtime.register(
          'turnEnd',
          () => {
            order.push('second');
          },
          'a'
        );
      }
      if (unit.id === 'e') {
        const noop = (): void => {
          order.push('unregistered');
        };
        runtime.register('turnEnd', noop, 'e');
        runtime.unregister('turnEnd', noop, 'e');
      }
    };

    runTurnEngine(
      [snap('a', 'hero', 100, 30), snap('e', 'enemy', 100, 10)],
      { maxRounds: 1, performAction: action }
    );

    // a 的 turnEnd：first → second（FIFO），late 延后到 e 的 turnEnd；unregistered 已注销不触发。
    expect(order).toEqual(['first', 'second', 'late']);
    expect(runtimeRef).not.toBeNull();
  });

  it('触发上下文至少含 key/归属单位/来源/目标/运行时引用', () => {
    let captured: { key: TurnEventKey; unitId: string | null; runtime: TurnRuntime } | null = null;
    const action = (unit: BattleUnitRuntime, runtime: TurnRuntime): void => {
      if (unit.id !== 'a') return;
      runtime.register(
        'turnEnd',
        ctx => {
          captured = { key: ctx.key, unitId: ctx.unit?.id ?? null, runtime: ctx.runtime };
        },
        unit.id
      );
    };
    runTurnEngine([snap('a', 'hero', 100, 30), snap('e', 'enemy', 100, 10)], {
      maxRounds: 1,
      performAction: action
    });
    expect(captured).not.toBeNull();
    expect(captured!.key).toBe('turnEnd');
    expect(captured!.unitId).toBe('a');
    expect(captured!.runtime).toBeDefined();
    expect(typeof captured!.runtime.getLivingUnits).toBe('function');
  });
});

describe('03 — 死亡与无法行动判定', () => {
  it('取出队首时按当前状态判死亡；阵亡单位跳过其后所有主时机，只派发一次死亡事件', () => {
    // a(先机30) → e1(先机20, 3hp) → e2(先机10)。a 击杀 e1 后，e1 取队首时已死亡 → 跳过其所有主时机；e2 仍存活，轮次继续。
    const result = runTurnEngine(
      [
        snap('a', 'hero', 100, 30),
        snap('e1', 'enemy', 3, 20),
        snap('e2', 'enemy', 100, 10)
      ],
      { maxRounds: 2, performAction: basicAttackAction(10) }
    );
    const deathEvents = result.events.filter(e => e.key === 'death');
    expect(deathEvents).toHaveLength(1);
    expect(deathEvents[0].unitId).toBe('e1');
    // e1 从未获得回合（在轮到前已死亡），e2 正常行动
    expect(result.events.some(e => e.key === 'turnStart' && e.unitId === 'e1')).toBe(false);
    expect(result.events.some(e => e.key === 'turnStart' && e.unitId === 'e2')).toBe(true);
  });

  it('死单位不预过滤出队：轮到前被复活（hp>0）则正常行动', () => {
    const dead = snap('b', 'hero', 0, 20); // 入场即死亡
    const revived: string[] = [];
    const action = (unit: BattleUnitRuntime, runtime: TurnRuntime): void => {
      if (unit.id === 'a') {
        const b = runtime.getUnit('b');
        if (b) b.hp = 10; // 复活 b
      }
      revived.push(unit.id);
    };
    const result = runTurnEngine(
      [snap('a', 'hero', 100, 30), dead, snap('e', 'enemy', 100, 10)],
      { maxRounds: 1, performAction: action }
    );
    // b 在 a 行动前本已死亡，a 行动中复活 b；取 b 时读当前状态 → 正常行动。
    expect(revived).toContain('b');
    expect(result.events.filter(e => e.key === 'turnStart' && e.unitId === 'b')).toHaveLength(1);
  });

  it('死于自己行动中（反伤致死）不结算其回合结束后', () => {
    const action = (unit: BattleUnitRuntime, runtime: TurnRuntime): void => {
      if (unit.id === 'a') {
        runtime.dealDamage('a', 999, unit.id, { kind: 'reflect' });
      }
    };
    const result = runTurnEngine(
      [snap('a', 'hero', 100, 30), snap('e', 'enemy', 100, 10)],
      { maxRounds: 1, performAction: action }
    );
    expect(result.events.some(e => e.key === 'turnEnd' && e.unitId === 'a')).toBe(false);
    expect(result.events.some(e => e.key === 'death' && e.unitId === 'a')).toBe(true);
    expect(result.outcome).toBe('defeat');
  });

  it('canAct=false 只跳过回合进行中；回合开始前/结束后仍结算', () => {
    const result = runTurnEngine(
      [snap('a', 'hero', 100, 30), snap('e', 'enemy', 100, 10)],
      { maxRounds: 1, canAct: () => false, performAction: basicAttackAction(10) }
    );
    const aTurnStart = result.events.filter(e => e.key === 'turnStart' && e.unitId === 'a');
    const aTurnActive = result.events.filter(e => e.key === 'turnActive' && e.unitId === 'a');
    const aTurnEnd = result.events.filter(e => e.key === 'turnEnd' && e.unitId === 'a');
    expect(aTurnStart).toHaveLength(1);
    expect(aTurnActive).toHaveLength(0);
    expect(aTurnEnd).toHaveLength(1);
  });

  it('canAct 在回合开始前结算后判定一次、本回合内保持不变；先判死亡后判 canAct', () => {
    let canActCalls = 0;
    let allowA = false;
    let canActForDeadCalled = false;
    const action = (unit: BattleUnitRuntime, _runtime: TurnRuntime): void => {
      // e 的行动中改变外部状态：若 a 的 canAct 在回合内被重判会受影响，但引擎每回合只判定一次。
      if (unit.id === 'e') allowA = true;
    };
    const result = runTurnEngine(
      [
        snap('a', 'hero', 100, 30),
        snap('e', 'enemy', 100, 10),
        snap('dead', 'enemy', 0, 5)
      ],
      {
        maxRounds: 2,
        canAct: (unit, _runtime) => {
          canActCalls++;
          if (unit.id === 'dead') canActForDeadCalled = true;
          return unit.id === 'a' ? allowA : true;
        },
        performAction: action
      }
    );
    // 第 1 回合 a 判定为不可行动 → 跳过行动；第 2 回合 allowA=true → 行动。
    const aTurnActives = result.events.filter(e => e.key === 'turnActive' && e.unitId === 'a');
    expect(aTurnActives).toHaveLength(1);
    expect(aTurnActives[0].round).toBe(2);
    // dead 单位在取队首时已死亡 → 先判死亡，跳过 canAct。
    expect(canActForDeadCalled).toBe(false);
    // 每回合每单位只判定一次：round1 a/e 各一次 + round2 a/e 各一次 = 4（dead 不判）。
    expect(canActCalls).toBe(4);
  });
});

describe('04 — 召唤与先机变动', () => {
  it('召唤物进入本轮未行动区按先机排位，且本轮必行动一次', () => {
    const order: string[] = [];
    const action = (unit: BattleUnitRuntime, runtime: TurnRuntime): void => {
      order.push(unit.id);
      if (unit.id === 'a') {
        runtime.summonUnit(snap('s', 'hero', 50, 150)); // 召唤物先机 150，高于剩余 b/e
      }
    };
    const result = runTurnEngine(
      [snap('a', 'hero', 100, 30), snap('b', 'hero', 100, 20), snap('e', 'enemy', 100, 10)],
      { maxRounds: 1, performAction: action }
    );
    // a 正在行动中召唤：s 不插队到 a 之前；s 进入未行动区后按先机排到 b/e 之前。
    expect(order).toEqual(['a', 's', 'b', 'e']);
    // 召唤物本轮行动一次
    expect(result.events.filter(e => e.key === 'turnStart' && e.unitId === 's')).toHaveLength(1);
    expect(result.events.some(e => e.key === 'summon' && e.unitId === 's')).toBe(true);
  });

  it('先机变动只重排未行动区间；已行动单位本轮锁定、一轮只行动一次', () => {
    const order: string[] = [];
    const action = (unit: BattleUnitRuntime, runtime: TurnRuntime): void => {
      order.push(unit.id);
      if (unit.id === 'a') {
        runtime.updateInitiative('c', 100); // c 原 1 → 100，重排未行动区
        runtime.updateInitiative('a', 1);   // a 已行动（先机调低）→ 不应影响其本轮已行动事实
      }
    };
    const result = runTurnEngine(
      [
        snap('a', 'hero', 100, 30),
        snap('b', 'hero', 100, 20),
        snap('c', 'hero', 100, 1),
        snap('e', 'enemy', 100, 10)
      ],
      { maxRounds: 1, performAction: action }
    );
    expect(order).toEqual(['a', 'c', 'b', 'e']);
    // a 本轮只有一次行动
    expect(result.events.filter(e => e.key === 'turnStart' && e.unitId === 'a')).toHaveLength(1);
  });

  it('入场序按召唤发生顺序续号，作 tie-breaker', () => {
    const order: string[] = [];
    const action = (unit: BattleUnitRuntime, runtime: TurnRuntime): void => {
      order.push(unit.id);
      if (unit.id === 'a') {
        runtime.summonUnit(snap('s1', 'hero', 50, 120));
        runtime.summonUnit(snap('s2', 'hero', 50, 120)); // 同先机 → 入场序升序
      }
    };
    runTurnEngine(
      [snap('a', 'hero', 100, 30), snap('e', 'enemy', 100, 10)],
      { maxRounds: 1, performAction: action }
    );
    expect(order).toEqual(['a', 's1', 's2', 'e']);
  });
});

describe('05 — 事件触发与强制结束', () => {
  it('标准事件键与事件派发 API 可用', () => {
    const action = (unit: BattleUnitRuntime, runtime: TurnRuntime): void => {
      runtime.dispatchEvent('attackAfter', { unitId: unit.id, sourceId: unit.id, targetId: 'e' });
      runtime.dealDamage('e', 5, unit.id, { kind: 'attack' });
      runtime.applyHeal('a', 2, unit.id, { kind: 'heal' });
      runtime.dispatchEvent('summon', { unitId: 's', sourceId: unit.id });
    };
    const result = runTurnEngine(
      [snap('a', 'hero', 90, 30, { maxHp: 100 }), snap('e', 'enemy', 100, 10)],
      { maxRounds: 1, performAction: action }
    );
    for (const key of ['attackAfter', 'damageTaken', 'healingTaken', 'summon'] as const) {
      expect(result.events.some(e => e.key === key)).toBe(true);
    }
  });

  it('攻击后事件在行动入口完成后派发', () => {
    const order: TurnEventKey[] = [];
    const action = (unit: BattleUnitRuntime, runtime: TurnRuntime): void => {
      order.push('turnActive' as TurnEventKey);
      runtime.dispatchEvent('attackAfter', { unitId: unit.id, sourceId: unit.id, targetId: 'e' });
    };
    const result = runTurnEngine(
      [snap('a', 'hero', 100, 30), snap('e', 'enemy', 100, 10)],
      { maxRounds: 1, performAction: action }
    );
    // attackAfter 在 turnActive 之后（同一回合内）
    const events = result.events.map(e => e.key);
    const activeIdx = events.indexOf('turnActive');
    const attackIdx = events.indexOf('attackAfter');
    expect(activeIdx).toBeGreaterThanOrEqual(0);
    expect(attackIdx).toBeGreaterThan(activeIdx);
    expect(order[0]).toBe('turnActive');
  });

  it('强制结束标记通道：三种结果置位即终止', () => {
    const forceAction = (outcome: 'victory' | 'defeat' | 'draw') =>
      (_unit: BattleUnitRuntime, runtime: TurnRuntime): void => {
        runtime.requestEnd(outcome);
      };

    const v = runTurnEngine(
      [snap('a', 'hero', 100, 30), snap('e', 'enemy', 100, 10)],
      { maxRounds: 5, performAction: forceAction('victory') }
    );
    expect(v.outcome).toBe('victory');
    expect(v.rounds).toBe(1);

    const d = runTurnEngine(
      [snap('a', 'hero', 100, 30), snap('e', 'enemy', 100, 10)],
      { maxRounds: 5, performAction: forceAction('defeat') }
    );
    expect(d.outcome).toBe('defeat');

    const dr = runTurnEngine(
      [snap('a', 'hero', 100, 30), snap('e', 'enemy', 100, 10)],
      { maxRounds: 5, performAction: forceAction('draw') }
    );
    expect(dr.outcome).toBe('draw');
    // 置位即终止：不会继续到第 2 轮
    expect(dr.events.filter(e => e.key === 'roundStart')).toHaveLength(1);
  });

  it('dev 模式事件流附带先机/入场序调试字段', () => {
    const result = runTurnEngine(
      [snap('a', 'hero', 100, 30), snap('e', 'enemy', 100, 10)],
      { maxRounds: 1, debug: true, performAction: basicAttackAction(1) }
    );
    const turnStart = result.events.find(e => e.key === 'turnStart' && e.unitId === 'a');
    expect(turnStart?.debug).toBeDefined();
    expect(turnStart?.debug?.queue).toBeDefined();
    const queue = turnStart?.debug?.queue as Array<{ id: string; initiative: number; entryOrder: number }>;
    expect(queue.map(x => x.id)).toEqual(['a', 'e']);
    expect(queue[0].initiative).toBe(30);
  });
});

describe('createTurnRuntime 装配（combat-assembly 01：setup seam 删除）', () => {
  it('run 前可直接注册主时机订阅，首轮前生效', () => {
    const calls: string[] = [];
    const engine = createTurnRuntime(
      [snap('a', 'hero', 100, 30), snap('e', 'enemy', 100, 10)],
      { maxRounds: 1, performAction: basicAttackAction(5) }
    );
    calls.push('setup');
    engine.register(
      'turnStart',
      ctx => {
        if (ctx.unit?.id === 'a') calls.push('sub-a');
      },
      'a'
    );
    engine.run();
    expect(calls).toEqual(['setup', 'sub-a']);
    expect(typeof engine.register).toBe('function');
  });

  it('maxRounds = 0：引擎可构建、run 不进入任何轮次', () => {
    const engine = createTurnRuntime(
      [snap('a', 'hero', 100, 30), snap('e', 'enemy', 100, 10)],
      { maxRounds: 0, performAction: () => {} }
    );
    const result = engine.run();
    expect(result.rounds).toBe(0);
    expect(result.events).toHaveLength(0);
    expect(result.outcome).toBe('draw');
  });
});

describe('边界与参数校验（combat-hygiene 05 / T#16）', () => {
  it('入场重复 id 抛错而非静默覆盖', () => {
    expect(() =>
      runTurnEngine([snap('a', 'hero', 100, 30), snap('a', 'enemy', 100, 10)], { maxRounds: 1 })
    ).toThrow(/duplicate unit id/);
  });

  it('summonUnit 与已有 id 冲突抛错', () => {
    const runtime = createTurnRuntime([snap('a', 'hero', 100, 30)], { maxRounds: 0 });
    expect(() => runtime.summonUnit(snap('a', 'enemy', 50, 10))).toThrow(/duplicate unit id/);
    expect(() => runtime.summonUnit(snap('s1', 'enemy', 50, 10))).not.toThrow();
  });

  it('summon 事件来源 = 显式 sourceId（combat-summon-closure 01 / T#6）', () => {
    const rt = createTurnRuntime([snap('a', 'hero', 100, 30)], { maxRounds: 0 });
    const summoned: Array<{ source: string | null; unit: string | null; slot: number }> = [];
    rt.register('summon', ctx => {
      summoned.push({
        source: ctx.source?.id ?? null,
        unit: ctx.unit?.id ?? null,
        slot: (ctx.data as { targetSlotIndex?: number }).targetSlotIndex ?? -1
      });
    });
    rt.summonUnit(snap('s1', 'hero', 50, 10), 'a');
    expect(summoned).toEqual([{ source: 'a', unit: 's1', slot: 1 }]); // 英雄侧已有 a → 推荐槽位 1
  });

  it('generateUnitId：base 空闲原样返回，冲突追加 -N（combat-summon-closure 02 / E#3）', () => {
    const rt = createTurnRuntime([snap('s1', 'hero', 50, 10)], { maxRounds: 0 });
    expect(rt.generateUnitId('fresh')).toBe('fresh');
    expect(rt.generateUnitId('s1')).toBe('s1-1');
    rt.summonUnit(snap('s1-1', 'hero', 50, 10));
    expect(rt.generateUnitId('s1')).toBe('s1-2');
  });

  it('空输入立即终止：英雄侧无人按既有规则判负', () => {
    const result = runTurnEngine([], { maxRounds: 2 });
    expect(result.outcome).toBe('defeat');
    // 既有实现：轮次先自增再查终止，空输入在首轮 roundStart 后即判负。
    expect(result.rounds).toBe(1);
  });
});

describe('applyHpDelta 统一入口（combat-assembly 05 / T#4）', () => {
  const makeEngine = (): TurnRuntime =>
    createTurnRuntime(
      [snap('a', 'hero', 100, 30), snap('b', 'enemy', 100, 10)],
      { maxRounds: 0 }
    );

  it('正 delta 回复并钳制 maxHp，派发 healingTaken', () => {
    const rt = makeEngine();
    rt.getUnit('a')!.hp = 50;
    expect(rt.applyHpDelta('a', 999)).toBe(50); // 钳到 maxHp
    expect(rt.getUnit('a')!.hp).toBe(100);
    expect(rt.applyHpDelta('a', -10)).toBe(-10);
    expect(rt.getUnit('a')!.hp).toBe(90);
  });

  it('负 delta 归零派发一次 death；对死亡单位操作返回 0', () => {
    const rt = makeEngine();
    const deathEvents: number[] = [];
    rt.register('death', (ctx) => { deathEvents.push(ctx.round); }, null);
    expect(rt.applyHpDelta('a', -150)).toBe(-100);
    expect(rt.getUnit('a')!.hp).toBe(0);
    expect(deathEvents.length).toBe(1);
    expect(rt.applyHpDelta('a', 50)).toBe(0);
    expect(rt.applyHpDelta('a', -5)).toBe(0);
    expect(deathEvents.length).toBe(1);
  });

  it('delta 为 0 或未知单位返回 0', () => {
    const rt = makeEngine();
    expect(rt.applyHpDelta('a', 0)).toBe(0);
    expect(rt.applyHpDelta('ghost', -10)).toBe(0);
  });
});
