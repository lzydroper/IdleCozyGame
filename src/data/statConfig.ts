/**
 * 三层属性与 Buff 数值驱动配置文件 (Data-Driven Configuration)
 * 允许在不修改业务逻辑代码的前提下调参与配置扩展。
 */

import type { BaseAttributes, PrimaryAttributes, SpecialAttributes } from '../state/statSystem';

// === 1. 默认属性基准配置 ===
export const DEFAULT_PRIMARY_ATTRIBUTES: Readonly<PrimaryAttributes> = {
  strength: 0,
  constitution: 0,
  agility: 0,
  intelligence: 0,
  willpower: 0,
  transcendence: 0
};

export const DEFAULT_BASE_ATTRIBUTES: Readonly<BaseAttributes> = {
  attack: 10,
  defense: 5,
  maxHp: 100,
  maxMp: 50,
  critRate: 0.05,
  critDmg: 1.50
};

export const DEFAULT_SPECIAL_ATTRIBUTES: Readonly<SpecialAttributes> = {
  arcaneBoost: 0,
  arcaneResistance: 0,
  mechanicalLoad: 0,
  mechanicalEvolution: 0,
  nightmareErosion: 0,
  voidSpirit: 0,
  spiritInspire: 0,
  astralGuidance: 0,
  soulsealDrive: 0
};

// 基础属性种子（英雄 Lv1 / 敌人固定面板共用）：攻击/防御/生命必填，其余缺省与 DEFAULT_BASE_ATTRIBUTES 一致。
// stat-bonus-unification 统一实体：HeroConfig 与 CombatEnemyConfig 同用此形状，不再各自声明扁平字段。
export type BaseStatsSeed = Required<Pick<BaseAttributes, 'attack' | 'defense' | 'maxHp'>> &
  Partial<Omit<BaseAttributes, 'attack' | 'defense' | 'maxHp'>>;

// === 2. 元属性向基础属性加成映射配置系数 ===
export const PRIMARY_STAT_SCALING_CONFIG = {
  STRENGTH_TO_ATTACK: 2.0,                  // 1 力量 = +2.0 攻击
  STRENGTH_TO_CRIT_DMG: 0.005,              // 1 力量 = +0.5% 暴击倍率
  CONSTITUTION_TO_MAX_HP: 10.0,             // 1 体质 = +10.0 最大生命
  CONSTITUTION_TO_DEFENSE: 1.0,             // 1 体质 = +1.0 防御
  AGILITY_TO_CRIT_RATE: 0.002,              // 1 敏捷 = +0.2% 暴击率
  AGILITY_TO_CRIT_RESIST: 0.001,            // 1 敏捷 = +0.1% 免暴率
  INTELLIGENCE_TO_MAX_MP: 5.0,              // 1 智慧 = +5.0 最大魔力
  INTELLIGENCE_TO_ARCANE_BOOST: 0.005,      // 1 智慧 = +0.5% 奥术增幅
  WILLPOWER_TO_DURATION_REDUCE: 0.005,      // 1 意志 = +0.5% 负面持续减免
  WILLPOWER_TO_EFFECT_REDUCE: 0.005,        // 1 意志 = +0.5% 负面数值减免
  TRANSCENDENCE_TO_COOLDOWN_REDUCE: 0.003  // 1 超越 = +0.3% 冷却减免
};

// === 3. Buff / Debuff 数值上限配置 ===
export const BUFF_LIMIT_CONFIG = {
  MAX_DEBUFF_EFFECT_REDUCTION: 0.80,  // 意志带来的负面效果减免最大上限 (80%)
  MIN_DEBUFF_EFFECT_REDUCTION: 0.00,  // 负面效果减免下限 (0%)
  MIN_CRIT_RATE: 0.00,                 // 暴击率下限 (0%)
  MAX_CRIT_RATE: 1.00,                 // 暴击率上限 (100%)
  MIN_CRIT_DMG: 1.00                   // 暴击倍率下限 (100%)
};

// === 4. 战斗伤害结算配置 ===
export const COMBAT_DAMAGE_CONFIG = {
  MIN_DAMAGE: 1,                       // 最小固定伤害底线
  MAX_VOID_SPIRIT_EXEMPTION: 0.90,     // 虚无灵体最大豁免比例 (90%)
  BASE_DEFENSE_CONSTANT: 100            // 防御百分比减伤基数 DEF / (100 + DEF)
};
