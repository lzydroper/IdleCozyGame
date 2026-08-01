/**
 * 废土魔导 Buff/Debuff 状态机与增益计算引擎 (Buff/Debuff Engine)
 * 数据配置文件见 `src/data/statConfig.ts`。
 */

import type { CalculatedEntityStats, PrimaryAttributes } from './statSystem';
import { BUFF_LIMIT_CONFIG } from '../data/statConfig';

export type ModifiableStat = 
  | 'attack' 
  | 'defense' 
  | 'maxHp' 
  | 'maxMp' 
  | 'critRate' 
  | 'critDmg'
  | 'strength'
  | 'constitution'
  | 'agility'
  | 'intelligence'
  | 'willpower'
  | 'transcendence'
  | 'arcaneBoost'
  | 'voidSpirit';

export interface StatModifier {
  stat: ModifiableStat;
  kind: 'flat' | 'percent';
  value: number;
}

export interface ActiveBuff {
  id: string;
  name: string;
  type: 'buff' | 'debuff';
  duration: number;      // 剩余回合数
  maxDuration: number;   // 最大持续回合数
  statModifiers: StatModifier[];
}

/**
 * 将活动 Buff/Debuff 应用合并至实体最终属性中
 */
export function applyBuffsToStats(
  baseCalculatedStats: CalculatedEntityStats,
  activeBuffs: ActiveBuff[]
): CalculatedEntityStats {
  if (!activeBuffs || activeBuffs.length === 0) {
    return baseCalculatedStats;
  }

  // 获取意志带来的负面效果数值减免比例 (从 statConfig.ts 读取限制)
  const effectReductionRatio = Math.min(
    BUFF_LIMIT_CONFIG.MAX_DEBUFF_EFFECT_REDUCTION,
    Math.max(BUFF_LIMIT_CONFIG.MIN_DEBUFF_EFFECT_REDUCTION, baseCalculatedStats.effectReduction || 0)
  );

  // 整理各类属性的 Flat 与 Percent 增幅
  const flatBonuses: Partial<Record<ModifiableStat, number>> = {};
  const percentBonuses: Partial<Record<ModifiableStat, number>> = {};

  for (const buff of activeBuffs) {
    const isDebuff = buff.type === 'debuff';
    
    // 若为负面效果 (debuff)，根据意志 (Willpower) 减免计算实际生效数值
    const mitigation = isDebuff ? (1 - effectReductionRatio) : 1.0;

    for (const mod of buff.statModifiers) {
      const effectiveVal = mod.value * mitigation;

      if (mod.kind === 'flat') {
        flatBonuses[mod.stat] = (flatBonuses[mod.stat] || 0) + effectiveVal;
      } else if (mod.kind === 'percent') {
        percentBonuses[mod.stat] = (percentBonuses[mod.stat] || 0) + effectiveVal;
      }
    }
  }

  // 基础属性拆算
  const calcBaseStat = (baseVal: number, key: ModifiableStat): number => {
    const flat = flatBonuses[key] || 0;
    const percent = percentBonuses[key] || 0;
    return (baseVal + flat) * (1 + percent);
  };

  const finalAttack = Math.max(0, calcBaseStat(baseCalculatedStats.attack, 'attack'));
  const finalDefense = Math.max(0, calcBaseStat(baseCalculatedStats.defense, 'defense'));
  const finalMaxHp = Math.max(1, calcBaseStat(baseCalculatedStats.maxHp, 'maxHp'));
  const finalMaxMp = Math.max(0, calcBaseStat(baseCalculatedStats.maxMp, 'maxMp'));

  const finalCritRate = Math.min(
    BUFF_LIMIT_CONFIG.MAX_CRIT_RATE,
    Math.max(BUFF_LIMIT_CONFIG.MIN_CRIT_RATE, calcBaseStat(baseCalculatedStats.critRate, 'critRate'))
  );
  const finalCritDmg = Math.max(
    BUFF_LIMIT_CONFIG.MIN_CRIT_DMG,
    calcBaseStat(baseCalculatedStats.critDmg, 'critDmg')
  );

  // 重新计算百分比减伤: DEF / (100 + DEF)
  const damageReduction = finalDefense / (100 + finalDefense);

  // 特殊/元属性加成
  const arcaneBoost = calcBaseStat(baseCalculatedStats.specialAttributes.arcaneBoost, 'arcaneBoost');
  const voidSpirit = calcBaseStat(baseCalculatedStats.specialAttributes.voidSpirit, 'voidSpirit');

  return {
    ...baseCalculatedStats,
    attack: finalAttack,
    defense: finalDefense,
    maxHp: finalMaxHp,
    maxMp: finalMaxMp,
    critRate: finalCritRate,
    critDmg: finalCritDmg,
    damageReduction,
    specialAttributes: {
      ...baseCalculatedStats.specialAttributes,
      arcaneBoost,
      voidSpirit
    }
  };
}

/**
 * 推进按回合（Turn/Round）结算的 Buffs 持续时间，滤除到期 Buff
 */
export function tickBuffs(
  activeBuffs: ActiveBuff[],
  _primaryAttributes?: PrimaryAttributes
): ActiveBuff[] {
  if (!activeBuffs || activeBuffs.length === 0) {
    return [];
  }

  return activeBuffs
    .map(buff => ({
      ...buff,
      duration: buff.duration - 1
    }))
    .filter(buff => buff.duration > 0);
}
