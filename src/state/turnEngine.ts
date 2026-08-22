/**
 * Turn 引擎（combat-turn）：纯确定性回合流程引擎。
 *
 * 职责边界（见 .scratch/combat-turn/spec.md）：
 * - 只接收「已结算的参战单位快照」，驱动 轮次 → 回合 → 时机/事件 流程；
 * - 输出 { outcome, events }，不接触 RNG（RNG 以函数参数注入）；
 * - 先机排序、队列/轮次边界、死亡判定、canAct 谓词、时机/事件订阅表全部纯函数化；
 * - 不硬编码眩晕等控制枚举、不硬编码伤害公式与目标选择（属于 Ability/Effect 模块）。
 */

import type { BattleUnitStats, BattleUnitStatParams } from './battleTypes';
import { cloneStatParams } from './battleTypes';
import type { ResolvedAbility } from './abilityTypes';

// === 基础类型 ===

export type UnitSide = 'hero' | 'enemy';

export type BattleOutcome = 'victory' | 'defeat' | 'draw';

/** 战斗单位快照：Turn 的输入。先机在战前算好传入。 */
export interface BattleUnitSnapshot {
  id: string;
  name: string;
  side: UnitSide;
  hp: number;
  maxHp: number;
  initiative: number;
  abilities: ResolvedAbility[];
  stats: BattleUnitStats;
  /** 入场时当前魔力；缺省由 stats.maxMp 初始化。 */
  currentMp?: number;
  /** 战斗内面板重算配方；缺省时 resolveStats 回退到 stats 快照。 */
  statParams?: BattleUnitStatParams;
}

/** 一次性可变运行时战斗单位：入场时由快照创建，战后整体丢弃。 */
export interface BattleUnitRuntime {
  id: string;
  name: string;
  side: UnitSide;
  hp: number;
  maxHp: number;
  initiative: number;
  abilities: ResolvedAbility[];
  stats: BattleUnitStats;
  /** 当前魔力（战斗内可变）。 */
  currentMp?: number;
  /** 战斗内面板重算配方。 */
  statParams?: BattleUnitStatParams;
  /** 全局单调递增入场序（英雄上阵序 → 敌人配置序 → 召唤序续号），作 tie-breaker。 */
  entryOrder: number;
}

// === 时机 / 事件 ===

/** 轮次主时机（固定骨架）。 */
export const TURN_TIMING_KEYS = ['roundStart', 'turnStart', 'turnActive', 'turnEnd', 'roundEnd'] as const;
export type TurnTimingKey = (typeof TURN_TIMING_KEYS)[number];

/** 标准细粒度战斗事件键（可扩展）。 */
export const BATTLE_EVENT_KEYS = ['abilityUsed', 'attackAfter', 'damageTaken', 'healingTaken', 'death', 'summon', 'effectApplied'] as const;
export type BattleEventKey = (typeof BATTLE_EVENT_KEYS)[number];

export type TurnEventKey = TurnTimingKey | BattleEventKey | (string & {});

/** 事件流条目：时机结算与细粒度事件统一序列。 */
export interface BattleEvent {
  /** 全局单调递增序号，保证事件流确定性与展示顺序。 */
  seq: number;
  round: number;
  key: TurnEventKey;
  /** 当前回合归属单位（事件/时机的“单位级”归属）。 */
  unitId: string | null;
  /** 来源单位。 */
  sourceId: string | null;
  /** 目标单位。 */
  targetId: string | null;
  /** 展示名（引擎从单位表解析；消费端不应硬编码 id→名称映射）。 */
  unitName: string | null;
  sourceName: string | null;
  targetName: string | null;
  data: Record<string, unknown>;
  /** dev 模式（config.debug）附带的调试字段；玩家 UI 不读取。 */
  debug?: Record<string, unknown>;
}

/** 触发上下文：时机/事件结算时传给订阅者。 */
export interface TurnTimingContext {
  key: TurnEventKey;
  round: number;
  /** 当前回合归属单位（全局时机为 null）。 */
  unit: BattleUnitRuntime | null;
  source: BattleUnitRuntime | null;
  target: BattleUnitRuntime | null;
  /** 战斗运行时引用（只读）。 */
  runtime: TurnRuntime;
  data: Record<string, unknown>;
}

export type TurnSubscriber = (ctx: TurnTimingContext) => void;

/** 事件派发选项。 */
export interface DispatchEventOptions {
  unitId?: string | null;
  sourceId?: string | null;
  targetId?: string | null;
  data?: Record<string, unknown>;
  debug?: Record<string, unknown>;
}

// === 先机纯函数 ===

/**
 * 先机公式：100 + agility/(agility+100)*100 + clamp(fixval,0,100)，上限 300。
 * 战斗中先机变动只以固定 int 值加减 fixval（agility 不影响先机）。
 * 出口统一 Math.round 取整——战斗内与调试队列均为整数口径（combat-aftermath 04 N3）。
 */
export const calculateInitiative = (agility: number, fixval = 0): number => {
  const safeAgility = Math.max(0, agility);
  const clampedFix = Math.min(100, Math.max(0, fixval));
  return Math.round(Math.min(300, 100 + (safeAgility / (safeAgility + 100)) * 100 + clampedFix));
};

/** 召唤物先机单独计算：agility 按 0 处理，先机 = 100 + clamp(fixval,0,100)。 */
export const calculateSummonInitiative = (fixval: number): number =>
  Math.min(300, 100 + Math.min(100, Math.max(0, fixval)));

/** 排序键 = (先机 降序, 入场序 升序)，严格全序（入场序唯一 → 无并列）。 */
export const compareByInitiative = (
  a: Pick<BattleUnitRuntime, 'initiative' | 'entryOrder'>,
  b: Pick<BattleUnitRuntime, 'initiative' | 'entryOrder'>
): number => b.initiative - a.initiative || a.entryOrder - b.entryOrder;

// === 运行时接口 ===

export interface TurnRuntime {
  readonly round: number;
  readonly rng: () => number;
  /** 战斗内订阅表（每场独立实例，战斗结束整体清空）。register 返回注销句柄（Turn #7）。 */
  register(key: TurnEventKey, subscriber: TurnSubscriber, unitId?: string | null): () => void;
  unregister(key: TurnEventKey, subscriber: TurnSubscriber, unitId?: string | null): void;
  /** 派发细粒度事件（即时触发对应订阅者）。 */
  dispatchEvent(key: TurnEventKey, opts?: DispatchEventOptions): BattleEvent;
  /** 结算伤害：扣减 hp、派发 damageTaken 与 death（hp 归零时）。返回实际扣减量。 */
  dealDamage(targetId: string, amount: number, sourceId?: string | null, data?: Record<string, unknown>): number;
  /** 结算治疗：回复 hp（不超上限）、派发 healingTaken。返回实际治疗量。 */
  applyHeal(targetId: string, amount: number, sourceId?: string | null, data?: Record<string, unknown>): number;
  /** 统一 hp 变更入口（T#4）：正负双向、0/maxHp 双钳制、归零派发 death（死亡单位不重复结算）。返回带符号实际变化量。 */
  applyHpDelta(targetId: string, delta: number, sourceId?: string | null, data?: Record<string, unknown>): number;
  /** 先机变动：只重排本轮未行动区间；已行动单位本轮锁定。 */
  updateInitiative(unitId: string, initiative: number): void;
  /** 召唤物入场：进入本轮未行动区按先机排位，本轮必行动一次。 */
  summonUnit(snapshot: BattleUnitSnapshot): BattleUnitRuntime;
  /** 强制结束标记 + 结果（victory/defeat/draw），循环下一检查点即终止。 */
  requestEnd(outcome: BattleOutcome): void;
  getUnit(id: string): BattleUnitRuntime | undefined;
  /** 存活单位（按入场序），可选按阵营过滤。 */
  getLivingUnits(side?: UnitSide): BattleUnitRuntime[];
}

// === 引擎配置与结果 ===

export interface TurnConfig {
  /** 轮次上限（语义 = 轮次，默认 60）；超限双方存活 = 平局。 */
  maxRounds?: number;
  /** RNG 函数参数注入：生产传 Math.random、测试传固定种子。 */
  rng?: () => number;
  /** canAct 谓词（由 Buff 状态汇总；Turn 不硬编码眩晕等枚举）。默认恒 true。 */
  canAct?: (unit: BattleUnitRuntime, runtime: TurnRuntime) => boolean;
  /** 行动入口（Ability 层注入）：在「回合进行中」调用。默认空操作。 */
  performAction?: (unit: BattleUnitRuntime, runtime: TurnRuntime) => void;
  /** dev 模式：事件流附带调试字段（先机/入场序/队列），不污染玩家 UI。 */
  debug?: boolean;
}

export interface TurnResult {
  outcome: BattleOutcome;
  rounds: number;
  events: BattleEvent[];
  finalHp: Record<string, number>;
}

const DEFAULT_MAX_ROUNDS = 60;

interface SubscriptionRecord {
  key: TurnEventKey;
  unitId: string | null;
  subscriber: TurnSubscriber;
  order: number;
  active: boolean;
}

const cloneSnapshotUnit = (unit: BattleUnitSnapshot, entryOrder: number): BattleUnitRuntime => ({
  id: unit.id,
  name: unit.name,
  side: unit.side,
  hp: Math.max(0, unit.hp),
  maxHp: unit.maxHp,
  initiative: unit.initiative,
  abilities: unit.abilities.map(ability => ({ ...ability })),
  stats: { ...unit.stats },
  currentMp: unit.currentMp ?? unit.stats.maxMp,
  statParams: unit.statParams ? cloneStatParams(unit.statParams) : undefined,
  entryOrder
});

/**
 * 纯确定性回合引擎主 seam：
 * 给定参战单位快照 + 配置 + rng → { outcome, events }。
 * 无副作用、无外部依赖；同一输入 + 同一 rng 种子 → 逐字节一致的事件流。
 */
/**
 * 引擎实例：运行时 + 单发执行入口。
 * 装配顺序（combat-assembly 01 / M3）：createTurnRuntime → 装配层构建 BattleContext /
 * 注册订阅与被动 → engine.run()。TurnConfig 不再持有 setup seam。
 */
export type TurnEngine = TurnRuntime & { run: () => TurnResult };

export const createTurnRuntime = (
  units: readonly BattleUnitSnapshot[],
  config: TurnConfig = {}
): TurnEngine => {
  const maxRounds = config.maxRounds ?? DEFAULT_MAX_ROUNDS;
  const rng = config.rng ?? Math.random;
  const canActFn = config.canAct ?? (() => true);
  const performAction = config.performAction ?? (() => {});
  const debug = config.debug ?? false;

  const unitMap = new Map<string, BattleUnitRuntime>();
  let nextEntryOrder = 0;
  for (const unit of units) {
    if (unitMap.has(unit.id)) {
      // 参数校验（combat-hygiene 05 / T#16）：重复 id 静默覆盖会破坏先机排序与死亡判定，直接抛错。
      throw new Error(`runTurnEngine: duplicate unit id '${unit.id}'`);
    }
    unitMap.set(unit.id, cloneSnapshotUnit(unit, nextEntryOrder++));
  }

  const subscriptions: SubscriptionRecord[] = [];
  let nextSubscriptionOrder = 0;
  const events: BattleEvent[] = [];
  let nextEventSeq = 0;
  let round = 0;
  let forcedEnd: BattleOutcome | null = null;

  // 单优先队列 + 轮次分隔标记：queue[0..sep) = 本轮已行动（锁定），queue[sep..] = 本轮未行动（按先机排序）。
  const queue: string[] = Array.from(unitMap.keys());
  let sep = 0;

  const compareQueueIds = (a: string, b: string): number => {
    const ua = unitMap.get(a);
    const ub = unitMap.get(b);
    if (!ua || !ub) return 0;
    return compareByInitiative(ua, ub);
  };

  const sortPendingSection = (): void => {
    const pending = queue.slice(sep).sort(compareQueueIds);
    queue.splice(sep, pending.length, ...pending);
  };

  const queueDebug = (): Record<string, unknown> => ({
    queue: queue.map(id => {
      const u = unitMap.get(id)!;
      return { id, initiative: u.initiative, entryOrder: u.entryOrder };
    }),
    separator: sep
  });

  const pushEvent = (
    key: TurnEventKey,
    opts: DispatchEventOptions = {},
    debugExtra?: Record<string, unknown>
  ): BattleEvent => {
    const unit = opts.unitId ? unitMap.get(opts.unitId) : undefined;
    const source = opts.sourceId ? unitMap.get(opts.sourceId) : undefined;
    const target = opts.targetId ? unitMap.get(opts.targetId) : undefined;
    const event: BattleEvent = {
      seq: nextEventSeq++,
      round,
      key,
      unitId: opts.unitId ?? null,
      sourceId: opts.sourceId ?? null,
      targetId: opts.targetId ?? null,
      unitName: unit?.name ?? null,
      sourceName: source?.name ?? null,
      targetName: target?.name ?? null,
      data: opts.data ?? {}
    };
    const extraDebug = debugExtra ?? opts.debug;
    if (debug || opts.debug) {
      // debug 快照瘦身（combat-hygiene 05 / T#9）：全队列快照只附在先机可见性真正关心的时点，
      // 其余事件仅带轻量 extra 字段，避免事件流体积 O(事件数 × 单位数) 膨胀。
      const includeQueue =
        debug && (key === 'roundStart' || key === 'turnStart');
      event.debug = { ...(includeQueue ? queueDebug() : {}), ...extraDebug };
    }
    events.push(event);
    return event;
  };

  const getUnit = (id: string): BattleUnitRuntime | undefined => unitMap.get(id);

  const getLivingUnits = (side?: UnitSide): BattleUnitRuntime[] =>
    Array.from(unitMap.values())
      .filter(unit => unit.hp > 0 && (side === undefined || unit.side === side))
      .sort((a, b) => a.entryOrder - b.entryOrder);

  const register = (key: TurnEventKey, subscriber: TurnSubscriber, unitId: string | null = null): (() => void) => {
    subscriptions.push({ key, unitId, subscriber, order: nextSubscriptionOrder++, active: true });
    // 订阅句柄（combat-hygiene 04 / Turn #7）：注册/注销对称，调用方无需自存 subscriber 引用。
    return () => unregister(key, subscriber, unitId);
  };

  const unregister = (key: TurnEventKey, subscriber: TurnSubscriber, unitId: string | null = null): void => {
    for (const record of subscriptions) {
      if (record.key === key && record.subscriber === subscriber && record.unitId === unitId) {
        record.active = false;
      }
    }
    for (let i = subscriptions.length - 1; i >= 0; i--) {
      if (!subscriptions[i].active) subscriptions.splice(i, 1);
    }
  };

  /** 结算订阅者：FIFO 固定；同时机内新注册到同一时机的订阅延后到下一次结算（快照隔离）。 */
  const settleSubscribers = (
    key: TurnEventKey,
    unit: BattleUnitRuntime | null,
    source: BattleUnitRuntime | null,
    target: BattleUnitRuntime | null,
    data: Record<string, unknown>
  ): void => {
    const unitId = unit?.id ?? null;
    const snapshot = subscriptions.filter(
      record =>
        record.active &&
        record.key === key &&
        (record.unitId === null || record.unitId === unitId)
    );
    for (const record of snapshot) {
      if (!record.active) continue;
      record.subscriber({ key, round, unit, source, target, runtime, data });
    }
  };

  const settleTiming = (key: TurnTimingKey, unit: BattleUnitRuntime | null): void => {
    const event = pushEvent(key, { unitId: unit?.id ?? null, sourceId: null, targetId: null });
    settleSubscribers(key, unit, null, null, event.data);
  };

  const dispatchEvent = (key: TurnEventKey, opts: DispatchEventOptions = {}): BattleEvent => {
    const event = pushEvent(key, opts);
    const unit = opts.unitId ? unitMap.get(opts.unitId) ?? null : null;
    const source = opts.sourceId ? unitMap.get(opts.sourceId) ?? null : null;
    const target = opts.targetId ? unitMap.get(opts.targetId) ?? null : null;
    settleSubscribers(key, unit, source, target, event.data);
    return event;
  };

  const dealDamage = (
    targetId: string,
    amount: number,
    sourceId: string | null = null,
    data: Record<string, unknown> = {}
  ): number => {
    const target = unitMap.get(targetId);
    if (!target || target.hp <= 0) return 0;
    // 数值取整归公式层（combat-aftermath 04 N1）：此处只做 hp 钳制，不重复取整。
    const actual = Math.min(target.hp, Math.max(0, amount));
    target.hp -= actual;
    dispatchEvent('damageTaken', {
      unitId: targetId,
      sourceId,
      targetId,
      data: { ...data, amount: actual }
    });
    if (target.hp <= 0) {
      dispatchEvent('death', { unitId: targetId, sourceId, targetId, data });
    }
    return actual;
  };

  const applyHeal = (
    targetId: string,
    amount: number,
    sourceId: string | null = null,
    data: Record<string, unknown> = {}
  ): number => {
    const target = unitMap.get(targetId);
    if (!target || target.hp <= 0) return 0;
    // 数值取整归公式层（combat-aftermath 04 N1）：此处只做 maxHp 钳制，不重复取整。
    const actual = Math.min(target.maxHp - target.hp, Math.max(0, amount));
    if (actual <= 0) return 0;
    target.hp += actual;
    dispatchEvent('healingTaken', {
      unitId: targetId,
      sourceId,
      targetId,
      data: { ...data, amount: actual }
    });
    return actual;
  };

  // 统一 hp 变更入口（combat-assembly 05 / T#4）：为 dot / 护盾吸收 / 处决 / 复活提供受控 seam。
  const applyHpDelta = (
    targetId: string,
    delta: number,
    sourceId: string | null = null,
    data: Record<string, unknown> = {}
  ): number => {
    const target = unitMap.get(targetId);
    if (!target || target.hp <= 0 || delta === 0) return 0;
    const next = Math.min(target.maxHp, Math.max(0, target.hp + delta));
    const actual = next - target.hp;
    if (actual === 0) return 0;
    target.hp = next;
    if (delta < 0) {
      dispatchEvent('damageTaken', {
        unitId: targetId,
        sourceId,
        targetId,
        data: { ...data, amount: -actual }
      });
    } else {
      dispatchEvent('healingTaken', {
        unitId: targetId,
        sourceId,
        targetId,
        data: { ...data, amount: actual }
      });
    }
    if (target.hp <= 0) {
      dispatchEvent('death', { unitId: targetId, sourceId, targetId, data });
    }
    return actual;
  };

  const updateInitiative = (unitId: string, initiative: number): void => {
    const unit = unitMap.get(unitId);
    if (!unit) return;
    unit.initiative = initiative;
    const index = queue.indexOf(unitId);
    if (index >= 0 && index >= sep) {
      sortPendingSection();
    }
  };

  const summonUnit = (snapshot: BattleUnitSnapshot): BattleUnitRuntime => {
    if (unitMap.has(snapshot.id)) {
      // 防覆盖校验（combat-hygiene 05 / T#16）：召唤 id 与已有单位冲突会静默顶替原单位，直接抛错。
      throw new Error(`summonUnit: duplicate unit id '${snapshot.id}'`);
    }
    const unit = cloneSnapshotUnit(snapshot, nextEntryOrder++);
    unitMap.set(unit.id, unit);
    queue.push(unit.id);
    sortPendingSection();
    dispatchEvent('summon', {
      unitId: unit.id,
      sourceId: unit.id,
      targetId: null,
      data: { initiative: unit.initiative }
    });
    return unit;
  };

  const requestEnd = (outcome: BattleOutcome): void => {
    forcedEnd = outcome;
  };

  const runtime: TurnRuntime = {
    get round() {
      return round;
    },
    rng,
    register,
    unregister,
    dispatchEvent,
    dealDamage,
    applyHeal,
    applyHpDelta,
    updateInitiative,
    summonUnit,
    requestEnd,
    getUnit,
    getLivingUnits
  };

  const checkTermination = (): BattleOutcome | null => {
    if (forcedEnd) return forcedEnd;
    const allUnits = Array.from(unitMap.values());
    const heroesAlive = allUnits.some(unit => unit.side === 'hero' && unit.hp > 0);
    const enemiesAlive = allUnits.some(unit => unit.side === 'enemy' && unit.hp > 0);
    if (!heroesAlive) return 'defeat';
    if (!enemiesAlive) return 'victory';
    return null;
  };

  queue.sort(compareQueueIds);
  sep = 0;

  // 单发执行（combat-assembly 01）：从当前状态推进至终止。装配层在调用前完成全部注册。
  const run = (): TurnResult => {
    while (round < maxRounds && !forcedEnd) {
    round++;
    settleTiming('roundStart', null);
    if (forcedEnd) break;

    while (sep < queue.length && !forcedEnd) {
      const unitId = queue[sep];
      const unit = unitMap.get(unitId)!;

      // 死亡判定在取出队首时读取当前状态（非入场快照）；死单位不预过滤出队，尊重复活。
      if (unit.hp <= 0) {
        sep++;
        continue;
      }

      // 当前单位立即移入已行动区：先机变动/召唤只影响本轮未行动区间（queue[sep..]），
      // 已行动单位本轮锁定，保证一轮只行动一次。
      sep++;

      // 快照制判定（combat-aftermath 02 D1）：行动资格在 turnStart 主时机派发「之前」读取一次，
      // 本回合内保持不变。眩晕等控制在此刻生效；随后 turnStart 触发器才递减时长——
      // 因此 duration=N 严格跳过 N 个自身回合（先判定后递减）。
      const canAct = canActFn(unit, runtime);

      settleTiming('turnStart', unit);
      if (forcedEnd) break;

      // 回合开始前结算后死亡（如反伤/效果致死）→ 跳过其后所有主时机。
      if (unit.hp <= 0) continue;

      if (canAct) {
        settleTiming('turnActive', unit);
        if (forcedEnd) break;
        performAction(unit, runtime);
      }

      // 死于自己行动中 → 不结算回合结束后。
      if (unit.hp > 0) {
        settleTiming('turnEnd', unit);
      }
      if (forcedEnd) break;

      const termination = checkTermination();
      if (termination) {
        forcedEnd = termination;
        break;
      }
    }

    if (forcedEnd) break;

    settleTiming('roundEnd', null);

    const termination = checkTermination();
    if (termination) {
      forcedEnd = termination;
      break;
    }

    // 未行动区空 → 已行动区整体移回未行动区，进入新一轮。
    sep = 0;
    queue.sort(compareQueueIds);
  }

    const outcome = forcedEnd ?? checkTermination() ?? 'draw';
    const finalHp: Record<string, number> = {};
    for (const u of unitMap.values()) {
      finalHp[u.id] = u.hp;
    }
    return { outcome, rounds: round, events, finalHp };
  };

  return { ...runtime, run };
};

/** 兼容薄壳：一次性构建并执行。 */
export const runTurnEngine = (
  units: readonly BattleUnitSnapshot[],
  config: TurnConfig = {}
): TurnResult => createTurnRuntime(units, config).run();