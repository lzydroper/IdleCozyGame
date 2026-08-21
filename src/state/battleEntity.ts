/**
 * 运行时参战实体（combat-entity ticket 03）。
 *
 * BattleEntity 是所有参战单位（英雄/敌人/梦魇/召唤物）进战斗后的统一形态：
 * - 只保存配方（三层输入 + 常驻修饰符）与运行时 hp/mp；
 * - 面板由 entityStats 按需计算，消除旧的 flat 面板 + snapshot 双轨；
 * - toTurnUnit 是 Entity → Turn 快照的唯一转换缝。
 */

import type { HeroFaction } from '../types/game';
import type { BaseAttributes, PrimaryAttributes, SpecialAttributes, StatModifier } from './statSystem';
import { calculateEntityStats } from './statSystem';
import type { BattleUnitStats } from './battleTypes';
import type { BattleUnitSnapshot, UnitSide } from './turnEngine';
import { calculateInitiative } from './turnEngine';
import type { ResolvedAbility } from './abilityTypes';
import type { EntityKind, EnemyRole } from '../data/entityConfig';

export interface EntityRecipe {
  baseAttributes: BaseAttributes;
  primaryAttributes: PrimaryAttributes;
  specialAttributes: SpecialAttributes;
  permanentModifiers: StatModifier[];
}

export interface BattleEntity {
  id: string;
  name: string;
  kind: EntityKind;
  role?: EnemyRole;
  side: UnitSide;
  faction: HeroFaction;
  recipe: EntityRecipe;
  hp: number;
  mp: number;
  abilities: ResolvedAbility[];
  initiative: number;
}

/** 由配方计算完整战斗面板（三层算好后的属性）。 */
export const entityStats = (entity: BattleEntity): BattleUnitStats => {
  const stats = calculateEntityStats(entity.recipe, entity.recipe.permanentModifiers);
  const sp = stats.specialAttributes;
  return {
    attack: Math.round(stats.attack),
    defense: Math.round(stats.defense),
    maxHp: Math.round(stats.maxHp),
    maxMp: Math.round(stats.maxMp),
    critRate: stats.critRate,
    critDmg: stats.critDmg,
    critResist: stats.critResist,
    damageReduction: stats.damageReduction,
    durationReduction: stats.durationReduction,
    effectReduction: stats.effectReduction,
    cooldownReduction: stats.cooldownReduction,
    strength: stats.primaryAttributes.strength,
    constitution: stats.primaryAttributes.constitution,
    agility: stats.primaryAttributes.agility,
    intelligence: stats.primaryAttributes.intelligence,
    willpower: stats.primaryAttributes.willpower,
    transcendence: stats.primaryAttributes.transcendence,
    arcaneBoost: sp.arcaneBoost,
    arcaneResistance: sp.arcaneResistance,
    mechanicalLoad: sp.mechanicalLoad,
    mechanicalEvolution: sp.mechanicalEvolution,
    nightmareErosion: sp.nightmareErosion,
    voidSpirit: sp.voidSpirit,
    spiritInspire: sp.spiritInspire,
    astralGuidance: sp.astralGuidance,
    soulsealDrive: sp.soulsealDrive
  };
};

/** BattleEntity → Turn 引擎单位快照。 */
export const toTurnUnit = (entity: BattleEntity): BattleUnitSnapshot => {
  const stats = entityStats(entity);
  return {
    id: entity.id,
    name: entity.name,
    side: entity.side,
    hp: Math.max(0, entity.hp),
    maxHp: stats.maxHp,
    initiative: entity.initiative,
    abilities: entity.abilities,
    stats,
    currentMp: entity.mp,
    statParams: {
      baseAttributes: { ...entity.recipe.baseAttributes },
      primaryAttributes: { ...entity.recipe.primaryAttributes },
      specialAttributes: { ...entity.recipe.specialAttributes },
      permanentModifiers: entity.recipe.permanentModifiers.map(m => ({ ...m }))
    }
  };
};

export interface BuildEntityParams {
  id: string;
  name: string;
  kind: EntityKind;
  side: UnitSide;
  faction: HeroFaction;
  recipe: EntityRecipe;
  hpRatio?: number;
  role?: EnemyRole;
  abilities?: ResolvedAbility[];
  initiative?: number;
}

/** 由配方构造 BattleEntity；hpRatio 保持已损比例（缺省满血）。 */
export const buildEntity = (params: BuildEntityParams): BattleEntity => {
  const stats = calculateEntityStats(params.recipe, params.recipe.permanentModifiers);
  const maxHp = Math.round(stats.maxHp);
  const ratio = Math.min(1, Math.max(0, params.hpRatio ?? 1));
  const agility = params.recipe.primaryAttributes.agility;
  return {
    id: params.id,
    name: params.name,
    kind: params.kind,
    role: params.role,
    side: params.side,
    faction: params.faction,
    recipe: params.recipe,
    hp: Math.round(maxHp * ratio),
    mp: Math.round(stats.maxMp),
    abilities: params.abilities ?? [],
    initiative: params.initiative ?? calculateInitiative(agility, 0)
  };
};
