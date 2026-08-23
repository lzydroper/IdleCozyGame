/**
 * progression 养成域装配（config-json-migration 批次② 2.5）：
 * bonds / talentTrunks（职阶公共主干）/ growthByClass 三表 json 装配。
 * 英雄专属天赋节点与 levelMilestones 留英雄侧，批次③随实体拆分迁移；
 * 构建公式已迁 src/state/talentsTree.ts 与 src/state/heroGrowth.ts（运行时逻辑归位）。
 */
import bondsJson from '../../data/progression/bonds.json';
import talentTrunksJson from '../../data/progression/talentTrunks.json';
import growthByClassJson from '../../data/progression/growthByClass.json';
import type { HeroClass } from '../../types/game';
import type { TalentNodeConfig } from '../../data/talents';
import type { HeroGrowthConfig } from '../../state/heroGrowth';
import type { BondConfig } from '../../data/bonds';

export const BONDS = bondsJson as unknown as BondConfig[];
// 形状沿用 data/talents.ts 的既有接口（类型仅引用，运行时零循环）。
export const TALENT_TRUNKS = talentTrunksJson as Record<HeroClass, TalentNodeConfig[]>;
export const HERO_GROWTH_BY_CLASS = growthByClassJson as unknown as Record<HeroClass, HeroGrowthConfig>;
