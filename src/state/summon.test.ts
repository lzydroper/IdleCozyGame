import { describe, it, expect } from 'vitest';
import type { GameState } from '../types/game';
import { INITIAL_STATE, createInitialHero } from '../data/initialState';
import { HEROES_CONFIG } from '../data/heroes';
import { SUMMON_CONFIG } from '../data/summonConfig';
import { STAR_MAX } from '../data/awakening';
import { computeHeroChance, rollHeroId, summonUpdate, summonTenUpdate } from './summon';

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
    const state = makeState({ inventory: { soul_echo: SUMMON_CONFIG.costPerSummon - 1 } });
    const { state: next, result } = summonUpdate(state);

    expect(result.heroId).toBeNull();
    expect(result.shardsGained).toBe(0);
    expect(next).toBe(state); // 原样返回
  });

  it('summons a duplicate hero and converts it to soul shards', () => {
    const state = makeState({ inventory: { soul_echo: 200 } });
    // rng=0 → 出英雄判定命中；rollHeroId(0) → 池中第一个英雄（开局已拥有的诺娃）
    const firstHeroId = Object.keys(HEROES_CONFIG)[0];
    const { state: next, result } = summonUpdate(state, () => 0);

    expect(result.heroId).toBe(firstHeroId);
    expect(result.isNew).toBe(false);
    expect(result.shardType).toBe('soul');
    expect(result.shardsGained).toBe(SUMMON_CONFIG.shardsPerDupe);
    expect(next.inventory.soul_echo).toBe(200 - SUMMON_CONFIG.costPerSummon);
    expect(next.inventory[`shard_${firstHeroId}`]).toBe(SUMMON_CONFIG.shardsPerDupe);
    expect(next.summon.pityCount).toBe(1); // 抽到已拥有英雄：保底计数继续累加（ticket 20）
    expect(Object.keys(next.heroes)).toEqual([firstHeroId]); // 不新增英雄
  });

  it('does NOT reset pity counter when pulling an already-owned hero', () => {
    const state = makeState({
      inventory: { soul_echo: 200 },
      summon: { pityCount: 42 }
    });
    // rng=0 → 出英雄判定命中；rollHeroId(0) → 池中第一个英雄（开局已拥有的诺娃）
    const firstHeroId = Object.keys(HEROES_CONFIG)[0];
    const { state: next } = summonUpdate(state, () => 0);

    expect(Object.keys(next.heroes)).toEqual([firstHeroId]); // 不新增英雄（抽到已拥有）
    expect(next.summon.pityCount).toBe(43); // 未获得未拥有英雄 → 计数 +1
  });

  it('summons a brand-new hero and adds it to the roster', () => {
    const state = makeState({ inventory: { soul_echo: 200 } });
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
    const state = makeState({ inventory: { soul_echo: 200, resonance_shard: 0 }, summon: { pityCount: 3 } });
    // rng=0.9 > 0.6 → 未出英雄
    const { state: next, result } = summonUpdate(state, () => 0.9);

    expect(result.heroId).toBeNull();
    expect(result.shardType).toBe('resonance');
    expect(result.shardsGained).toBe(SUMMON_CONFIG.resonancePerMiss);
    expect(next.inventory.resonance_shard).toBe(SUMMON_CONFIG.resonancePerMiss);
    expect(next.summon.pityCount).toBe(4);
    expect(next.inventory.soul_echo).toBe(200 - SUMMON_CONFIG.costPerSummon);
  });

  it('guarantees an unowned hero at 100-pull hard pity cap', () => {
    const state = makeState({
      inventory: { soul_echo: 200 },
      summon: { pityCount: 99 } // 99 + 1 = 100 抽保底
    });
    const { state: next, result } = summonUpdate(state, () => 0.99);

    expect(result.heroId).not.toBeNull();
    expect(result.isNew).toBe(true);
    expect(next.heroes[result.heroId!]).toBeDefined();
    expect(next.summon.pityCount).toBe(0);
  });

  it('awards Arcane Orb at 100-pull hard pity cap when all heroes are 5-star', () => {
    const allHeroes: Record<string, any> = {};
    Object.keys(HEROES_CONFIG).forEach(id => {
      allHeroes[id] = { ...createInitialHero(id), star: STAR_MAX };
    });

    const state = makeState({
      inventory: { soul_echo: 200 },
      heroes: allHeroes,
      summon: { pityCount: 99 }
    });

    const { state: next, result } = summonUpdate(state, () => 0.99);

    expect(result.heroId).toBeNull();
    expect(result.arcaneOrbAwarded).toBe(true);
    expect(next.inventory.arcane_orb).toBe(1);
    expect(next.summon.pityCount).toBe(0);
  });

  it('hard pity with all heroes owned (not all max-star) falls back to a duplicate and resets pity', () => {
    const allHeroes: Record<string, any> = {};
    Object.keys(HEROES_CONFIG).forEach((id, i) => {
      allHeroes[id] = { ...createInitialHero(id), star: i === 0 ? 1 : STAR_MAX };
    });

    const state = makeState({
      inventory: { soul_echo: 200 },
      heroes: allHeroes,
      summon: { pityCount: 99 }
    });

    // rng: rolled 任意 → 硬保底不受影响；rollHeroId(0) → 池中第一个英雄（已拥有）
    const { state: next, result } = summonUpdate(state, sequenceRng([0.99, 0]));

    expect(result.heroId).not.toBeNull();
    expect(result.isNew).toBe(false); // 无未拥有英雄可出 → 兜底重复英雄
    expect(next.summon.pityCount).toBe(0); // 硬保底已兑现 → 重置
    expect(Object.keys(next.heroes)).toEqual(Object.keys(allHeroes)); // 不新增
  });
});

describe('summonTenUpdate', () => {
  it('fails if soul echoes are less than 1000', () => {
    const state = makeState({ inventory: { soul_echo: 900 } });
    const { state: next, result } = summonTenUpdate(state);

    expect(result.outcomes).toHaveLength(0);
    expect(next.inventory.soul_echo).toBe(900);
  });

  it('executes 10 pulls and consumes 1000 soul echoes', () => {
    const state = makeState({ inventory: { soul_echo: 1500 } });
    const { state: next, result } = summonTenUpdate(state);

    expect(result.outcomes).toHaveLength(10);
    expect(result.soulEchoesUsed).toBe(1000);
    expect(next.inventory.soul_echo).toBe(500);
  });

  it('hard pity triggers inside a 10-pull: unowned hero guaranteed and counter resets', () => {
    const ids = Object.keys(HEROES_CONFIG);
    const lastId = ids[ids.length - 1];
    // 已拥有除末位外的全部英雄 → 前 4 抽出重复英雄 pity 96/97/98/99，第 5 抽硬保底必出末位未拥有英雄
    const heroes: Record<string, any> = {};
    ids.slice(0, -1).forEach(id => {
      heroes[id] = createInitialHero(id);
    });

    const state = makeState({
      inventory: { soul_echo: 3000 },
      heroes,
      summon: { pityCount: 95 }
    });
    // 每抽出英雄消耗 2 个 rng(rolled + rollHeroId)；抽1-4 出首个已拥有英雄(0)，
    // 抽5 硬保底(rolled 不参与判定，idx=floor(0.99*1)=0 → 末位未拥有)，抽6-10 未出英雄(0.99)
    // 共消耗 4*2 + 2 + 5 = 15 次 rng
    const rngValues = [0.99, 0, 0.99, 0, 0.99, 0, 0.99, 0, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99];
    const { state: next, result } = summonTenUpdate(state, sequenceRng(rngValues));

    expect(result.outcomes).toHaveLength(10);
    // 第 5 抽(索引 4)硬保底必出未拥有英雄
    const fifth = result.outcomes[4];
    expect(fifth.heroId).toBe(lastId);
    expect(fifth.isNew).toBe(true);
    // 硬保底后 pity 重置 0；剩余 5 抽未出英雄 → 5
    expect(next.summon.pityCount).toBe(5);
    expect(next.inventory.soul_echo).toBe(3000 - 1000);
    expect(next.heroes[lastId]).toBeDefined();
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
