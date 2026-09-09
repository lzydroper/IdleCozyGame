/**
 * Buff 触发运行时（combat-buff；config-json-migration 批次③ 数据驱动改造）：
 * json 效果模板 → 物化器求值（公式词表 + 目标解析 + id/origin 填充）→ resolveEffect 结算，
 * 然后推进持续/层数。createEffects 函数字段已退役（07 号票）。
 */

import type { BattleContext, BuffTriggerHooks } from './battleContext';
import type { TurnSubscriber, TurnTimingContext } from './turnEngine';
import type { BuffConfig, BuffEffectTemplate, BuffInstance, BuffTrigger } from './buffTypes';
import { buffModifierSource } from './buffTypes';
import { getBuffConfig } from '../configs/loaders/combat.loader';
import { resolveEffect, type EffectInstance } from './effectSystem';

/** 控制类 Buff 集合：命中任一即无法行动（combat-aftermath 02 D3 集合化，新控制类只需注册进集合）。 */
export const CONTROL_BUFF_KINDS: readonly string[] = ['stun'];

/**
 * 「无法行动」汇总（Turn #14 收口：从 combat.ts 迁入 Buff 模块）。
 * 判定语义 = 快照时点读当前 duration（combat-aftermath 02 D1）：duration>0 即不可行动。
 */
export const canActWithBuffs = (battle: BattleContext, unitId: string): boolean =>
  !CONTROL_BUFF_KINDS.some(kind => {
    const buff = battle.getBuff(unitId, kind);
    return !!buff && (buff.duration ?? 0) > 0;
  });

export const triggerOwnerId = (instance: BuffInstance, trigger: BuffTrigger): string =>
  trigger.unitRef === 'source' ? instance.sourceId : instance.targetId;

export const canTriggerBuff = (
  instance: BuffInstance,
  trigger: BuffTrigger,
  timingKey: string,
  currentOwnerId: string | null
): boolean => trigger.timing === timingKey && currentOwnerId === triggerOwnerId(instance, trigger);

// === 物化器（07 号票 W1 词表）===

interface MaterializeEnv {
  instance: BuffInstance;
  timingCtx: TurnTimingContext;
  getStats: () => import('./battleTypes').BattleUnitStats;
}

const FORMULA_KINDS = new Set(['flat', 'attack', 'maxHp', 'perStack', 'livingEnemies']);

/** 公式求值：数字直取；对象按 kind 解析（attack/maxHp 走来源解析面板，惰性求值）。 */
const resolveValue = (node: unknown, env: MaterializeEnv): number => {
  if (typeof node === 'number') return node;
  const f = node as { kind?: string; base?: number; per?: number; multiplier?: number; percent?: number; value?: number; baseOverrideValueKey?: string };
  switch (f?.kind) {
    case 'flat':
      return Number(f.value ?? 0);
    case 'perStack': {
      // values 同名键覆盖（灼烧 values.amount 现状语义，07 号票 W1）
      const overrideKey = f.baseOverrideValueKey;
      const override = overrideKey ? env.instance.values[overrideKey] : undefined;
      return typeof override === 'number' ? override : (f.base ?? 0) * env.instance.stacks;
    }
    case 'livingEnemies': {
      // 持有者的敌对侧存活数（旧实现为字面量 enemy 侧，此处按持有者相对侧泛化）
      const holder = env.timingCtx.runtime.getUnit(env.instance.targetId);
      const holderSide = holder?.side ?? 'hero';
      return (
        (f.per ?? 0) *
        env.timingCtx.runtime.getLivingUnits().filter(u => u.side !== holderSide && u.hp > 0).length
      );
    }
    case 'attack':
      return env.getStats().attack * (f.multiplier ?? 0);
    case 'maxHp':
      return env.getStats().maxHp * (f.percent ?? 0);
    default:
      return Number(node) || 0;
  }
};

/** 深遍历：params 内的公式对象就地求数值。 */
const resolveDeep = (node: unknown, env: MaterializeEnv): unknown => {
  if (Array.isArray(node)) return node.map(v => resolveDeep(v, env));
  if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    if (typeof obj.kind === 'string' && FORMULA_KINDS.has(obj.kind)) {
      return resolveValue(node, env);
    }
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) out[k] = resolveDeep(v, env);
    return out;
  }
  return node;
};

const resolveTargetId = (
  tpl: BuffEffectTemplate,
  instance: BuffInstance,
  timingCtx: TurnTimingContext
): string => {
  if (tpl.targetRef === 'eventTarget') {
    return timingCtx.target?.id ?? timingCtx.unit?.id ?? instance.targetId;
  }
  return instance.targetId; // 'holder'
};

const materializeEffect = (
  tpl: BuffEffectTemplate,
  instance: BuffInstance,
  timingCtx: TurnTimingContext,
  getStats: MaterializeEnv['getStats'],
  seq: number
): EffectInstance => {
  const env: MaterializeEnv = { instance, timingCtx, getStats };
  const label = tpl.label ?? tpl.kind;
  const targetId = resolveTargetId(tpl, instance, timingCtx);
  const params = resolveDeep(tpl.params, env) as Record<string, unknown>;
  if (tpl.kind === 'statModify' && params.modifier && typeof params.modifier === 'object') {
    (params.modifier as { source?: string }).source = buffModifierSource(instance);
  }
  return {
    // effectId 沿用旧版语义 = 纯 label（如 burn_tick / fold_flame_bonus），测试与展示按此过滤。
    id: `${instance.id}:${label}:${timingCtx.round}:${seq}`,
    effectId: label,
    kind: tpl.kind,
    sourceId: instance.sourceId,
    targetId,
    params,
    origin: { kind: 'buff', id: instance.id }
  };
};

const buildBuffEffects = (
  config: BuffConfig,
  instance: BuffInstance,
  timingCtx: TurnTimingContext,
  ctx: BattleContext
): EffectInstance[] => {
  const rawFireCount = timingCtx.data.fireCount;
  const fireCount =
    typeof rawFireCount === 'number' && rawFireCount > 0 ? Math.floor(rawFireCount) : 1;
  const getStats = () => ctx.resolveStats(instance.sourceId);

  const effects: EffectInstance[] = [];
  let seq = 0;
  for (let i = 0; i < fireCount; i++) {
    for (const tpl of config.effects) {
      const eff = materializeEffect(tpl, instance, timingCtx, getStats, seq++);
      effects.push(i === 0 ? eff : { ...eff, id: eff.id + ':' + i });
    }
  }
  return effects;
};

export const settleBuffTrigger = (
  ctx: BattleContext,
  instance: BuffInstance,
  timingCtx: TurnTimingContext
): void => {
  const config = getBuffConfig(instance.buffId);
  if (!config) return;

  const effects = buildBuffEffects(config, instance, timingCtx, ctx);
  if (effects.some(effect => effect.kind === 'statModify')) {
    ctx.removeModifiersBySource(instance.targetId, buffModifierSource(instance));
  }
  for (const effect of effects) {
    resolveEffect(ctx, effect);
  }

  if (config.durationKind === 'temporary' && instance.duration !== null) {
    instance.duration -= 1;
    if (instance.duration <= 0) {
      ctx.removeBuff(instance.targetId, instance.buffId);
    }
    return;
  }

  if (config.consumeOnTrigger) {
    instance.stacks -= 1;
    if (instance.stacks <= 0) {
      ctx.removeBuff(instance.targetId, instance.buffId);
    }
  }
};

export const createBuffTriggerHooks = (
  getCtx: () => BattleContext
): BuffTriggerHooks => ({
  register(instance) {
    const config = getBuffConfig(instance.buffId);
    if (!config) return [];

    // 注册/注销经句柄对称完成（combat-hygiene 04 / Turn #7）；句柄由 BattleContext 按实例 id 保管。
    const handles: Array<() => void> = [];
    for (const trigger of config.triggers) {
      const unitId = triggerOwnerId(instance, trigger);
      const subscriber: TurnSubscriber = (timingCtx) => {
        if (!canTriggerBuff(instance, trigger, timingCtx.key, timingCtx.unit?.id ?? null)) return;
        settleBuffTrigger(getCtx(), instance, timingCtx);
      };
      handles.push(getCtx().turn.register(trigger.timing, subscriber, unitId));
    }
    return handles;
  }
});
