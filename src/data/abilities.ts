/**
 * Ability 配置注册表（config-json-migration 批次③ 归位）：
 * 配置本体已迁 data/combat/abilities/*.json，装配与 description 插值收口
 * configs/loaders/combat.loader——本文件仅转发兼容存量引用（批次④收口删除）。
 */
export { ABILITY_CONFIGS, BASIC_ATTACK, getAbilityConfig } from '../configs/loaders/combat.loader';
