/**
 * 实体域类型（config-json-migration 批次③：自 data/entityConfig.ts 与 data/heroes.ts 收口）。
 * icon 单字段模式：json 存字符串（.png 切图路径或 iconKey），装配后解析为 GameArt（mappings/artMap）。
 */
import type { HeroClass, HeroFaction } from '../../types/game';
import type { FacilityType } from './gameplay.types';
import type { BaseAttributes, PrimaryAttributes, SpecialAttributes, StatModifier } from '../../state/statSystem';
import type { GameArt } from './art.types';
import type { TargetingStrategy, AbilityCost } from '../../state/abilityTypes';

export type EntityKind = 'hero' | 'enemy' | 'other';

export type EnemyRole = 'normal' | 'boss' | 'nightmare';

/** 能力引用：全局能力注册表为真相源，overrides 允许实体级覆盖。 */
export interface AbilityRef {
  abilityId: string;
  overrides?: Record<string, unknown>;
}

export interface EntityConfigBase {
  id: string;
  name: string;
  description?: string;
  kind: EntityKind;
  faction: HeroFaction;
  baseAttributes: Partial<BaseAttributes>;
  primaryAttributes?: Partial<PrimaryAttributes>;
  specialAttributes?: Partial<SpecialAttributes>;
  modifiers?: import('../../state/statSystem').StatModifier[];
  abilities?: AbilityRef[];
  /** json 侧 icon 字符串，装配后解析为 GameArt */
  icon?: GameArt;
}

export interface EnemyConfig extends EntityConfigBase {
  kind: 'enemy';
  role?: EnemyRole;
}

export interface OtherConfig extends EntityConfigBase {
  kind: 'other';
}

// === 英雄 ===

export type DutyScope =
  | { kind: 'all' }
  | { kind: 'facility'; facilityType: FacilityType }
  | { kind: 'greenhouse'; cropIds?: string[] }
  | { kind: 'expedition' };

export interface DutyBonus {
  scope: DutyScope;
  speedMultiplier?: number;
  yieldMultiplier?: number;
  costReduction?: number;
  intervalReduction?: number;
  lootChanceBonus?: number;
}

export interface HeroDutyMeta {
  bonuses: DutyBonus[];
}

export interface HeroLevelMilestones {
  [level: number]: Partial<BaseAttributes & PrimaryAttributes & SpecialAttributes>;
}

export interface HeroConfig extends Omit<EntityConfigBase, 'baseAttributes' | 'icon'> {
  kind: 'hero';
  heroClass: HeroClass;
  baseAttributes: BaseAttributes;
  primaryAttributes: PrimaryAttributes;
  specialAttributes?: Partial<SpecialAttributes>;
  /** 视觉（装配后必存在）：英雄立绘切图或 Lucide 回退 */
  icon: GameArt;
  /** 里程碑加成（growth.json 段）。 */
  levelMilestones?: HeroLevelMilestones;
  /** 后勤驻守 Meta（duty.json 段）。 */
  dutyMeta?: HeroDutyMeta;
}

// === 幸存者档案（ADR-0013：幸存者=英雄的剧情别称） ===

export interface SurvivorConfig {
  id: string;
  name: string;
  role: 'farmer' | 'engineer' | 'scout' | 'guard' | 'chemist' | 'scavenger';
  /** 角色中文职位名，供 UI 直接显示（避免重复 ternary 硬编码） */
  roleLabel: string;
  backstory: string;
  dreamTrigger: string;
  realityLocationId: string;
}

// === 升星与觉醒（ticket 12） ===
// awaken.json 内联觉醒专属能力本体（无复用，创作 locality）；combat.loader 并入统一注册表，
// 本类型为运行时暴露形状：abilityId 由装配层从 ability.id 派生回填。
export type AwakenConfig = {
  awakenedName: string;   // 觉醒后的名字（外观变化）
  passive: StatModifier[]; // 觉醒强化被动（百分比，战斗内生效）
  abilityId: string;      // 觉醒专属技能引用（已并入 combat/abilities 统一注册表）
};

// === 英雄技能槽位（heroes-skills spec §1.1；决议见 .scratch/heroes-skills/issues） ===

/** 解锁 / 里程碑共用条件词汇：全部键可选，AND 语义；键名对齐 HeroState。 */
export interface SkillCondition {
  level?: number;
  star?: number;
  awakened?: boolean;
}

/** 结构字段补丁（绝对值替换）：白名单四字段——发动节奏旋钮，效果数值请走 growth。 */
export interface SkillMilestonePatch {
  cooldown?: number;
  priority?: number;
  targeting?: TargetingStrategy;
  cost?: AbilityCost;
}

export interface SkillMilestone {
  at: SkillCondition;
  patch: SkillMilestonePatch;
}

export type HeroSkillSlot = 1 | 2 | 3;

/** skills.json 行：每英雄恒三行（槽位 1/2 引用全局能力，槽位 3 引用 awaken 内联能力）。 */
export interface SkillRow {
  id: string;
  slot: HeroSkillSlot;
  abilityId: string;
  /** 同敌人 AbilityRef 的浅合并语义（v1 英雄侧一般不用）。 */
  overrides?: Record<string, unknown>;
  unlock?: SkillCondition;
  /** 数值成长（只乘公式叶）：效果数值 = 基准 × (1+perLevel×(等级−1)) × (1+perStar×星数)。 */
  growth?: { perLevel?: number; perStar?: number };
  milestones?: SkillMilestone[];
}
