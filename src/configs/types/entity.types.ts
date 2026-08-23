/**
 * 实体域类型（config-json-migration 批次③：自 data/entityConfig.ts 与 data/heroes.ts 收口）。
 * icon 双字段模式：json 存 iconKey（字符串），装配后注入 icon 组件（mappings/iconMap）。
 */
import type { LucideIcon } from 'lucide-react';
import type { HeroClass, HeroFaction } from '../../types/game';
import type { FacilityType } from './gameplay.types';
import type { BaseAttributes, PrimaryAttributes, SpecialAttributes } from '../../state/statSystem';

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
  sprite?: { sheet: string; index: number };
  /** json 侧图标键 */
  iconKey?: string;
  /** 装配后注入的 Lucide 回退图标 */
  icon?: LucideIcon;
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

export interface HeroConfig extends Omit<EntityConfigBase, 'baseAttributes'> {
  kind: 'hero';
  heroClass: HeroClass;
  baseAttributes: BaseAttributes;
  primaryAttributes: PrimaryAttributes;
  specialAttributes?: Partial<SpecialAttributes>;
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
