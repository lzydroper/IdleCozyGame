/**
 * Entity 配置层统一类型（combat-entity ticket 01）。
 *
 * 分层：
 * - 顶层 `kind` 只判别 'hero' | 'enemy' | 'other'，避免把敌人子类型耦合进顶层。
 * - 敌人子类型走 `role`（normal/boss/nightmare）；英雄子类型继续走 `heroClass`。
 * - `abilities` 用 `AbilityRef` 引用全局能力注册表，并允许实体级覆盖配置。
 */

import type { HeroFaction } from '../types/game';
import type { BaseStatsSeed } from './statConfig';
import type { PrimaryAttributes, SpecialAttributes, StatModifier } from '../state/statSystem';
import type { AbilityConfig } from '../state/abilityTypes';
import type { ItemSprite } from './items/types';
import type { LucideIcon } from 'lucide-react';

export type EntityKind = 'hero' | 'enemy' | 'other';

export type EnemyRole = 'normal' | 'boss' | 'nightmare';

/** 能力引用：全局 `ABILITY_CONFIGS` 为真相源，`overrides` 允许实体级覆盖。 */
export interface AbilityRef {
  abilityId: string;
  overrides?: Partial<AbilityConfig>;
}

/** 所有参战实体配置的公共字段。 */
export interface EntityConfigBase {
  id: string;
  name: string;
  description?: string;
  kind: EntityKind;
  faction: HeroFaction;
  baseAttributes: BaseStatsSeed;
  primaryAttributes?: Partial<PrimaryAttributes>;
  specialAttributes?: Partial<SpecialAttributes>;
  modifiers?: StatModifier[];
  abilities?: AbilityRef[];
  sprite?: ItemSprite;
  icon?: LucideIcon;
}

export interface EnemyConfig extends EntityConfigBase {
  kind: 'enemy';
  role?: EnemyRole;
}

export interface OtherConfig extends EntityConfigBase {
  kind: 'other';
}
