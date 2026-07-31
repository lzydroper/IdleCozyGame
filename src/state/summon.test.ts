import { describe, it, expect } from 'vitest';
import type { GameState } from '../types/game';
import { INITIAL_STATE } from '../data/initialState';
import { HEROES_CONFIG } from '../data/heroes';
import { SUMMON_CONFIG } from '../data/summonConfig';
import { computeHeroChance, rollHeroId, summonUpdate } from './summon';

const makeState = (overrides?: Partial<GameState>): GameState => ({
  ...INITIAL_STATE,
  ...overrides
});

// 可编程 RNG：按序列依次返回
const sequenceRng = (values: number[]): (() => number) => {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
};

describe('computeHeroChance (软保底概率)', () => {
  it('stays at base chance below the pity threshold', () => {
    expect(computeHeroChance(0)).toBe(SUMMON_CONFIG.heroBaseChance);
    expect(computeHeroChance(SUMMON_CONFIG.pityThreshold - 1)).toBe(SUMMON_CONFIG.heroBaseChance);
  });

  it('increases by pityStep after the threshold', () => {
    const step1 = SUMMON_CONFIG.heroBaseChance + SUMMON_CONFIG.pityStep;
    expect(computeHeroChance(SUMMON_CONFIG.pityThreshold)).toBe(step1);
  });

  it('guarantees a hero at guaranteedAt', () => {
    expect(computeHeroChance(SUMMON_CONFIG.guaranteedAt - 1)).toBe(1);
    expect(computeHeroChance(SUMMON_CONFIG.guaranteedAt)).toBe(1);
  });
});

describe('summonUpdate', () => {
  it('fails without enough soul echoes (no state change)', () => {
    const state = makeState({ soulEchoes: SUMMON_CONFIG.costPerSummon - 1 });
    const { state: next, result } = summonUpdate(state);

    expect(result.heroId).toBeNull();
    expect(result.shardsGained).toBe(0);
    expect(next).toBe(state); // 原样返回
  });

  it('summons a duplicate hero and converts it to soul shards', () => {
    const state = makeState({ soulEchoes: 200, soulShards: {} });
    // rng=0 → 出英雄判定命中；rollHeroId(0) → 池中第一个英雄（开局已拥有的诺娃）
    const firstHeroId = Object.keys(HEROES_CONFIG)[0];
    const { state: next, result } = summonUpdate(state, () => 0);

    expect(result.heroId).toBe(firstHeroId);
    expect(result.isNew).toBe(false);
    expect(result.shardType).toBe('soul');
    expect(result.shardsGained).toBe(SUMMON_CONFIG.shardsPerDupe);
    expect(next.soulEchoes).toBe(200 - SUMMON_CONFIG.costPerSummon);
    expect(next.soulShards[firstHeroId]).toBe(SUMMON_CONFIG.shardsPerDupe);
    expect(next.summon.pityCount).toBe(0); // 出英雄重置软保底
    expect(Object.keys(next.heroes)).toEqual([firstHeroId]); // 不新增英雄
  });

  it('summons a brand-new hero and adds it to the roster', () => {
    const state = makeState({ soulEchoes: 200, soulShards: {} });
    const ids = Object.keys(HEROES_CONFIG);
    const target = ids[ids.length - 1];
    // 第一次 rng=0.1 命中出英雄；第二次 rng≈1 → 选池中最后一个英雄
    const { state: next, result } = summonUpdate(state, sequenceRng([0.1, 0.999]));

    expect(result.heroId).toBe(target);
    expect(result.isNew).toBe(true);
    expect(result.shardType).toBeNull();
    expect(next.heroes[target]).toBeDefined();
    expect(next.heroes[target].level).toBe(1);
    expect(next.summon.pityCount).toBe(0);
  });

  it('misses a hero and grants a resonance shard (pity increases)', () => {
    const state = makeState({ soulEchoes: 200, resonanceShards: 0, summon: { pityCount: 3 } });
    // rng=0.9 > 0.6 → 未出英雄
    const { state: next, result } = summonUpdate(state, () => 0.9);

    expect(result.heroId).toBeNull();
    expect(result.shardType).toBe('resonance');
    expect(result.shardsGained).toBe(SUMMON_CONFIG.resonancePerMiss);
    expect(next.resonanceShards).toBe(SUMMON_CONFIG.resonancePerMiss);
    expect(next.summon.pityCount).toBe(4);
    expect(next.soulEchoes).toBe(200 - SUMMON_CONFIG.costPerSummon);
  });

  it('guarantees a hero at the pity cap even with a bad roll', () => {
    const state = makeState({
      soulEchoes: 200,
      summon: { pityCount: SUMMON_CONFIG.guaranteedAt - 1 }
    });
    // rng=0.9：chance 已是 1（必出）
    const { state: next, result } = summonUpdate(state, () => 0.9);

    expect(result.heroId).not.toBeNull();
    expect(next.summon.pityCount).toBe(0);
  });
});

describe('rollHeroId', () => {
  it('clamps rng=1.0 to the last hero in the pool', () => {
    const ids = Object.keys(HEROES_CONFIG);
    expect(rollHeroId(() => 1.0)).toBe(ids[ids.length - 1]);
  });

  it('clamps negative rng to the first hero in the pool', () => {
    const ids = Object.keys(HEROES_CONFIG);
    expect(rollHeroId(() => -1)).toBe(ids[0]);
  });
});
