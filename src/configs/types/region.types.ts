/**
 * region 域类型（config-json-migration 批次③ 工单5 收口）。
 */
import type { HeroClass, HeroFaction } from '../../types/game';

export type DropEntry =
  | { kind: 'fixed'; itemId: string; count: number }
  | { kind: 'chance'; itemId: string; count: number; chancePercent: number }
  | { kind: 'weighted'; pool: { itemId: string; count: number; weight: number }[] };

export type RegionUnlockRequirement =
  | { type: 'regionExplored'; regionId: string; percent: number }
  | { type: 'levelCleared'; regionId: string; levelId: string }
  | { type: 'itemHeld'; itemId: string; count: number };

export type RegionUnlockRequirements = RegionUnlockRequirement[];

export interface ExplorationMilestone {
  atPercent: number;
  eventId: string;
}

export interface LevelConfig {
  id: string; // 区域内稳定 local id；本内容表内亦全局唯一（便于反查）
  name: string;
  enemies: string[]; // 必须是所在 region.enemyPool 子集
  staminaCost: number;
  drops: DropEntry[];
  firstClearDrops?: DropEntry[];
}

export interface ExpeditionConfig {
  id: string;
  name: string;
  displayName: string;
  shortName?: string;
  scavengeInterval: number;
  lootTable: DropEntry[];
  requiredHeroClass?: HeroClass;
  requiredFaction?: HeroFaction;
  rationCost?: number;
  rationConsumptionRate?: number;
}

export interface RegionConfig {
  id: string;
  name: string;
  description: string;
  order: number; // 主线顺序；isTestZone 排除
  recommendedLevel: number; // 仅展示
  icon?: string; // Lucide 映射 key，UI seam
  enemyPool: string[];
  explorationEvents: string[]; // 区域事件 id 池
  explorationStepsToClear: number; // 探索 100% 目标步数
  explorationMilestones: ExplorationMilestone[];
  levels: LevelConfig[]; // 有序，末位 = 区域关底
  unlock?: RegionUnlockRequirements;
  expedition?: ExpeditionConfig;
  initialCost?: { food: number; energy: number };
  isTestZone?: boolean;
}
