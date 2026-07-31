import type { GameState } from '../types/game';
import { HEROES_CONFIG } from '../data/heroes';
import { createInitialHero } from '../data/initialState';
import { SUMMON_CONFIG } from '../data/summonConfig';
import type { UpdateResult } from './types';

export interface SummonOutcome {
  heroId: string | null;  // null = 本次未出英雄
  isNew: boolean;         // 是否新获得英雄
  shardsGained: number;   // 本次获得的碎片数（重复英雄灵魂碎片 或 未出的共鸣碎片）
  shardType: 'soul' | 'resonance' | null;  // null = 无碎片（新英雄）
}

// 依据软保底计算本次出英雄概率（可配置，见 summonConfig.ts）
export const computeHeroChance = (pityCount: number): number => {
  const { heroBaseChance, pityThreshold, pityStep, guaranteedAt } = SUMMON_CONFIG;
  if (pityCount >= guaranteedAt) return 1;
  if (pityCount < pityThreshold) return heroBaseChance;
  return Math.min(1, heroBaseChance + (pityCount - pityThreshold + 1) * pityStep);
};

// 从统一召唤池（全部英雄配置）等概率随机选一位
export const rollHeroId = (rng: () => number): string => {
  const ids = Object.keys(HEROES_CONFIG);
  const raw = Math.floor(rng() * ids.length);
  const idx = Math.max(0, Math.min(ids.length - 1, raw));
  return ids[idx];
};

/**
 * 英雄召唤（单抽）：消耗灵魂残响，按单概率池 + 软保底判定。
 * - 出英雄：等概率从统一池选取；若已拥有 → 转化为该英雄灵魂碎片（soulShards）
 * - 未出英雄：获得共鸣碎片（resonanceShards）
 * rng 可注入，便于测试确定性。
 */
export const summonUpdate = (
  state: GameState,
  rng: () => number = Math.random
): UpdateResult<SummonOutcome> => {
  if ((state.soulEchoes || 0) < SUMMON_CONFIG.costPerSummon) {
    return {
      state,
      result: { heroId: null, isNew: false, shardsGained: 0, shardType: null }
    };
  }

  const pityCount = state.summon?.pityCount ?? 0;
  const chance = computeHeroChance(pityCount);
  const rolled = rng();

  const newPity = pityCount + 1;
  const nextSummon = { pityCount: newPity };

  // 未出英雄：共鸣碎片
  if (rolled > chance) {
    return {
      state: {
        ...state,
        soulEchoes: state.soulEchoes - SUMMON_CONFIG.costPerSummon,
        resonanceShards: (state.resonanceShards || 0) + SUMMON_CONFIG.resonancePerMiss,
        summon: nextSummon
      },
      result: {
        heroId: null,
        isNew: false,
        shardsGained: SUMMON_CONFIG.resonancePerMiss,
        shardType: 'resonance'
      }
    };
  }

  // 出英雄：等概率从池中选取
  const heroId = rollHeroId(rng);
  const alreadyOwned = !!state.heroes[heroId];
  const nextHeroes = { ...state.heroes };
  const nextSoulShards = { ...(state.soulShards || {}) };

  if (alreadyOwned) {
    // 重复英雄 → 专属灵魂碎片（软保底计数同时重置：出英雄即视为保底兑现）
    nextSoulShards[heroId] = (nextSoulShards[heroId] || 0) + SUMMON_CONFIG.shardsPerDupe;
  } else {
    nextHeroes[heroId] = createInitialHero(heroId);
  }

  return {
    state: {
      ...state,
      soulEchoes: state.soulEchoes - SUMMON_CONFIG.costPerSummon,
      heroes: nextHeroes,
      soulShards: nextSoulShards,
      summon: { pityCount: 0 }
    },
    result: {
      heroId,
      isNew: !alreadyOwned,
      shardsGained: alreadyOwned ? SUMMON_CONFIG.shardsPerDupe : 0,
      shardType: alreadyOwned ? 'soul' : null
    }
  };
};
