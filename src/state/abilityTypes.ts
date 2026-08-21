/**
 * Ability 模块类型契约（combat-ability 01）。
 *
 * 分层：
 * - AbilityConfig：静态配置（数据层，JSON 友好），唯一配置源 src/data/abilities.ts。
 * - ResolvedAbility：进入战斗时由配置解析出的自包含运行时实例，Turn 只拿解析后的字段。
 */

import type { BuffTrigger } from './buffTypes';
import type { EffectKind } from './effectSystem';

export type AbilityActivation = 'active' | 'passive';

/** 第一版纯确定目标策略；单目标敌方选择受 taunt 标记覆盖（见 ticket 02）。 */
export type TargetingStrategy =
  | 'enemy:first'
  | 'enemy:all'
  | 'enemy:lowestHp'
  | 'ally:self'
  | 'ally:lowestHpPercent'
  | 'ally:all';

export interface AbilityCost {
  resource: string;
  amount: number;
}

/** 固定公式模板：只读单位当前面板，在派发 Effect 前一次算清。 */
export type FormulaTemplate =
  | { kind: 'attack'; multiplier: number }
  | { kind: 'maxHp'; percent: number }
  | { kind: 'flat'; value: number };

/** 效果模板：params 中的 number 直接使用，FormulaTemplate 在派发时求值。 */
export interface EffectTemplate {
  kind: EffectKind;
  params: Record<string, unknown>;
  fireCount?: number;
}

export interface PassiveAbilityConfig {
  triggers: BuffTrigger[];
  effects: EffectTemplate[];
}

export interface AbilityConfig {
  id: string;
  name: string;
  description: string;
  activation: AbilityActivation;
  targeting?: TargetingStrategy;
  cost?: AbilityCost;
  cooldown?: number;
  priority?: number;
  formula?: FormulaTemplate;
  effects?: EffectTemplate[];
  passive?: PassiveAbilityConfig;
}

/** 由 AbilityConfig 解析出的运行时实例：字段自包含，Turn 不 import 数据层。 */
export interface ResolvedAbility {
  id: string;
  abilityId: string;
  name: string;
  description: string;
  activation: AbilityActivation;
  targeting?: TargetingStrategy;
  cost?: AbilityCost;
  cooldown: number;
  priority: number;
  formula?: FormulaTemplate;
  effects: EffectTemplate[];
  passive?: PassiveAbilityConfig;
}

export const resolveAbilityConfig = (config: AbilityConfig): ResolvedAbility => ({
  id: config.id,
  abilityId: config.id,
  name: config.name,
  description: config.description,
  activation: config.activation,
  targeting: config.targeting,
  cost: config.cost,
  cooldown: config.cooldown ?? 0,
  priority: config.priority ?? 0,
  formula: config.formula,
  effects: config.effects ?? [],
  passive: config.passive
});