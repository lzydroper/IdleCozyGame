import { describe, it, expect } from 'vitest';
import { getRecipeDisplayName, getRecipeDescription, getRecipeCategory, isRecipeVisible } from './workshop';
import { RECIPES_CONFIG } from '../data/recipes';
import { AUTO_RECIPES } from '../data/autoRecipes';
import { INITIAL_STATE } from '../data/initialState';
import { GAME_CONSTANTS } from '../data/gameConstants';
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

  it('充能配方用 capsuleTarget 产物名（充能）', () => {
    const r = RECIPES_CONFIG['sanity_capsule'];
    expect(getRecipeDisplayName(r)).toBe('合成 稳定胶囊（充能）');
    expect(getRecipeDescription(r)).toBe('');
  });

  it('无产出配方用显式 displayName 兜底', () => {
    const r = RECIPES_CONFIG['greenhouse_expansion'];
    expect(getRecipeDisplayName(r)).toBe('合成 温室智能扩展坞');
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
    expect(getRecipeCategory(RECIPES_CONFIG['greenhouse_expansion'])).toBe('building');
  });
});

describe('配方可见性（ticket 03：蓝图锁定/已达上限隐藏，材料不足不影响）', () => {
  it('蓝图未获得时配方隐藏，获得图纸后可见', () => {
    const state = makeState(); // 默认无余烬军械图纸
    expect(isRecipeVisible(state, RECIPES_CONFIG['ember_weapon_recipe'])).toBe(false);
    const withBlueprint = makeState({ inventory: { ...INITIAL_STATE.inventory, blueprint_ember_armory: 1 } });
    expect(isRecipeVisible(withBlueprint, RECIPES_CONFIG['ember_weapon_recipe'])).toBe(true);
  });

  it('温室扩建未达上限可见，已达上限隐藏', () => {
    const state = makeState();
    expect(isRecipeVisible(state, RECIPES_CONFIG['greenhouse_expansion'])).toBe(true);
    const full = makeState({
      greenhouse: { ...INITIAL_STATE.greenhouse, unlockedSlotsCount: GAME_CONSTANTS.GREENHOUSE_MAX_SLOTS }
    });
    expect(isRecipeVisible(full, RECIPES_CONFIG['greenhouse_expansion'])).toBe(false);
  });

  it('材料不足不影响可见性（显示但不可合成）', () => {
    const state = makeState({ inventory: {} });
    expect(isRecipeVisible(state, RECIPES_CONFIG['ration_pack'])).toBe(true);
  });
});
