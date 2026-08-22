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
  const abilities: ResolvedAbility[] = [resolveAbilityConfig(getBasicAttack())];
  for (const ref of config.abilities ?? []) {
    const base = getAbilityConfig(ref.abilityId);
    // 配置校验（combat-hygiene 05 / En#9）：引用缺失改为显式报错，不再静默 continue 掩盖配置漂移。
    if (!base) throw new Error(`enemy '${config.id}' 引用了不存在的 abilityId: '${ref.abilityId}'`);
    const merged = ref.overrides ? { ...base, ...ref.overrides, id: base.id } : base;
    abilities.push(resolveAbilityConfig(merged));
  }
  return abilities;
};

const getBasicAttack = () => {
  const base = getAbilityConfig('basic_attack');
  // 配置校验（En#9）：basic_attack 是全体实体缺省普攻，缺失属致命配置错误。
  if (!base) throw new Error("全局能力配置缺少 'basic_attack'");
  return base;
};

/**
 * 配置完整性校验（combat-hygiene 05 / En#4/#9 测试级 seam）：
 * 返回问题清单（空 = 通过）。覆盖：basic_attack 存在、敌人能力引用可解析。
 * 供测试与未来 JSON 加载器调用；运行时路径由 resolveEnemyAbilities 的抛错兜底。
 */
export const validateCombatConfigIntegrity = (): string[] => {
  const problems: string[] = [];
  if (!getAbilityConfig('basic_attack')) {
    problems.push("全局能力配置缺少 'basic_attack'");
  }
  for (const enemy of Object.values(ENEMY_CONFIGS)) {
    for (const ref of enemy.abilities ?? []) {
      if (!getAbilityConfig(ref.abilityId)) {
        problems.push(`enemy '${enemy.id}' 引用了不存在的 abilityId: '${ref.abilityId}'`);
      }
    }
  }
  return problems;
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
