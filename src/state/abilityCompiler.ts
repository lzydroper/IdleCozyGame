/**
 * Ability 公式与效果模板编译器（combat-ability 03）。
 * 纯函数：公式求值 + 效果模板展开为 EffectInstance[]；多目标拆单目标；applyBuff 构造实例。
 */

import type { BattleUnitRuntime, BattleUnitStats, BattleUnitSnapshot } from './turnEngine';
import type { FormulaTemplate, ResolvedAbility } from './abilityTypes';
import type { EffectInstance, EffectKind, DamageElement } from './effectSystem';
import type { Modifier } from './modifier';
import type { BuffInstance } from './buffTypes';

export const evaluateFormula = (value: FormulaTemplate | number, stats: BattleUnitStats): number => {
  if (typeof value === 'number') return value;
  switch (value.kind) {
    case 'attack':
      return stats.attack * value.multiplier;
    case 'maxHp':
      return stats.maxHp * value.percent;
    case 'flat':
      return value.value;
  }
};

const isFormulaTemplate = (value: unknown): value is FormulaTemplate =>
  typeof value === 'object' &&
  value !== null &&
  'kind' in value &&
  ((value as { kind?: unknown }).kind === 'attack' ||
    (value as { kind?: unknown }).kind === 'maxHp' ||
    (value as { kind?: unknown }).kind === 'flat');

const evaluateValue = (value: unknown, stats: BattleUnitStats): unknown => {
  if (isFormulaTemplate(value)) return evaluateFormula(value, stats);
  if (Array.isArray(value)) return value.map((item) => evaluateValue(item, stats));
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      out[key] = evaluateValue(item, stats);
    }
    return out;
  }
  return value;
};

const asNumber = (value: unknown, stats: BattleUnitStats): number => {
  const resolved = evaluateValue(value, stats);
  return Math.round(typeof resolved === 'number' ? resolved : Number(resolved));
};

const buildBuffInstance = (
  params: Record<string, unknown>,
  source: BattleUnitRuntime,
  target: BattleUnitRuntime,
  stats: BattleUnitStats,
  makeId: () => string
): BuffInstance => ({
  id: makeId(),
  buffId: String(params.buffId),
  sourceId: source.id,
  targetId: target.id,
  stacks: asNumber(params.stacks ?? 1, stats),
  duration: params.duration === undefined || params.duration === null
    ? null
    : asNumber(params.duration, stats),
  values: (evaluateValue(params.values ?? {}, stats) as Record<string, number>)
});

const effectParamsForKind = (
  kind: EffectKind,
  params: Record<string, unknown>,
  source: BattleUnitRuntime,
  target: BattleUnitRuntime,
  stats: BattleUnitStats,
  makeId: () => string
): EffectInstance['params'] => {
  switch (kind) {
    case 'damage':
      return {
        amount: asNumber(params.amount, stats),
        ...(typeof params.element === 'string' ? { element: params.element as DamageElement } : {}),
        ...(typeof params.isCrit === 'boolean' ? { isCrit: params.isCrit } : {})
      };
    case 'heal':
      return { amount: asNumber(params.amount, stats) };
    case 'statModify':
      return { modifier: evaluateValue(params.modifier, stats) as Modifier };
    case 'stun':
      return { duration: asNumber(params.duration, stats) };
    case 'dispel':
      return typeof params.buffKind === 'string' ? { buffKind: params.buffKind } : {};
    case 'immunityElement':
      return { element: params.element as DamageElement };
    case 'immunityBuff':
      return { buffKind: String(params.buffKind) };
    case 'taunt':
      return { value: asNumber(params.value, stats) };
    case 'summon':
      return {
        count: asNumber(params.count, stats),
        snapshot: evaluateValue(params.snapshot, stats) as BattleUnitSnapshot
      };
    case 'applyBuff':
      return { buffInstance: buildBuffInstance(params, source, target, stats, makeId) };
  }
};

export interface CompiledAbilityEffects {
  effects: EffectInstance[];
  fireCount: number;
}

export const compileAbilityEffects = (
  ability: ResolvedAbility,
  source: BattleUnitRuntime,
  targets: BattleUnitRuntime[],
  stats: BattleUnitStats,
  makeId: () => string
): CompiledAbilityEffects => {
  const effects: EffectInstance[] = [];
  const fireCount = Math.max(
    1,
    ...ability.effects.map((template) => Math.floor(Number(template.fireCount ?? 1)))
  );

  for (const template of ability.effects) {
    const templateFireCount = Math.max(1, Math.floor(Number(template.fireCount ?? 1)));
    for (const target of targets) {
      for (let i = 0; i < templateFireCount; i++) {
        effects.push({
          id: makeId(),
          effectId: ability.abilityId + ':' + template.kind,
          kind: template.kind,
          sourceId: source.id,
          targetId: target.id,
          params: effectParamsForKind(
            template.kind,
            template.params,
            source,
            target,
            stats,
            makeId
          ),
          origin: { kind: 'ability', id: ability.abilityId }
        });
      }
    }
  }

  return { effects, fireCount };
};