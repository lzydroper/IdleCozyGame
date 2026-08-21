import type { GameState } from '../types/game';
import { HEROES_CONFIG } from '../data/heroes';
import { createInitialHero } from '../data/initialState';
import { SUMMON_CONFIG } from '../data/summonConfig';
import { STAR_MAX } from '../data/awakening';
import type { UpdateResult } from './types';

export interface SummonOutcome {
  heroId: string | null;  // null = 本次未出英雄 (或全满星保底给予奥术星体)
  isNew: boolean;         // 是否新获得英雄
  shardsGained: number;   // 本次获得的碎片数（重复英雄灵魂碎片 或 未出的共鸣碎片）
  shardType: 'soul' | 'resonance' | null;  // null = 无碎片（新英雄 / 奥术星体）
  arcaneOrbAwarded?: boolean; // 100 抽保底全满星自动给予奥术星体
}

export interface MultiSummonResult {
  outcomes: SummonOutcome[];
  soulEchoesUsed: number;
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
 * 英雄召唤（单抽）：消耗灵魂残响，按单概率池 + 100 抽保底判定。
 * - 100 抽保底必出未拥有英雄（若全拥有且已全满星则给予【奥术星体】）
 * - 出英雄：未拥有则新获得；若已拥有 → 转化为该英雄灵魂碎片（shard_<hero> 入背包）或 5 星满星转化共鸣碎片
 * - 未出英雄：获得共鸣碎片（resonance_shard 入背包）
 * 货币与碎片均存于 inventory（ADR-0014 物品化）。
 * rng 可注入，便于测试确定性。
 */
export const summonUpdate = (
  state: GameState,
  rng: () => number = Math.random
): UpdateResult<SummonOutcome> => {
  if ((state.inventory.soul_echo || 0) < SUMMON_CONFIG.costPerSummon) {
    return {
      state,
      result: { heroId: null, isNew: false, shardsGained: 0, shardType: null }
    };
  }

  const pityCount = state.summon?.pityCount ?? 0;
  const isHardPity = (pityCount + 1) >= SUMMON_CONFIG.guaranteedAt;
  const chance = isHardPity ? 1 : computeHeroChance(pityCount);
  const rolled = rng();

  // 未出英雄（非硬保底且随机未命中）
  if (!isHardPity && rolled > chance) {
    return {
      state: {
        ...state,
        inventory: {
          ...state.inventory,
          soul_echo: (state.inventory.soul_echo || 0) - SUMMON_CONFIG.costPerSummon,
          resonance_shard: (state.inventory.resonance_shard || 0) + SUMMON_CONFIG.resonancePerMiss
        },
        summon: { pityCount: pityCount + 1 }
      },
      result: {
        heroId: null,
        isNew: false,
        shardsGained: SUMMON_CONFIG.resonancePerMiss,
        shardType: 'resonance'
      }
    };
  }

  // 触发出英雄
  let heroId: string | null = null;
  const allHeroIds = Object.keys(HEROES_CONFIG);
  const unownedHeroIds = allHeroIds.filter(id => !state.heroes[id]);

  if (isHardPity) {
    if (unownedHeroIds.length > 0) {
      // 100 抽保底优先取未拥有英雄
      const idx = Math.max(0, Math.min(unownedHeroIds.length - 1, Math.floor(rng() * unownedHeroIds.length)));
      heroId = unownedHeroIds[idx];
    } else {
      // 已全部拥有：检查是否已全满星
      const allMaxStar = allHeroIds.every(id => state.heroes[id]?.star >= STAR_MAX);
      if (allMaxStar) {
        // 全满星给予 1 个【奥术星体】
        const nextInventory = {
          ...state.inventory,
          arcane_orb: (state.inventory.arcane_orb || 0) + 1,
          soul_echo: (state.inventory.soul_echo || 0) - SUMMON_CONFIG.costPerSummon
        };
        return {
          state: {
            ...state,
            inventory: nextInventory,
            summon: { pityCount: 0 }
          },
          result: {
            heroId: null,
            isNew: false,
            shardsGained: 1,
            shardType: null,
            arcaneOrbAwarded: true
          }
        };
      } else {
        heroId = rollHeroId(rng);
      }
    }
  } else {
    heroId = rollHeroId(rng);
  }

  const alreadyOwned = !!state.heroes[heroId];
  const nextHeroes = { ...state.heroes };
  const nextInventory: Record<string, number> = {
    ...state.inventory,
    soul_echo: (state.inventory.soul_echo || 0) - SUMMON_CONFIG.costPerSummon
  };

  // 保底计数语义（ticket 20）：仅在获得【未拥有】英雄（或全满星保底兑现奥术星体）后重置。
  // 抽到已拥有英雄同样属于"未获得未拥有英雄"，计数继续累加，否则保底进度永远无法兑现。
  let nextPity = pityCount + 1;

  if (alreadyOwned) {
    // 若英雄已达 5 星满星，重复抽出的碎片 1:1 自动转化为通用共鸣碎片
    if (state.heroes[heroId].star >= STAR_MAX) {
      nextInventory.resonance_shard = (nextInventory.resonance_shard || 0) + SUMMON_CONFIG.shardsPerDupe;
    } else {
      const shardId = `shard_${heroId}`;
      nextInventory[shardId] = (nextInventory[shardId] || 0) + SUMMON_CONFIG.shardsPerDupe;
    }
    // 硬保底已触发的场合（全拥有非满星兜底出重复英雄，或保底兑现）视为保底已兑现，重置计数
    if (isHardPity) nextPity = 0;
  } else {
    nextHeroes[heroId] = createInitialHero(heroId);
    nextPity = 0;
  }

  return {
    state: {
      ...state,
      inventory: nextInventory,
      heroes: nextHeroes,
      summon: { pityCount: nextPity }
    },
    result: {
      heroId,
      isNew: !alreadyOwned,
      shardsGained: alreadyOwned ? SUMMON_CONFIG.shardsPerDupe : 0,
      shardType: alreadyOwned ? (state.heroes[heroId]?.star >= STAR_MAX ? 'resonance' : 'soul') : null
    }
  };
};

/**
 * 英雄召唤批量 N 连抽：消耗 costPerSummon * count 灵魂残响，连续执行 count 次召唤。
 * 100 连抽自然触发 100 抽硬保底（guaranteedAt: 100），保底/碎片规则与单抽一致（由 summonUpdate 逐次处理）。
 */
export const summonBatchUpdate = (
  state: GameState,
  count: number,
  rng: () => number = Math.random
): UpdateResult<MultiSummonResult> => {
  const totalCost = SUMMON_CONFIG.costPerSummon * count;
  if ((state.inventory.soul_echo || 0) < totalCost) {
    return {
      state,
      result: { outcomes: [], soulEchoesUsed: 0 }
    };
  }

  let currentState = state;
  const outcomes: SummonOutcome[] = [];

  for (let i = 0; i < count; i++) {
    const single = summonUpdate(currentState, rng);
    currentState = single.state;
    outcomes.push(single.result);
  }

  return {
    state: currentState,
    result: { outcomes, soulEchoesUsed: totalCost }
  };
};

/**
 * 英雄召唤 10 连抽：消耗 1000 灵魂残响，批量召唤的 10 次特例
 */
export const summonTenUpdate = (
  state: GameState,
  rng: () => number = Math.random
): UpdateResult<MultiSummonResult> => summonBatchUpdate(state, 10, rng);
