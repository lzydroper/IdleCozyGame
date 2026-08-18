/**
 * Effect 统一命令层：Ability/Buff 只派发 EffectInstance，
 * resolveEffect 统一按 before → during → after 落地。
 * 本文件是主 seam；executor 按 EffectKind 分派。
 */

import type { BattleUnitSnapshot, BattleUnitStats } from './turnEngine';
import type { BattleContext, BuffInstance } from './battleContext';
import { applyEffectModifiers, type Modifier } from './modifier';
import { COMBAT_DAMAGE_CONFIG } from '../data/statConfig';

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
  summon: { count: number; snapshot: BattleUnitSnapshot };
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

export type EffectInterruption = 'resisted' | 'negated' | 'invalid' | 'recursion';

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
  stun: { affinity: 'harmful', resist: 'will' },
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

  // 无效化：元素免疫 / Buff 免疫标记在落地前拦截对应效果。
  if (!isSummon) {
    if (effect.kind === 'damage') {
      const p = effect.params as EffectParamsMap['damage'];
      if (p.element && ctx.getFlag(effect.targetId, `immunityElement:${p.element}`) > 0) {
        return { allowed: false, interrupted: 'negated', params: effect.params };
      }
    }
    if (effect.kind === 'applyBuff') {
      const p = effect.params as EffectParamsMap['applyBuff'];
      if (ctx.getFlag(effect.targetId, `immunityBuff:${p.buffInstance.buffId}`) > 0) {
        return { allowed: false, interrupted: 'negated', params: effect.params };
      }
    }
    if (effect.kind === 'stun' && ctx.getFlag(effect.targetId, 'immunityBuff:stun') > 0) {
      return { allowed: false, interrupted: 'negated', params: effect.params };
    }
  }

  const targetUnit = target!;
  const effectReduction = isSummon ? 0 : targetUnit.stats.effectReduction || 0;
  const durationReduction = isSummon ? 0 : targetUnit.stats.durationReduction || 0;

  switch (effect.kind) {
    case 'damage': {
      const p = effect.params as EffectParamsMap['damage'];
      return {
        allowed: true,
        params: { ...p, amount: applyEffectModifiers(p.amount, mods, 'effect.damage') }
      };
    }
    case 'heal': {
      const p = effect.params as EffectParamsMap['heal'];
      return {
        allowed: true,
        params: { ...p, amount: applyEffectModifiers(p.amount, mods, 'effect.heal') }
      };
    }
    case 'statModify': {
      const p = effect.params as EffectParamsMap['statModify'];
      let value = applyEffectModifiers(p.modifier.value, mods, 'effect.value');
      if (value < 0) value = value * (1 - effectReduction);
      return {
        allowed: true,
        params: { modifier: { ...p.modifier, value } }
      };
    }
    case 'stun': {
      const p = effect.params as EffectParamsMap['stun'];
      const duration = applyEffectModifiers(p.duration, mods, 'effect.duration') * (1 - durationReduction);
      return { allowed: true, params: { duration } };
    }
    case 'taunt': {
      const p = effect.params as EffectParamsMap['taunt'];
      const value = applyEffectModifiers(p.value, mods, 'effect.value') * (1 - effectReduction);
      return { allowed: true, params: { value } };
    }
    case 'summon': {
      const p = effect.params as EffectParamsMap['summon'];
      const countMods = ctx.getModifiers(effect.sourceId, 'effect');
      const count = Math.max(1, Math.round(applyEffectModifiers(p.count, countMods, 'effect.count')));
      return { allowed: true, params: { count, snapshot: p.snapshot } };
    }
    case 'applyBuff': {
      const p = effect.params as EffectParamsMap['applyBuff'];
      const instance: BuffInstance = { ...p.buffInstance };
      if (instance.duration !== null) {
        instance.duration = applyEffectModifiers(instance.duration, mods, 'effect.duration');
      }
      return { allowed: true, params: { buffInstance: instance } };
    }
    default:
      return { allowed: true, params: effect.params };
  }
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
    duration: params.duration
  };
  const application = ctx.applyBuff(effect.targetId, buff);
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
  const { count, snapshot } = params;
  for (let i = 0; i < count; i++) {
    const id = i === 0 ? effect.targetId : `${effect.targetId}-${i}`;
    ctx.turn.summonUnit({
      ...snapshot,
      id,
      name: i === 0 ? snapshot.name : `${snapshot.name}${i + 1}`
    });
  }
  return { applied: true, values: { count } };
};

const executeApplyBuff = (
  ctx: BattleContext,
  effect: EffectInstance,
  params: EffectParamsMap['applyBuff']
): EffectResult => {
  const application = ctx.applyBuff(effect.targetId, params.buffInstance);
  return { applied: true, values: { stacks: application.stacks } };
};

const executeDuring = (
  ctx: BattleContext,
  effect: EffectInstance,
  params: EffectInstance['params']
): EffectResult => {
  switch (effect.kind) {
    case 'damage':
      return executeDamage(ctx, effect, params as EffectParamsMap['damage']);
    case 'heal':
      return executeHeal(ctx, effect, params as EffectParamsMap['heal']);
    case 'statModify':
      return executeStatModify(ctx, effect, params as EffectParamsMap['statModify']);
    case 'stun':
      return executeStun(ctx, effect, params as EffectParamsMap['stun']);
    case 'dispel':
      return executeDispel(ctx, effect, params as EffectParamsMap['dispel']);
    case 'immunityElement':
      return executeImmunityElement(ctx, effect, params as EffectParamsMap['immunityElement']);
    case 'immunityBuff':
      return executeImmunityBuff(ctx, effect, params as EffectParamsMap['immunityBuff']);
    case 'taunt':
      return executeTaunt(ctx, effect, params as EffectParamsMap['taunt']);
    case 'summon':
      return executeSummon(ctx, effect, params as EffectParamsMap['summon']);
    case 'applyBuff':
      return executeApplyBuff(ctx, effect, params as EffectParamsMap['applyBuff']);
  }
};

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
