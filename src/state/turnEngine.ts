/**
 * Turn 引擎（combat-turn）：纯确定性回合流程引擎。
 *
 * 职责边界（见 .scratch/combat-turn/spec.md）：
 * - 只接收「已结算的参战单位快照」，驱动 轮次 → 回合 → 时机/事件 流程；
 * - 输出 { outcome, events }，不接触 RNG（RNG 以函数参数注入）；
 * - 先机排序、队列/轮次边界、死亡判定、canAct 谓词、时机/事件订阅表全部纯函数化；
 * - 不硬编码眩晕等控制枚举、不硬编码伤害公式与目标选择（属于 Ability/Effect 模块）。
 */

// === 基础类型 ===

export type UnitFaction = 'hero' | 'enemy';

export type BattleOutcome = 'victory' | 'defeat' | 'draw';

/** 完整面板（三层算好后的属性，供 Ability 取数）。特殊属性经 index signature 透传。 */
export interface BattleUnitStats {
  attack: number;
  defense: number;
  maxHp: number;
  maxMp: number;
  critRate: number;
  critDmg: number;
  [key: string]: number;
}

/** Ability 引用（Ability 模块落地前为轻量引用，字段可扩展）。 */
export interface BattleUnitAbility {
  id: string;
  name?: string;
  [key: string]: unknown;
}

/** 战斗单位快照：Turn 的输入。先机在战前算好传入。 */
export interface BattleUnitSnapshot {
  id: string;
  name: string;
  faction: UnitFaction;
  hp: number;
  maxHp: number;
  initiative: number;
  abilities: BattleUnitAbility[];
  stats: BattleUnitStats;
}

/** 一次性可变运行时战斗单位：入场时由快照创建，战后整体丢弃。 */
export interface BattleUnitRuntime {
  id: string;
  name: string;
  faction: UnitFaction;
  hp: number;
  maxHp: number;
  initiative: number;
  abilities: BattleUnitAbility[];
  stats: BattleUnitStats;
  /** 全局单调递增入场序（英雄上阵序 → 敌人配置序 → 召唤序续号），作 tie-breaker。 */
  entryOrder: number;
}

// === 时机 / 事件 ===

/** 轮次主时机（固定骨架）。 */
export const TURN_TIMING_KEYS = ['roundStart', 'turnStart', 'turnActive', 'turnEnd', 'roundEnd'] as const;
export type TurnTimingKey = (typeof TURN_TIMING_KEYS)[number];

/** 标准细粒度战斗事件键（可扩展）。 */
export const BATTLE_EVENT_KEYS = ['attackAfter', 'damageTaken', 'healingTaken', 'death', 'summon'] as const;
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
 */
export const calculateInitiative = (agility: number, fixval = 0): number => {
  const safeAgility = Math.max(0, agility);
  const clampedFix = Math.min(100, Math.max(0, fixval));
  return Math.min(300, 100 + (safeAgility / (safeAgility + 100)) * 100 + clampedFix);
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
  /** 战斗内订阅表（每场独立实例，战斗结束整体清空）。 */
  register(key: TurnEventKey, subscriber: TurnSubscriber, unitId?: string | null): void;
  unregister(key: TurnEventKey, subscriber: TurnSubscriber, unitId?: string | null): void;
  /** 派发细粒度事件（即时触发对应订阅者）。 */
  dispatchEvent(key: TurnEventKey, opts?: DispatchEventOptions): BattleEvent;
  /** 结算伤害：扣减 hp、派发 damageTaken 与 death（hp 归零时）。返回实际扣减量。 */
  dealDamage(targetId: string, amount: number, sourceId?: string | null, data?: Record<string, unknown>): number;
  /** 结算治疗：回复 hp（不超上限）、派发 healingTaken。返回实际治疗量。 */
  applyHeal(targetId: string, amount: number, sourceId?: string | null, data?: Record<string, unknown>): number;
  /** 先机变动：只重排本轮未行动区间；已行动单位本轮锁定。 */
  updateInitiative(unitId: string, initiative: number): void;
  /** 召唤物入场：进入本轮未行动区按先机排位，本轮必行动一次。 */
  summonUnit(snapshot: BattleUnitSnapshot): BattleUnitRuntime;
  /** 强制结束标记 + 结果（victory/defeat/draw），循环下一检查点即终止。 */
  requestEnd(outcome: BattleOutcome): void;
  getUnit(id: string): BattleUnitRuntime | undefined;
  /** 存活单位（按入场序），可选按阵营过滤。 */
  getLivingUnits(faction?: UnitFaction): BattleUnitRuntime[];
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
  faction: unit.faction,
  hp: Math.max(0, unit.hp),
  maxHp: unit.maxHp,
  initiative: unit.initiative,
  abilities: unit.abilities.map(ability => ({ ...ability })),
  stats: { ...unit.stats },
  entryOrder
});

/**
 * 纯确定性回合引擎主 seam：
 * 给定参战单位快照 + 配置 + rng → { outcome, events }。
 * 无副作用、无外部依赖；同一输入 + 同一 rng 种子 → 逐字节一致的事件流。
 */
export const runTurnEngine = (
  units: readonly BattleUnitSnapshot[],
  config: TurnConfig = {}
): TurnResult => {
  const maxRounds = config.maxRounds ?? DEFAULT_MAX_ROUNDS;
  const rng = config.rng ?? Math.random;
  const canActFn = config.canAct ?? (() => true);
  const performAction = config.performAction ?? (() => {});
  const debug = config.debug ?? false;

  const unitMap = new Map<string, BattleUnitRuntime>();
  let nextEntryOrder = 0;
  for (const unit of units) {
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
      event.debug = { ...(debug ? queueDebug() : {}), ...extraDebug };
    }
    events.push(event);
    return event;
  };

  const getUnit = (id: string): BattleUnitRuntime | undefined => unitMap.get(id);

  const getLivingUnits = (faction?: UnitFaction): BattleUnitRuntime[] =>
    Array.from(unitMap.values())
      .filter(unit => unit.hp > 0 && (faction === undefined || unit.faction === faction))
      .sort((a, b) => a.entryOrder - b.entryOrder);

  const register = (key: TurnEventKey, subscriber: TurnSubscriber, unitId: string | null = null): void => {
    subscriptions.push({ key, unitId, subscriber, order: nextSubscriptionOrder++, active: true });
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
    const actual = Math.min(target.hp, Math.max(0, Math.round(amount)));
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
    const actual = Math.min(target.maxHp - target.hp, Math.max(0, Math.round(amount)));
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
    updateInitiative,
    summonUnit,
    requestEnd,
    getUnit,
    getLivingUnits
  };

  const checkTermination = (): BattleOutcome | null => {
    if (forcedEnd) return forcedEnd;
    const allUnits = Array.from(unitMap.values());
    const heroesAlive = allUnits.some(unit => unit.faction === 'hero' && unit.hp > 0);
    const enemiesAlive = allUnits.some(unit => unit.faction === 'enemy' && unit.hp > 0);
    if (!heroesAlive) return 'defeat';
    if (!enemiesAlive) return 'victory';
    return null;
  };

  queue.sort(compareQueueIds);
  sep = 0;

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

      settleTiming('turnStart', unit);
      if (forcedEnd) break;

      // 回合开始前结算后死亡（如反伤/效果致死）→ 跳过其后所有主时机。
      if (unit.hp <= 0) continue;

      // canAct 在回合开始前结算后判定一次，本回合内保持不变；先判死亡，再判 canAct。
      const canAct = canActFn(unit, runtime);
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
  return { outcome, rounds: round, events };
};
