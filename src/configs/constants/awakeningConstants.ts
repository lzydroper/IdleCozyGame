// 升星与觉醒数值常量（config-json-migration 批次① 自 data/awakening.ts 抽取）。
import type { StatModifier } from '../../state/statSystem';

export const STAR_MAX = 5; // 星级上限（初始 1 星）

// 升星消耗：从当前星级升到下一级所需碎片数（灵魂碎片与共鸣碎片 1:1 通用，先扣专属再扣通用）
export const starUpShardCost = (currentStar: number): number => currentStar * 5;

// 每颗星（1 星以上）提供的百分比属性加成
// 例：1 星 → 攻击 +2%、防御 +2%、生命 +4%
export const STAR_STATS_PER_STAR: StatModifier[] = [
  { stat: 'attack', kind: 'percent', value: 0.02 },
  { stat: 'defense', kind: 'percent', value: 0.02 },
  { stat: 'maxHp', kind: 'percent', value: 0.04 }
];

// 觉醒消耗
export const AWAKEN_COST: Record<string, number> = { arcane_orb: 1 };
