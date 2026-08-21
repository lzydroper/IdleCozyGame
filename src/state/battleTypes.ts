/**
 * 战斗共享类型（combat-entity ticket 02）。
 *
 * 从 turnEngine.ts 抽出，避免 Turn 引擎与 statSystem 类型耦合：
 * Turn 只保留流程引擎职责，面板统计类型由本模块统一提供。
 */

import type { BaseAttributes, PrimaryAttributes, SpecialAttributes, StatModifier } from './statSystem';

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

/** 战斗内重算面板所需的原始配方：入场三层输入 + 常驻修饰符。 */
export interface BattleUnitStatParams {
  baseAttributes: BaseAttributes;
  primaryAttributes?: Partial<PrimaryAttributes>;
  specialAttributes?: Partial<SpecialAttributes>;
  permanentModifiers: StatModifier[];
}
