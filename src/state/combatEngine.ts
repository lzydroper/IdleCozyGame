/**
 * 废土魔导战斗伤害结算与怪物实体引擎 (Combat Engine)
 * 数据配置文件见 `src/data/statConfig.ts`。
 */

import { calculateEntityStats } from './statSystem';
import type { CalculatedEntityStats, BaseAttributes, PrimaryAttributes, SpecialAttributes } from './statSystem';
import { COMBAT_DAMAGE_CONFIG, DEFAULT_PRIMARY_ATTRIBUTES, DEFAULT_SPECIAL_ATTRIBUTES } from '../data/statConfig';

export type DamageElement = 'physical' | 'arcane' | 'mechanical' | 'nightmare' | 'spirit' | 'astral' | 'soulseal';

export interface CalculateDamageParams {
  attacker: CalculatedEntityStats;
  defender: CalculatedEntityStats;
  isCrit?: boolean;
  element?: DamageElement;
}

export interface DamageResult {
  damage: number;
  isCrit: boolean;
  isExempted: boolean;
  damageMitigated: number;
}

export interface CreateMonsterParams {
  name: string;
  level: number;
  baseAttack: number;
  baseDefense: number;
  baseHp: number;
  primaryAttributes?: Partial<PrimaryAttributes>;
  specialAttributes?: Partial<SpecialAttributes>;
}

/**
 * 纯函数：统一计算攻击方对防御方造成的结算伤害（含减伤、暴击、元素加成与虚无灵体豁免）
 */
export function calculateDamage(params: CalculateDamageParams): DamageResult {
  const { attacker, defender, isCrit = false, element = 'physical' } = params;

  // 1. 计算攻击面板 (含元素/阵营加成)
  let rawAttack = attacker.attack;

  if (element === 'arcane') {
    const boost = attacker.specialAttributes.arcaneBoost || 0;
    const resist = defender.specialAttributes.arcaneResistance || 0;
    rawAttack = rawAttack * (1 + boost) * (1 - Math.min(0.9, resist));
  } else if (element === 'mechanical') {
    const evo = attacker.specialAttributes.mechanicalEvolution || 0;
    rawAttack = rawAttack * (1 + evo);
  }

  // 2. 暴击乘算
  if (isCrit) {
    rawAttack = rawAttack * attacker.critDmg;
  }

  // 3. 防御百分比减伤: Damage = RawAttack * (100 / (100 + DEF))
  const defMult = COMBAT_DAMAGE_CONFIG.BASE_DEFENSE_CONSTANT / (COMBAT_DAMAGE_CONFIG.BASE_DEFENSE_CONSTANT + defender.defense);
  let damageAfterDef = rawAttack * defMult;

  // 4. 虚无灵体 (Void Spirit) 伤害豁免
  const voidExemption = Math.min(
    COMBAT_DAMAGE_CONFIG.MAX_VOID_SPIRIT_EXEMPTION,
    Math.max(0, defender.specialAttributes.voidSpirit || 0)
  );

  const isExempted = voidExemption > 0;
  let finalDamage = damageAfterDef * (1 - voidExemption);

  // 5. 确保最小伤害底线
  finalDamage = Math.max(COMBAT_DAMAGE_CONFIG.MIN_DAMAGE, Math.round(finalDamage));

  return {
    damage: finalDamage,
    isCrit,
    isExempted,
    damageMitigated: Math.max(0, Math.round(rawAttack - finalDamage))
  };
}

/**
 * 统一构建怪物实体属性，完全复用 calculateEntityStats 计算引擎
 */
export function createMonsterStats(params: CreateMonsterParams): CalculatedEntityStats {
  const base: BaseAttributes = {
    attack: params.baseAttack + params.level * 2,
    defense: params.baseDefense + params.level * 1,
    maxHp: params.baseHp + params.level * 20,
    maxMp: 100,
    critRate: 0.05,
    critDmg: 1.50
  };

  const primary: PrimaryAttributes = {
    ...DEFAULT_PRIMARY_ATTRIBUTES,
    ...params.primaryAttributes
  };

  const special: SpecialAttributes = {
    ...DEFAULT_SPECIAL_ATTRIBUTES,
    ...params.specialAttributes
  };

  return calculateEntityStats({
    baseAttributes: base,
    primaryAttributes: primary,
    specialAttributes: special
  });
}
