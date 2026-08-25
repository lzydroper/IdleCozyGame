/**
 * 技能描述占位符渲染器（heroes-skills spec §4.1）。
 * 输入烘焙完成的 ResolvedAbility（growth/milestones/重写已应用），把描述中的
 * 花括号占位符替换为实际数值——预览与战斗同源由 resolveHeroSkills 输出保证。
 *
 * v1 词表：{attackPct} / {maxHpPct} / {value}；未登记占位符原样保留 + DEV 告警。
 */
import type { FormulaTemplate, ResolvedAbility } from './abilityTypes';
import { isFormulaLeaf, FORMULA_NUM_FIELD } from './heroSkills';

const TOKEN_PATTERN = /\{([a-zA-Z][a-zA-Z0-9]*)\}/g;

/** 在 effects 参数中找第一个指定种类的公式叶数值。 */
const firstFormulaValue = (ability: ResolvedAbility, kind: FormulaTemplate['kind']): number | null => {
  for (const effect of ability.effects) {
    for (const value of Object.values(effect.params)) {
      if (isFormulaLeaf(value) && value.kind === kind) {
        return Number((value as unknown as Record<string, number>)[FORMULA_NUM_FIELD[kind]]);
      }
    }
  }
  return null;
};

/** 占位符 → 显示值；未登记返回 null。 */
export const descriptionTokenValue = (ability: ResolvedAbility, token: string): string | null => {
  switch (token) {
    case 'attackPct': {
      const multiplier = firstFormulaValue(ability, 'attack');
      return multiplier === null ? null : `${Math.round(multiplier * 100)}%`;
    }
    case 'maxHpPct': {
      const percent = firstFormulaValue(ability, 'maxHp');
      return percent === null ? null : `${Math.round(percent * 100)}%`;
    }
    case 'value': {
      const value = firstFormulaValue(ability, 'flat');
      return value === null ? null : `${Math.round(value)}`;
    }
    default:
      return null;
  }
};

/** 渲染描述：花括号占位符 → 实际值；未知键 DEV 告警并原样保留（防内容笔误静默上线）。 */
export const renderAbilityDescription = (description: string, ability: ResolvedAbility | null): string => {
  if (!ability) return description;
  return description.replace(TOKEN_PATTERN, (raw, key: string) => {
    const value = descriptionTokenValue(ability, key);
    if (value !== null) return value;
    if (import.meta.env.DEV) {
      console.warn(`[abilityDescription] 未登记的描述占位符 '{${key}}'（${ability.abilityId}），原样保留`);
    }
    return raw;
  });
};
