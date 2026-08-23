/**
 * Entity 工厂（combat-entity ticket 05；combat-summon-closure 04 / M4 收口）。
 *
 * resolveEntity 是唯一的公开入口：字符串 id / 配置引用（hero|enemy）/ 配置对象 三态归一。
 * 本模块不依赖 combat.ts，供 Effect 层（召唤）安全引用。
 * 英雄经本工厂产出的是「基础形态」（不含装备/天赋/羁绊等养成加成）；
 * 完整英雄装配走 combat.heroToCombatant。
 */

import { ENEMY_CONFIGS } from '../data/enemies';
import { HEROES_CONFIG, type HeroConfig } from '../data/heroes';
import type { EnemyConfig } from '../data/entityConfig';
import { getAbilityConfig } from '../data/abilities';
import { resolveAbilityConfig, type ResolvedAbility } from './abilityTypes';
import { DEFAULT_BASE_ATTRIBUTES, DEFAULT_PRIMARY_ATTRIBUTES, DEFAULT_SPECIAL_ATTRIBUTES } from '../configs/constants/statConfig';
import { buildEntity, type BattleEntity, type EntityRecipe } from './battleEntity';

/** 召唤/动态创建参战实体时引用的配置（En#2：hero | enemy 判别联合；other 待内容落地）。 */
export type EntityConfigRef = { kind: 'hero'; id: string } | { kind: 'enemy'; id: string };

/** resolveEntity 接受的来源三态。 */
export type ResolveEntitySource = EntityConfigRef | EnemyConfig | string;

const getBasicAttack = () => {
  const base = getAbilityConfig('basic_attack');
  // 配置校验（En#9）：basic_attack 是全体实体缺省普攻，缺失属致命配置错误。
  if (!base) throw new Error("全局能力配置缺少 'basic_attack'");
  return base;
};

const resolveEntityAbilities = (configId: string, refs: { abilityId: string; overrides?: unknown }[] | undefined): ResolvedAbility[] => {
  const abilities: ResolvedAbility[] = [resolveAbilityConfig(getBasicAttack())];
  for (const ref of refs ?? []) {
    const base = getAbilityConfig(ref.abilityId);
    // 配置校验（combat-hygiene 05 / En#9）：引用缺失改为显式报错，不再静默 continue 掩盖配置漂移。
    if (!base) throw new Error(`entity '${configId}' 引用了不存在的 abilityId: '${ref.abilityId}'`);
    const merged = ref.overrides ? { ...base, ...(ref.overrides as object), id: base.id } : base;
    abilities.push(resolveAbilityConfig(merged));
  }
  return abilities;
};

const enemyRecipe = (en: EnemyConfig): EntityRecipe => ({
  baseAttributes: { ...DEFAULT_BASE_ATTRIBUTES, ...en.baseAttributes },
  primaryAttributes: { ...DEFAULT_PRIMARY_ATTRIBUTES, ...en.primaryAttributes },
  specialAttributes: { ...DEFAULT_SPECIAL_ATTRIBUTES, ...en.specialAttributes },
  permanentModifiers: en.modifiers ?? []
});

/** EnemyConfig → BattleEntity。与英雄同走 buildEntity；敌人元属性/特殊属性缺省全 0。 */
export const enemyConfigToEntity = (en: EnemyConfig): BattleEntity =>
  buildEntity({
    id: en.id,
    name: en.name,
    kind: 'enemy',
    role: en.role ?? 'normal',
    side: 'enemy',
    faction: en.faction,
    recipe: enemyRecipe(en),
    abilities: resolveEntityAbilities(en.id, en.abilities)
  });

/** HeroConfig → 基础形态 BattleEntity（养成加成不在本层；见文件头注释）。 */
const heroConfigToEntity = (config: HeroConfig): BattleEntity => {
  const recipe: EntityRecipe = {
    baseAttributes: { ...DEFAULT_BASE_ATTRIBUTES, ...config.baseAttributes },
    primaryAttributes: { ...DEFAULT_PRIMARY_ATTRIBUTES, ...config.primaryAttributes },
    specialAttributes: { ...DEFAULT_SPECIAL_ATTRIBUTES, ...config.specialAttributes },
    permanentModifiers: config.modifiers ?? []
  };
  return buildEntity({
    id: config.id,
    name: config.name,
    kind: 'hero',
    side: 'hero',
    faction: config.faction,
    recipe,
    abilities: resolveEntityAbilities(config.id, config.abilities)
  });
};

/**
 * 唯一公开入口（combat-summon-closure 04 / M4）：
 * - 字符串 → 敌人配置 id；
 * - EntityConfigRef → 按 kind 查注册表；
 * - EnemyConfig 对象 → 直接装配（梦魇泄露等已有配置场景）。
 * overrides 允许召唤侧覆盖 id 与 side。
 */
export const resolveEntity = (
  source: ResolveEntitySource,
  overrides?: { side: BattleEntity['side']; id: string }
): BattleEntity => {
  let entity: BattleEntity;
  if (typeof source === 'string') {
    const config = ENEMY_CONFIGS[source];
    if (!config) throw new Error(`Unknown enemy config: ${source}`);
    entity = enemyConfigToEntity(config);
  } else if ('baseAttributes' in source) {
    // 完整配置对象直入（EnemyConfig；英雄完整装配另有专路，不走此处）。
    entity = enemyConfigToEntity(source);
  } else if (source.kind === 'enemy') {
    const config = ENEMY_CONFIGS[source.id];
    if (!config) throw new Error(`Unknown enemy config: ${source.id}`);
    entity = enemyConfigToEntity(config);
  } else {
    const config = HEROES_CONFIG[source.id];
    if (!config) throw new Error(`Unknown hero config: ${source.id}`);
    entity = heroConfigToEntity(config);
  }
  return overrides ? { ...entity, id: overrides.id, side: overrides.side } : entity;
};

/**
 * 配置完整性校验（combat-hygiene 05 / En#4/#9 测试级 seam）：
 * 返回问题清单（空 = 通过）。覆盖：basic_attack 存在、敌人能力引用可解析。
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
