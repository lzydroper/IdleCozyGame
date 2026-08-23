// 羁绊配置（config-json-migration 批次② 归位）：数据本体 data/progression/bonds.json。
// 接口沿用原 data/bonds.ts 定义（类型仅引用，批次④随 configs/types/progression.types 收口）。
import type { HeroFaction } from '../types/game';
import type { StatModifier } from '../state/statSystem';

// 羁绊配置（ticket 09）：队伍构筑策略层 —— 特定英雄组合 / 阵营条件上阵触发数值加成，
// 生效于战斗数值，由 state/bonds.ts 计算，combat.ts 应用。

export interface BondConfig {
  id: string;
  name: string;
  description: string;
  heroes: string[];                            // 必须同时上阵的英雄（可空：纯阵营条件）
  factions: Partial<Record<HeroFaction, number>>; // 阵营要求：该阵营至少 N 名上阵（可空：纯英雄组合）
  bonus: StatModifier[];                      // 触发后给予的加成数值（修饰符）
}

export { BONDS } from '../configs/loaders/progression.loader';
