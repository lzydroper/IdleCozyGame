/**
 * 战斗共享类型（combat-entity ticket 02）。
 *
 * 从 turnEngine.ts 抽出，避免 Turn 引擎与 statSystem 类型耦合：
 * Turn 只保留流程引擎职责，面板统计类型由本模块统一提供。
 */

import type { BaseAttributes, PrimaryAttributes, SpecialAttributes, StatModifier, CalculatedEntityStats } from './statSystem';

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

/**
 * 单一展平函数：三层计算结果 → 战斗面板（combat-aftermath 04 N2 定稿）。
 * `battleEntity.entityStats` 与 `BattleContext.resolveStats` 共用，消除双展平双口径；
 * maxHp ≥ 1 的钳制归 statSystem 计算层（finalMaxHp 已 Math.max(1,…)），此处只取整。
 */
export const toBattleUnitStats = (stats: CalculatedEntityStats): BattleUnitStats => {
  const pr = stats.primaryAttributes;
  const sp = stats.specialAttributes;
  return {
    attack: Math.round(stats.attack),
    defense: Math.round(stats.defense),
    maxHp: Math.round(stats.maxHp),
    maxMp: Math.round(stats.maxMp),
    critRate: stats.critRate,
    critDmg: stats.critDmg,
    critResist: stats.critResist,
    damageReduction: stats.damageReduction,
    durationReduction: stats.durationReduction,
    effectReduction: stats.effectReduction,
    cooldownReduction: stats.cooldownReduction,
    strength: pr.strength,
    constitution: pr.constitution,
    agility: pr.agility,
    intelligence: pr.intelligence,
    willpower: pr.willpower,
    transcendence: pr.transcendence,
    arcaneBoost: sp.arcaneBoost,
    arcaneResistance: sp.arcaneResistance,
    mechanicalLoad: sp.mechanicalLoad,
    mechanicalEvolution: sp.mechanicalEvolution,
    nightmareErosion: sp.nightmareErosion,
    voidSpirit: sp.voidSpirit,
    spiritInspire: sp.spiritInspire,
    astralGuidance: sp.astralGuidance,
    soulsealDrive: sp.soulsealDrive
  };
};

/** 共享克隆：战斗内重算配方深拷贝（battleEntity.toTurnUnit 与 turnEngine.cloneSnapshotUnit 共用）。 */
export const cloneStatParams = (p: BattleUnitStatParams): BattleUnitStatParams => ({
  baseAttributes: { ...p.baseAttributes },
  primaryAttributes: p.primaryAttributes ? { ...p.primaryAttributes } : undefined,
  specialAttributes: p.specialAttributes ? { ...p.specialAttributes } : undefined,
  permanentModifiers: p.permanentModifiers.map(m => ({ ...m }))
});
