// energyCost（配方魔能消耗）行为测试：合成配方表以 vi.mock 注入样例，不触碰真实内容 json。
// 覆盖：手动合成的校验/扣魔能 ×count、批量上限纳入魔能、自动任务开始扣/取消退（同价、封顶 maxEnergy）、
// 魔能不吃驻守原料折扣、滑条上限的能量约束。
import { describe, it, expect, vi } from 'vitest';
import type { Recipe } from '../types/config';

vi.mock('../configs/loaders/workshop.loader', () => {
  const manualEnergy: Recipe = {
    id: 'manual_energy',
    cost: { glow_fiber: 2 },
    energyCost: 5,
    reward: { ration: 1 }
  };
  // 纯魔能成本自动配方（无材料）
  const autoEnergy: Recipe = {
    id: 'auto_energy',
    cost: {},
    energyCost: 10,
    facilityId: 'smelter',
    duration: 60,
    reward: { stone: 1 }
  };
  const plainAuto: Recipe = {
    id: 'plain_auto',
    cost: { scrap_metal: 3 },
    facilityId: 'smelter',
    duration: 60,
    reward: { stone: 1 }
  };
  return {
    RECIPES_CONFIG: { manual_energy: manualEnergy },
    AUTO_RECIPES: { auto_energy: autoEnergy, plain_auto: plainAuto }
  };
});

import { craftItemUpdate, computeMaxBatch } from './workshop';
import { startTaskUpdate, cancelTaskUpdate, getMaxAffordableBatches } from './facility';
import { INITIAL_STATE } from '../configs/seed/initialState';
import type { GameState } from '../types/game';

const makeState = (overrides?: Partial<GameState>): GameState =>
  structuredClone({ ...INITIAL_STATE, ...overrides });

const withEnergy = (state: GameState, energy: number): GameState => ({
  ...state,
  player: { ...state.player, energy, maxEnergy: Math.max(state.player.maxEnergy, energy) }
});

describe('energyCost：手动合成（craftItemUpdate）', () => {
  it('成功时扣材料并扣魔能 ×count', () => {
    const state = makeState({ inventory: { glow_fiber: 10 } });
    const r = craftItemUpdate(withEnergy(state, 50), 'manual_energy', 3);
    expect(r.result).toBe(true);
    expect(r.state.inventory.glow_fiber).toBe(4); // 10 - 2×3
    expect(r.state.player.energy).toBe(35); // 50 - 5×3
  });

  it('魔能不足整批拒绝（无部分扣料）', () => {
    const state = makeState({ inventory: { glow_fiber: 10 } });
    const r = craftItemUpdate(withEnergy(state, 14), 'manual_energy', 3); // 需 15
    expect(r.result).toBe(false);
    expect(r.state.inventory.glow_fiber).toBe(10);
    expect(r.state.player.energy).toBe(14);
  });
});

describe('energyCost：批量上限（computeMaxBatch）', () => {
  it('魔能低于材料可支撑份数时取魔能上限', () => {
    const state = makeState({ inventory: { glow_fiber: 100 }, player: { ...INITIAL_STATE.player, energy: 13 } });
    expect(computeMaxBatch(state, RECIPES().manual_energy)).toBe(2); // min(⌊100/2⌕, ⌊13/5⌕)=min(50,2)
  });

  it('无 energyCost 配方不受魔能影响', () => {
    const state = makeState({ inventory: { scrap_metal: 7 }, player: { ...INITIAL_STATE.player, energy: 0 } });
    expect(computeMaxBatch(state, AUTO().plain_auto)).toBe(2); // ⌊7/3⌋，能量为 0 也不受限
  });
});

describe('energyCost：自动任务（startTask / cancelTask）', () => {
  it('开始任务按 批次×energyCost 扣魔能（不吃折扣），纯魔能配方可启动', () => {
    const state = withEnergy(makeState(), 45);
    const r = startTaskUpdate(state, 'smelter', 0, 'auto_energy', 3);
    expect(r.result).toBe(true);
    expect(r.state.player.energy).toBe(15); // 45 - 10×3
    expect(r.state.shelter.facilities.smelter[0].recipeId).toBe('auto_energy');
  });

  it('魔能不足拒绝开始', () => {
    const state = withEnergy(makeState(), 25);
    const r = startTaskUpdate(state, 'smelter', 0, 'auto_energy', 3); // 需 30
    expect(r.result).toBe(false);
    expect(r.state.player.energy).toBe(25);
    expect(r.state.shelter.facilities.smelter[0].recipeId).toBeNull();
  });

  it('取消任务同价退还剩余批次魔能，已产批次保留消耗', () => {
    const base = makeState();
    base.shelter.facilities.smelter[0] = {
      ...base.shelter.facilities.smelter[0],
      recipeId: 'auto_energy',
      targetCount: 5,
      completedCount: 2,
      timeLeft: 30,
      currentProgress: 0
    };
    const r = cancelTaskUpdate(withEnergy(base, 20), 'smelter', 0); // 剩余 3 批 → +30
    expect(r.result).toBe(true);
    expect(r.state.player.energy).toBe(50);
    expect(r.state.shelter.facilities.smelter[0].recipeId).toBeNull();
  });

  it('退款封顶 maxEnergy 不溢出', () => {
    const base = makeState();
    base.shelter.facilities.smelter[0] = {
      ...base.shelter.facilities.smelter[0],
      recipeId: 'auto_energy',
      targetCount: 9,
      completedCount: 0,
      timeLeft: 30,
      currentProgress: 0
    };
    // 开始时扣 90，之后手动把当前能量改到 95（模拟其他消耗后再取消）：95+90=185 → 封顶 100
    const afterStart = withEnergy(base, 95);
    afterStart.player.maxEnergy = 100;
    const r = cancelTaskUpdate(afterStart, 'smelter', 0);
    expect(r.state.player.energy).toBe(100);
  });
});

describe('energyCost：滑条上限（getMaxAffordableBatches）', () => {
  it('提供能量时纳入约束；纯魔能配方无能量信息保守返回 0', () => {
    const inv = { scrap_metal: 30 };
    expect(getMaxAffordableBatches('auto_energy', inv)).toBe(0); // 无能量信息 + 纯魔能成本
    expect(getMaxAffordableBatches('auto_energy', inv, 0, 35)).toBe(3); // ⌊35/10⌋
    // 纯魔能配方不吃折扣：costReduction=0.5 不影响，⌊999/10⌋=99
    expect(getMaxAffordableBatches('auto_energy', inv, 0.5, 999)).toBe(99);
    // 材料配方不受能量参数影响（energyCost 缺省）
    expect(getMaxAffordableBatches('plain_auto', inv, 0, 0)).toBe(10); // ⌊30/3⌋
  });
});

// mock 模块的引用助手（vi.mock 提升，运行时可取）
import { RECIPES_CONFIG, AUTO_RECIPES } from '../configs/loaders/workshop.loader';
const RECIPES = () => RECIPES_CONFIG as unknown as Record<string, Recipe>;
const AUTO = () => AUTO_RECIPES as unknown as Record<string, Recipe>;
