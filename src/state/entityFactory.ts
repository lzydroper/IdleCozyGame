/**
 * Entity 工厂（combat-entity ticket 05）。
 *
 * 从配置引用生成 BattleEntity，并支持召唤物以生成 id 与 side 覆盖入场。
 * 本模块不依赖 combat.ts，供 Effect 层（召唤）安全引用。
 */

import { ENEMY_CONFIGS } from '../data/enemies';
import type { EnemyConfig } from '../data/entityConfig';
import { getAbilityConfig } from '../data/abilities';
import { resolveAbilityConfig, type ResolvedAbility } from './abilityTypes';
import { DEFAULT_BASE_ATTRIBUTES, DEFAULT_PRIMARY_ATTRIBUTES, DEFAULT_SPECIAL_ATTRIBUTES } from '../data/statConfig';
import { buildEntity, type BattleEntity, type EntityRecipe } from './battleEntity';

/** 召唤/动态创建参战实体时引用的配置。 */
export type EntityConfigRef = { kind: 'enemy'; id: string };

const resolveEnemyAbilities = (config: EnemyConfig): ResolvedAbility[] => {
  const abilities: ResolvedAbility[] = [resolveAbilityConfig(getAbilityConfig('basic_attack')!)];
  for (const ref of config.abilities ?? []) {
    const base = getAbilityConfig(ref.abilityId);
    if (!base) continue;
    const merged = ref.overrides ? { ...base, ...ref.overrides, id: base.id } : base;
    abilities.push(resolveAbilityConfig(merged));
  }
  return abilities;
};

/** EnemyConfig → BattleEntity。与英雄同走 buildEntity；敌人元属性/特殊属性缺省全 0。 */
export const enemyConfigToEntity = (en: EnemyConfig): BattleEntity => {
  const recipe: EntityRecipe = {
    baseAttributes: { ...DEFAULT_BASE_ATTRIBUTES, ...en.baseAttributes },
    primaryAttributes: { ...DEFAULT_PRIMARY_ATTRIBUTES, ...en.primaryAttributes },
    specialAttributes: { ...DEFAULT_SPECIAL_ATTRIBUTES, ...en.specialAttributes },
    permanentModifiers: en.modifiers ?? []
  };
  return buildEntity({
    id: en.id,
    name: en.name,
    kind: 'enemy',
    role: en.role ?? 'normal',
    side: 'enemy',
    faction: en.faction,
    recipe,
    abilities: resolveEnemyAbilities(en)
  });
};

/** 从配置引用生成实体，并允许召唤侧覆盖 id 与 side。 */
export const createEntityFromConfig = (
  ref: EntityConfigRef,
  overrides: { side: BattleEntity['side']; id: string }
): BattleEntity => {
  if (ref.kind === 'enemy') {
    const config = ENEMY_CONFIGS[ref.id];
    if (!config) throw new Error(`Unknown enemy config: ${ref.id}`);
    const entity = enemyConfigToEntity(config);
    return { ...entity, id: overrides.id, side: overrides.side };
  }
  throw new Error(`Unsupported entity config ref: ${ref.kind}`);
};
