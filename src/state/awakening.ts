import type { GameState, HeroState } from '../types/game';
import type { CombatBonus } from '../data/bonds';
import {
  STAR_MAX,
  starUpShardCost,
  STAR_STATS_PER_STAR,
  AWAKEN_COST,
  AWAKEN_CONFIG,
  type AwakenSkillConfig
} from '../data/awakening';
import type { UpdateResult } from './types';

// === 升星与觉醒（ticket 12）：终局养成闭环 ===
// 升星：消耗该英雄灵魂碎片（或通用共鸣碎片，先扣专属再扣通用），每星提供百分比属性加成；
// 觉醒：满星英雄消耗奥术星体 —— 更名、强化被动、解锁专属战斗技能（combat.ts 应用）。

export type StarUpFailure = 'unknown_hero' | 'max_star' | 'no_shards';

// 升星：消耗碎片提升 1 星（星级上限 STAR_MAX）
export const starUpUpdate = (state: GameState, heroId: string): UpdateResult<StarUpFailure | true> => {
  const hero = state.heroes[heroId];
  if (!hero) return { state, result: 'unknown_hero' as const };
  if (hero.star >= STAR_MAX) return { state, result: 'max_star' as const };

  const cost = starUpShardCost(hero.star);
  const soul = state.soulShards?.[heroId] || 0;
  const resonance = state.resonanceShards || 0;
  if (soul + resonance < cost) return { state, result: 'no_shards' as const };

  // 先扣专属灵魂碎片，不足部分用通用共鸣碎片补齐
  const soulUsed = Math.min(soul, cost);
  const resonanceUsed = cost - soulUsed;
  const nextSoulShards = { ...(state.soulShards || {}) };
  if (soulUsed > 0) {
    nextSoulShards[heroId] = soul - soulUsed;
    if (nextSoulShards[heroId] <= 0) delete nextSoulShards[heroId];
  }

  return {
    state: {
      ...state,
      soulShards: nextSoulShards,
      resonanceShards: resonance - resonanceUsed,
      heroes: { ...state.heroes, [heroId]: { ...hero, star: hero.star + 1 } }
    },
    result: true
  };
};

export type AwakenFailure = 'unknown_hero' | 'not_max_star' | 'already_awakened' | 'no_orb' | 'no_config';

// 觉醒：满星英雄消耗奥术星体，进入觉醒状态（更名 / 强化被动 / 专属技能）
export const awakenUpdate = (state: GameState, heroId: string): UpdateResult<AwakenFailure | true> => {
  const hero = state.heroes[heroId];
  if (!hero) return { state, result: 'unknown_hero' as const };
  if (hero.star < STAR_MAX) return { state, result: 'not_max_star' as const };
  if (hero.awakened) return { state, result: 'already_awakened' as const };
  if (!AWAKEN_CONFIG[heroId]) return { state, result: 'no_config' as const }; // 无觉醒配置视为不可觉醒
  const lacksOrb = Object.entries(AWAKEN_COST).some(([itemId, qty]) => (state.inventory[itemId] || 0) < qty);
  if (lacksOrb) return { state, result: 'no_orb' as const };

  const nextInventory = { ...state.inventory };
  Object.entries(AWAKEN_COST).forEach(([itemId, qty]) => { nextInventory[itemId] = (nextInventory[itemId] || 0) - qty; });

  return {
    state: {
      ...state,
      inventory: nextInventory,
      heroes: { ...state.heroes, [heroId]: { ...hero, awakened: true } }
    },
    result: true
  };
};

// 星级属性加成：每颗星（1 星以上）× STAR_STATS_PER_STAR（百分比）
export const getStarBonus = (hero: HeroState): CombatBonus => {
  const stars = Math.max(0, hero.star - 1);
  if (stars === 0) return {};
  const bonus: CombatBonus = {};
  if (STAR_STATS_PER_STAR.attackPercent) bonus.attackPercent = STAR_STATS_PER_STAR.attackPercent * stars;
  if (STAR_STATS_PER_STAR.defensePercent) bonus.defensePercent = STAR_STATS_PER_STAR.defensePercent * stars;
  if (STAR_STATS_PER_STAR.maxHpPercent) bonus.maxHpPercent = STAR_STATS_PER_STAR.maxHpPercent * stars;
  return bonus;
};

// 觉醒强化被动（百分比，仅觉醒后生效）
export const getAwakenedPassive = (heroId: string, hero: HeroState): CombatBonus =>
  hero.awakened ? (AWAKEN_CONFIG[heroId]?.passive || {}) : {};

// 觉醒专属战斗技能（仅觉醒后返回配置）
export const getAwakenSkill = (heroId: string, hero: HeroState): AwakenSkillConfig | undefined =>
  hero.awakened ? AWAKEN_CONFIG[heroId]?.skill : undefined;

// 觉醒展示名（未觉醒回退原名）
export const getAwakenedName = (heroId: string, hero: HeroState): string | null =>
  hero.awakened ? (AWAKEN_CONFIG[heroId]?.awakenedName || null) : null;

// 升星 + 觉醒被动的总百分比加成（战斗内生效）
export const getAwakenBonus = (heroId: string, hero: HeroState): CombatBonus => {
  const star = getStarBonus(hero);
  const passive = getAwakenedPassive(heroId, hero);
  const bonus: CombatBonus = {};
  if (star.attackPercent || passive.attackPercent) bonus.attackPercent = (star.attackPercent || 0) + (passive.attackPercent || 0);
  if (star.defensePercent || passive.defensePercent) bonus.defensePercent = (star.defensePercent || 0) + (passive.defensePercent || 0);
  if (star.maxHpPercent || passive.maxHpPercent) bonus.maxHpPercent = (star.maxHpPercent || 0) + (passive.maxHpPercent || 0);
  return bonus;
};
