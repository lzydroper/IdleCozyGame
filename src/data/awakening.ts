// 升星与觉醒配置（ticket 12；config-json-migration 批次③ 归位）：
// - 升星常量 → configs/constants/awakeningConstants；
// - AWAKEN_CONFIG（per-hero）→ data/entities/heroes/<id>/awaken.json（经 heroes.loader 装配）；
// 本文件仅转发兼容存量引用（批次④收口删除）。
import type { StatModifier } from '../state/statSystem';

export type AwakenConfig = {
  awakenedName: string;   // 觉醒后的名字（外观变化）
  passive: StatModifier[]; // 觉醒强化被动（百分比，战斗内生效）
  abilityId: string;      // 觉醒专属技能引用（combat/abilities/<id>.json）
};

export { STAR_MAX, starUpShardCost, STAR_STATS_PER_STAR, AWAKEN_COST } from '../configs/constants/awakeningConstants';
export { AWAKEN_CONFIG } from '../configs/loaders/entities.loader';
