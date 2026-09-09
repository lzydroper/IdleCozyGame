/**
 * 统一 Modifier（Effect.md）：属性加成与效果数值修正共用一种形状。
 * - target 命名空间区分作用对象：'stat.<StatKey>' 或 'effect.<参数名>'。
 * - op: 'add' = 加算 flat；'multiply' = 乘算 percent（小数，多来源加算）。
 * 旧 StatModifier 通过适配器与本类型互转，旧消费链保持不动。
 */

import type { StatKey, StatModifier } from './statSystem';

export type ModifierNamespace = 'stat' | 'effect';

/** 效果参数名（combat-hygiene 05 / E#5）：按 EffectKind 收敛为常量 union，消除拼写漂移。 */
export type EffectParamKey = 'damage' | 'heal' | 'value' | 'duration' | 'count';

export type StatTarget = `stat.${StatKey}`;
export type EffectTarget = `effect.${EffectParamKey}`;
export type ModifierTarget = StatTarget | EffectTarget;

export interface Modifier {
  target: ModifierTarget;
  op: 'add' | 'multiply';
  value: number;
  source?: string;
}

export const isStatTarget = (target: ModifierTarget): target is StatTarget =>
  target.startsWith('stat.');

export const fromStatModifier = (m: StatModifier): Modifier => ({
  target: `stat.${m.stat}`,
  op: m.kind === 'flat' ? 'add' : 'multiply',
  value: m.value,
  source: m.source
});

export const toStatModifier = (m: Modifier): StatModifier | null => {
  if (!isStatTarget(m.target)) return null;
  const stat = m.target.slice('stat.'.length) as StatKey;
  return {
    stat,
    kind: m.op === 'add' ? 'flat' : 'percent',
    value: m.value,
    source: m.source
  };
};

/** effect.* 聚合：同 target 的 add 求和、multiply 求和，最终 (base + Σadd) × (1 + Σmultiply)。 */
export const applyEffectModifiers = (
  base: number,
  modifiers: readonly Modifier[],
  target: ModifierTarget
): number => {
  let add = 0;
  let multiply = 0;
  for (const m of modifiers) {
    if (m.target !== target) continue;
    if (m.op === 'add') add += m.value;
    else multiply += m.value;
  }
  return (base + add) * (1 + multiply);
};
