/**
 * Effect 统一命令层：Ability/Buff 只派发 EffectInstance，
 * resolveEffect 统一按 before → during → after 落地。
 * 本文件是主 seam；executor 按 EffectKind 分派。
 */

import type { BattleUnitStats } from './battleTypes';
import type { BattleContext, BuffInstance } from './battleContext';
import { applyEffectModifiers, type Modifier } from './modifier';
import { COMBAT_DAMAGE_CONFIG } from '../data/statConfig';
import { toTurnUnit } from './battleEntity';
import { resolveEntity, type EntityConfigRef } from './entityFactory';

export type DamageElement = 'physical' | 'arcane' | 'mechanical' | 'nightmare' | 'spirit' | 'astral' | 'soulseal';

export type EffectKind =
  | 'damage'
  | 'heal'
  | 'statModify'
  | 'stun'
  | 'dispel'
  | 'immunityElement'
  | 'immunityBuff'
  | 'taunt'
  | 'summon'
  | 'applyBuff';

export interface EffectParamsMap {
  damage: { amount: number; element?: DamageElement; isCrit?: boolean };
  heal: { amount: number };
  statModify: { modifier: Modifier };
  stun: { duration: number };
  dispel: { buffKind?: string };
  immunityElement: { element: DamageElement };
  immunityBuff: { buffKind: string };
  taunt: { value: number };
  summon: { count: number; configRef: EntityConfigRef };
  applyBuff: { buffInstance: BuffInstance };
}

export interface EffectInstance {
  id: string;
  effectId: string;
  kind: EffectKind;
  sourceId: string;
  targetId: string;
  params: EffectParamsMap[EffectKind];
  origin: { kind: 'ability' | 'buff'; id: string };
  chainKey?: string;
}

/** 中断码（combat-aftermath 02 D2）：zeroed=时长归零/自然到期；sourceConflict=不同 source 挂同种 Buff 被拒。 */
export type EffectInterruption = 'resisted' | 'negated' | 'invalid' | 'recursion' | 'zeroed' | 'sourceConflict';

export interface EffectResult {
  applied: boolean;
  interrupted?: EffectInterruption;
  values: Record<string, number>;
  targetDied?: boolean;
  /** statModify 落地后的 Modifier 句柄，供 Buff 到期移除。 */
  modifierId?: string;
}

export const defaultChainKey = (effect: EffectInstance): string =>
  effect.chainKey ??
  `${effect.origin.id}:${effect.effectId}:${effect.sourceId}->${effect.targetId}`;

export const calculateDamageAmount = (
  amount: number,
  attacker: BattleUnitStats,
  defender: BattleUnitStats,
  opts: { isCrit?: boolean; element?: DamageElement } = {}
): number => {
  const { isCrit = false, element = 'physical' } = opts;
  let raw = amount;

  if (element === 'arcane') {
    const boost = attacker.arcaneBoost || 0;
    const resist = defender.arcaneResistance || 0;
    raw = raw * (1 + boost) * (1 - Math.min(0.9, resist));
  } else if (element === 'mechanical') {
    const evo = attacker.mechanicalEvolution || 0;
    raw = raw * (1 + evo);
  }

  if (isCrit) raw = raw * attacker.critDmg;

  const defMult =
    COMBAT_DAMAGE_CONFIG.BASE_DEFENSE_CONSTANT /
    (COMBAT_DAMAGE_CONFIG.BASE_DEFENSE_CONSTANT + defender.defense);
  const afterDef = raw * defMult;

  const voidExemption = Math.min(
    COMBAT_DAMAGE_CONFIG.MAX_VOID_SPIRIT_EXEMPTION,
    Math.max(0, defender.voidSpirit || 0)
  );

  return Math.max(COMBAT_DAMAGE_CONFIG.MIN_DAMAGE, Math.round(afterDef * (1 - voidExemption)));
};

type EffectAffinity = 'harmful' | 'beneficial' | 'neutral';
type EffectResist = 'none' | 'will';
interface EffectAudit {
  affinity: EffectAffinity;
  resist: EffectResist;
}

/** 每 EffectKind 的审核元数据；resist='will' 走二元意志抵抗。 */
const EFFECT_AUDIT: Record<EffectKind, EffectAudit> = {
  damage: { affinity: 'neutral', resist: 'none' },
  heal: { affinity: 'beneficial', resist: 'none' },
  statModify: { affinity: 'neutral', resist: 'none' },
  stun: { affinity: 'harmful', resist: 'none' },
  dispel: { affinity: 'harmful', resist: 'will' },
  immunityElement: { affinity: 'beneficial', resist: 'none' },
  immunityBuff: { affinity: 'harmful', resist: 'will' },
  taunt: { affinity: 'harmful', resist: 'will' },
  summon: { affinity: 'neutral', resist: 'none' },
  applyBuff: { affinity: 'neutral', resist: 'none' }
};

interface BeforeResult {
  allowed: boolean;
  interrupted?: EffectInterruption;
  params: EffectInstance['params'];
}

interface BeforeEnv {
  mods: Modifier[];
  effectReduction: number;
  durationReduction: number;
}

/**
 * 共享审核流（combat-assembly 04 / E#6）：有效性 / 二元抵抗 / 免疫 flag / 参数修正。
 * 各 kind 的差异全部收敛到 EFFECT_EXECUTORS 注册表（见文件尾），新增 EffectKind 只改一处。
 */
const applyBefore = (ctx: BattleContext, effect: EffectInstance): BeforeResult => {
  const mods = ctx.getModifiers(effect.targetId, 'effect');
  const source = ctx.turn.getUnit(effect.sourceId);
  if (!source) {
    return { allowed: false, interrupted: 'invalid', params: effect.params };
  }

  const isSummon = effect.kind === 'summon';
  const target = ctx.turn.getUnit(effect.targetId);
  if (!isSummon && !target) {
    return { allowed: false, interrupted: 'invalid', params: effect.params };
  }

  if (!isSummon && EFFECT_AUDIT[effect.kind].resist === 'will') {
    const sourceWill = source.stats.willpower || 0;
    const targetWill = target!.stats.willpower || 0;
    if (sourceWill < targetWill) {
      return { allowed: false, interrupted: 'resisted', params: effect.params };
    }
  }

  if (!isSummon) {
    const flagKey = EFFECT_EXECUTORS[effect.kind].immunityFlag?.(effect);
    if (flagKey && ctx.getFlag(effect.targetId, flagKey) > 0) {
      return { allowed: false, interrupted: 'negated', params: effect.params };
    }
  }

  const targetUnit = target!;
  const env: BeforeEnv = {
    mods,
    effectReduction: isSummon ? 0 : targetUnit.stats.effectReduction || 0,
    durationReduction: isSummon ? 0 : targetUnit.stats.durationReduction || 0
  };
  const modifyParams = EFFECT_EXECUTORS[effect.kind].before;
  if (!modifyParams) {
    return { allowed: true, params: effect.params };
  }
  return { allowed: true, params: modifyParams(ctx, effect, env) };
};

const executeDamage = (
  ctx: BattleContext,
  effect: EffectInstance,
  params: EffectParamsMap['damage']
): EffectResult => {
  const source = ctx.turn.getUnit(effect.sourceId);
  const target = ctx.turn.getUnit(effect.targetId);
  if (!source || !target || target.hp <= 0) {
    return { applied: false, interrupted: 'invalid', values: {} };
  }

  const amount = calculateDamageAmount(params.amount, source.stats, target.stats, {
    isCrit: params.isCrit,
    element: params.element
  });
  const actual = ctx.turn.dealDamage(target.id, amount, source.id, {
    kind: 'effect',
    effectId: effect.id,
    effectKind: 'damage',
    amount
  });

  return {
    applied: true,
    values: { damage: actual },
    targetDied: target.hp <= 0
  };
};

const executeHeal = (
  ctx: BattleContext,
  effect: EffectInstance,
  params: EffectParamsMap['heal']
): EffectResult => {
  const source = ctx.turn.getUnit(effect.sourceId);
  const target = ctx.turn.getUnit(effect.targetId);
  if (!source || !target || target.hp <= 0) {
    return { applied: false, interrupted: 'invalid', values: {} };
  }

  // 治疗钳制基准以解析值为准（combat-assembly 03 / M1）：maxHp 增益 Buff 生效期内上限随之提高。
  target.maxHp = ctx.resolveStats(target.id).maxHp;
  const actual = ctx.turn.applyHeal(target.id, params.amount, source.id, {
    kind: 'effect',
    effectId: effect.id,
    effectKind: 'heal',
    amount: params.amount
  });

  return { applied: actual > 0, values: { heal: actual } };
};

const executeStatModify = (
  ctx: BattleContext,
  effect: EffectInstance,
  params: EffectParamsMap['statModify']
): EffectResult => {
  if (!ctx.turn.getUnit(effect.targetId)) {
    return { applied: false, interrupted: 'invalid', values: {} };
  }
  const modifierId = ctx.addModifier(effect.targetId, params.modifier);
  return { applied: true, values: { value: params.modifier.value }, modifierId };
};

const executeStun = (
  ctx: BattleContext,
  effect: EffectInstance,
  params: EffectParamsMap['stun']
): EffectResult => {
  const buff: BuffInstance = {
    id: `${effect.id}-stun`,
    buffId: 'stun',
    sourceId: effect.sourceId,
    targetId: effect.targetId,
    stacks: 1,
    duration: params.duration,
    // 承载传入数值/元数据（combat-hygiene 04 / B§4.3），不再恒空对象。
    values: { duration: params.duration }
  };
  if (params.duration <= 0) {
    // 时长归零 = 自然到期，区别于免疫（combat-aftermath 02 D2）。
    return { applied: false, interrupted: 'zeroed', values: {} };
  }
  const application = ctx.applyBuff(effect.targetId, buff);
  if (!application.applied) {
    return {
      applied: false,
      interrupted: application.reason === 'conflict' ? 'sourceConflict' : 'invalid',
      values: { stacks: application.stacks }
    };
  }
  return { applied: true, values: { stacks: application.stacks } };
};

const executeDispel = (
  ctx: BattleContext,
  effect: EffectInstance,
  params: EffectParamsMap['dispel']
): EffectResult => {
  if (!params.buffKind) return { applied: false, interrupted: 'invalid', values: {} };
  const removed = ctx.removeBuff(effect.targetId, params.buffKind);
  return { applied: true, values: { removed: removed ? 1 : 0 } };
};

const executeImmunityElement = (
  ctx: BattleContext,
  effect: EffectInstance,
  params: EffectParamsMap['immunityElement']
): EffectResult => {
  ctx.setFlag(effect.targetId, `immunityElement:${params.element}`, 1);
  return { applied: true, values: { value: 1 } };
};

const executeImmunityBuff = (
  ctx: BattleContext,
  effect: EffectInstance,
  params: EffectParamsMap['immunityBuff']
): EffectResult => {
  ctx.setFlag(effect.targetId, `immunityBuff:${params.buffKind}`, 1);
  return { applied: true, values: { value: 1 } };
};

const executeTaunt = (
  ctx: BattleContext,
  effect: EffectInstance,
  params: EffectParamsMap['taunt']
): EffectResult => {
  ctx.setFlag(effect.targetId, 'taunt', params.value);
  return { applied: true, values: { value: params.value } };
};

const executeSummon = (
  ctx: BattleContext,
  effect: EffectInstance,
  params: EffectParamsMap['summon']
): EffectResult => {
  const { count, configRef } = params;
  const source = ctx.turn.getUnit(effect.sourceId);
  const side = source?.side ?? 'enemy';
  for (let i = 0; i < count; i++) {
    // id 分配收口（combat-summon-closure 02 / E#3）：首个沿用 effect.targetId（冲突即抛错），
    // 后续由运行时分配唯一 id，弃用 targetId-N 手工拼接。
    const requestedId = i === 0 ? effect.targetId : ctx.turn.generateUnitId(effect.targetId);
    const entity = resolveEntity(configRef, { side, id: requestedId });
    const named = i === 0 ? entity : { ...entity, name: `${entity.name}${i + 1}` };
    ctx.turn.summonUnit(toTurnUnit(named), effect.sourceId); // 来源透传（T#6）
  }
  return { applied: true, values: { count } };
};

const executeApplyBuff = (
  ctx: BattleContext,
  effect: EffectInstance,
  params: EffectParamsMap['applyBuff']
): EffectResult => {
  const application = ctx.applyBuff(effect.targetId, params.buffInstance);
  if (!application.applied) {
    // 冲突拒绝与免疫分开编码（combat-aftermath 02 D2）；未知 buffId 属配置错误 → invalid。
    return {
      applied: false,
      interrupted: application.reason === 'conflict' ? 'sourceConflict' : 'invalid',
      values: { stacks: application.stacks }
    };
  }
  return { applied: true, values: { stacks: application.stacks } };
};

// === EffectKind 注册表（combat-assembly 04 / E#6）===
// 新增一个 EffectKind 只需在此追加一条：before（参数修正）/ immunityFlag / during（必填）/ present（展示文案）。

export interface EffectExecutorPresentArgs {
  source: string;
  target: string;
  values: Record<string, number>;
}

export interface EffectExecutor {
  /** 免疫拦截 flag 键；返回 null/undefined 表示无免疫检查。 */
  immunityFlag?: (effect: EffectInstance) => string | null;
  /** before 阶段参数修正；缺省原样放行。 */
  before?: (ctx: BattleContext, effect: EffectInstance, env: BeforeEnv) => EffectInstance['params'];
  /** during 阶段执行。 */
  during: (ctx: BattleContext, effect: EffectInstance, params: EffectInstance['params']) => EffectResult;
  /** 展示文案（battleEventPresentation 消费）；缺省不展示。 */
  present?: (args: EffectExecutorPresentArgs) => string;
}

/** 按 kind 定型包装器：条目内 params 为该 kind 的精确形状，边界处单点收窄。 */
const defineExecutor = <K extends EffectKind>(
  executor: Omit<EffectExecutor, 'during'> & {
    during: (ctx: BattleContext, effect: EffectInstance, params: EffectParamsMap[K]) => EffectResult;
  }
): EffectExecutor => ({
  ...executor,
  during: (ctx, effect, params) => executor.during(ctx, effect, params as EffectParamsMap[K])
});

export const EFFECT_EXECUTORS: Record<EffectKind, EffectExecutor> = {
  damage: defineExecutor<'damage'>({
    immunityFlag: effect => {
      const p = effect.params as EffectParamsMap['damage'];
      return p.element ? `immunityElement:${p.element}` : null;
    },
    before: (_ctx, effect, env) => {
      const p = effect.params as EffectParamsMap['damage'];
      return { ...p, amount: applyEffectModifiers(p.amount, env.mods, 'effect.damage') };
    },
    during: executeDamage
  }),
  heal: defineExecutor<'heal'>({
    before: (_ctx, effect, env) => {
      const p = effect.params as EffectParamsMap['heal'];
      return { ...p, amount: applyEffectModifiers(p.amount, env.mods, 'effect.heal') };
    },
    during: executeHeal
  }),
  statModify: defineExecutor<'statModify'>({
    before: (_ctx, effect, env) => {
      const p = effect.params as EffectParamsMap['statModify'];
      let value = applyEffectModifiers(p.modifier.value, env.mods, 'effect.value');
      if (value < 0) value = value * (1 - env.effectReduction);
      return { modifier: { ...p.modifier, value } };
    },
    during: executeStatModify,
    present: ({ target, values }) => `【${target}】属性修正 ${String(values.value ?? 0)}`
  }),
  stun: defineExecutor<'stun'>({
    immunityFlag: () => 'immunityBuff:stun',
    before: (_ctx, effect, env) => {
      const p = effect.params as EffectParamsMap['stun'];
      const modified = applyEffectModifiers(p.duration, env.mods, 'effect.duration');
      return { duration: Math.max(0, Math.ceil(modified * (1 - env.durationReduction))) };
    },
    during: executeStun,
    present: ({ target }) => `【${target}】受到眩晕效果`
  }),
  dispel: defineExecutor<'dispel'>({
    during: executeDispel,
    present: ({ target }) => `【${target}】增益效果被驱散`
  }),
  immunityElement: defineExecutor<'immunityElement'>({
    during: executeImmunityElement,
    present: ({ target }) => `【${target}】获得元素免疫`
  }),
  immunityBuff: defineExecutor<'immunityBuff'>({
    during: executeImmunityBuff,
    present: ({ target }) => `【${target}】获得状态免疫`
  }),
  taunt: defineExecutor<'taunt'>({
    before: (_ctx, effect, env) => {
      const p = effect.params as EffectParamsMap['taunt'];
      return { value: applyEffectModifiers(p.value, env.mods, 'effect.value') * (1 - env.effectReduction) };
    },
    during: executeTaunt,
    present: ({ target }) => `【${target}】被嘲讽`
  }),
  summon: defineExecutor<'summon'>({
    before: (ctx, effect) => {
      // 召唤数量取来源侧 effect.* 修正（多目标例外）。
      const p = effect.params as EffectParamsMap['summon'];
      const countMods = ctx.getModifiers(effect.sourceId, 'effect');
      const count = Math.max(1, Math.round(applyEffectModifiers(p.count, countMods, 'effect.count')));
      return { count, configRef: p.configRef };
    },
    during: executeSummon,
    present: ({ source, values }) => `【${source}】召唤 ${String(values.count ?? 0)} 个单位`
  }),
  applyBuff: defineExecutor<'applyBuff'>({
    immunityFlag: effect => `immunityBuff:${(effect.params as EffectParamsMap['applyBuff']).buffInstance.buffId}`,
    before: (_ctx, effect, env) => {
      const p = effect.params as EffectParamsMap['applyBuff'];
      const instance: BuffInstance = { ...p.buffInstance };
      if (instance.duration !== null) {
        instance.duration = applyEffectModifiers(instance.duration, env.mods, 'effect.duration');
      }
      return { buffInstance: instance };
    },
    during: executeApplyBuff,
    present: ({ target }) => `【${target}】获得状态效果`
  })
};

const executeDuring = (
  ctx: BattleContext,
  effect: EffectInstance,
  params: EffectInstance['params']
): EffectResult => EFFECT_EXECUTORS[effect.kind].during(ctx, effect, params);

export const resolveEffect = (
  ctx: BattleContext,
  effect: EffectInstance,
  activeChains: Set<string> = new Set()
): EffectResult => {
  const chainKey = defaultChainKey(effect);
  if (activeChains.has(chainKey)) {
    return { applied: false, interrupted: 'recursion', values: {} };
  }
  activeChains.add(chainKey);

  try {
    const before = applyBefore(ctx, effect);
    if (!before.allowed) {
      return { applied: false, interrupted: before.interrupted, values: {} };
    }

    const result = executeDuring(ctx, effect, before.params);
    if (result.applied) {
      ctx.turn.dispatchEvent('effectApplied', {
        unitId: effect.targetId,
        sourceId: effect.sourceId,
        targetId: effect.targetId,
        data: {
          effectId: effect.effectId,
          kind: effect.kind,
          sourceId: effect.sourceId,
          targetId: effect.targetId,
          values: result.values,
          targetDied: result.targetDied ?? false
        }
      });
    }
    return result;
  } finally {
    activeChains.delete(chainKey);
  }
};
