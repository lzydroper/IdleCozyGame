import { describe, it, expect } from 'vitest';
import {
  getRecipeDisplayName,
  getRecipeDescription,
  getRecipeCategory,
  isRecipeVisible,
  craftItemUpdate,
  computeMaxBatch,
} from './workshop';
import { RECIPES_CONFIG } from '../data/recipes';
import { AUTO_RECIPES } from '../data/autoRecipes';
import { INITIAL_STATE } from '../data/initialState';
import type { GameState } from '../types/game';

const makeState = (overrides?: Partial<GameState>): GameState =>
  structuredClone({ ...INITIAL_STATE, ...overrides });

// 配方文案/分类推导（ticket 01：删除 name/description，从产出物完全推导）
describe('配方文案推导（ticket 01）', () => {
  it('有产出配方显示「合成 {主产物名} ×N」，描述取产物描述', () => {
    const r = RECIPES_CONFIG['ration_pack'];
    expect(getRecipeDisplayName(r)).toBe('合成 压缩口粮 ×1');
    expect(getRecipeDescription(r)).toBe('高热量压缩食物');
  });

  it('多数量产出显示实际数量', () => {
    const r = RECIPES_CONFIG['rusted_spring_craft'];
    expect(getRecipeDisplayName(r)).toBe('合成 生锈弹簧零件 ×2');
  });

  it('充能配方显示 capsuleTarget 产物名（无"充能"后缀，产出在产出区注明次数）', () => {
    const r = RECIPES_CONFIG['sanity_capsule'];
    expect(getRecipeDisplayName(r)).toBe('合成 稳定胶囊');
    expect(getRecipeDescription(r)).toBe('');
  });

  it('无产出配方用显式 displayName 兜底，描述用显式 description', () => {
    const r = RECIPES_CONFIG['sanity_capsule'];
    expect(getRecipeDisplayName(r)).toBe('合成 稳定胶囊');
    expect(getRecipeDescription(r)).toBe('');
  });

  it('自动配方同样推导显示名', () => {
    expect(getRecipeDisplayName(AUTO_RECIPES['smelt_alloy'])).toBe('合成 合金金属板 ×1');
    expect(getRecipeDisplayName(AUTO_RECIPES['smelt_sunflower'])).toBe('合成 合金金属板 ×2');
  });
});

describe('配方分类推导（ticket 01）', () => {
  it('默认从 reward 主产物的物品类别推导', () => {
    expect(getRecipeCategory(RECIPES_CONFIG['ration_pack'])).toBe('item');
    expect(getRecipeCategory(RECIPES_CONFIG['aether_ingot_smelt'])).toBe('resource');
    expect(getRecipeCategory(RECIPES_CONFIG['wasteland_weapon_recipe'])).toBe('equipment');
  });

  it('无产出配方用显式 category 覆盖', () => {
    expect(getRecipeCategory(RECIPES_CONFIG['sanity_capsule'])).toBe('item');
  });
});

describe('配方可见性（ticket 03：蓝图锁定/已达上限隐藏，材料不足不影响）', () => {
  it('蓝图未获得时配方隐藏，获得图纸后可见', () => {
    const state = makeState(); // 默认无余烬军械图纸
    expect(isRecipeVisible(state, RECIPES_CONFIG['ember_weapon_recipe'])).toBe(false);
    const withBlueprint = makeState({ inventory: { ...INITIAL_STATE.inventory, blueprint_ember_armory: 1 } });
    expect(isRecipeVisible(withBlueprint, RECIPES_CONFIG['ember_weapon_recipe'])).toBe(true);
  });

  it('材料不足不影响可见性（显示但不可合成）', () => {
    const state = makeState({ inventory: {} });
    expect(isRecipeVisible(state, RECIPES_CONFIG['ration_pack'])).toBe(true);
  });
});

describe('批量合成（ticket 04：craftItemUpdate count 原子批量）', () => {
  it('批量原子扣料 ×N / 产出 ×N', () => {
    const state = makeState({ inventory: { glow_fiber: 10, aether_pulp: 5 } });
    const r = craftItemUpdate(state, 'ration_pack', 3);
    expect(r.result).toBe(true);
    expect(r.state.inventory.glow_fiber).toBe(1); // 10 - 3×3
    expect(r.state.inventory.aether_pulp).toBe(2); // 5 - 1×3
    expect(r.state.inventory.ration).toBe(3);
  });

  it('胶囊充能配方批量：充能次数 +capsuleAmount ×N', () => {
    const state = makeState({ inventory: { dream_shard: 10, scrap_metal: 10 } });
    const r = craftItemUpdate(state, 'sanity_capsule', 2);
    expect(r.result).toBe(true);
    expect(r.state.exploration.capsulesCharge.sanity_capsule).toBe(9); // 初始 3 + 3×2
    expect(r.state.inventory.dream_shard).toBe(4); // 10 - 3×2
  });

  it('材料不足整体拒绝（无部分扣料）', () => {
    const state = makeState({ inventory: { glow_fiber: 5, aether_pulp: 1 } }); // count=2 需 6+2
    const r = craftItemUpdate(state, 'ration_pack', 2);
    expect(r.result).toBe(false);
    expect(r.state.inventory.glow_fiber).toBe(5); // 未扣料
    expect(r.state.inventory.aether_pulp).toBe(1);
  });

  it('蓝图锁定配方批量同样被拒', () => {
    const state = makeState({ inventory: { alloy_plate: 20, rusted_spring: 10, mana_dust: 20 } });
    expect(craftItemUpdate(state, 'ember_weapon_recipe', 1).result).toBe(false);
  });
});

describe('computeMaxBatch（ticket 04）', () => {
  it('取材料上限的最小值', () => {
    const state = makeState({ inventory: { glow_fiber: 10, aether_pulp: 3 } });
    expect(computeMaxBatch(state, RECIPES_CONFIG['ration_pack'])).toBe(3); // min(⌊10/3⌋, ⌊3/1⌋)
  });

  it('材料不足时上限为 0', () => {
    const state = makeState({ inventory: {} });
    expect(computeMaxBatch(state, RECIPES_CONFIG['ration_pack'])).toBe(0);
  });
});
