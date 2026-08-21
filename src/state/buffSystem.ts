/**
 * 废土魔导 Buff/Debuff 状态机（stat-bonus-unification 07）
 * buff 修饰符与常驻加成共用 statSystem 统一管道：
 * - `collectBuffModifiers` 展开活动 buff 的修饰符（debuff 按意志减免调整），与常驻修饰符合并后
 *   交给 `calculateEntityStats` 一次计算（percent 加算、clamp 最终级、元属性折算自动生效）；
 * - `tickBuffs` 推进回合递减。
 */

import type { StatModifier } from './statSystem';
import { BUFF_LIMIT_CONFIG } from '../data/statConfig';

export interface ActiveBuff {
  id: string;
  name: string;
  type: 'buff' | 'debuff';
  duration: number;      // 剩余回合数
  maxDuration: number;   // 最大持续回合数
  statModifiers: StatModifier[];
}

// 展开活动 buff 的修饰符：debuff 按意志减免（effectReduction，clamp 沿用 0.00~0.80）调整数值。
// 返回的修饰符与常驻修饰符合并后传入 calculateEntityStats，由统一管道计算（含元属性折算）。
export const collectBuffModifiers = (activeBuffs: ActiveBuff[], effectReduction: number): StatModifier[] =>
  activeBuffs.flatMap(buff => {
    const mitigation =
      buff.type === 'debuff'
        ? 1 - Math.min(
            BUFF_LIMIT_CONFIG.MAX_DEBUFF_EFFECT_REDUCTION,
            Math.max(BUFF_LIMIT_CONFIG.MIN_DEBUFF_EFFECT_REDUCTION, effectReduction)
          )
        : 1;
    return buff.statModifiers.map(m => ({ ...m, value: m.value * mitigation }));
  });

/**
 * 推进按回合（Turn/Round）结算的 Buffs 持续时间，滤除到期 Buff
 */
export function tickBuffs(activeBuffs: ActiveBuff[]): ActiveBuff[] {
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
