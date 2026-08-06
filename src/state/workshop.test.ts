import { describe, it, expect } from 'vitest';
import { getRecipeDisplayName, getRecipeDescription, getRecipeCategory } from './workshop';
import { RECIPES_CONFIG } from '../data/recipes';
import { AUTO_RECIPES } from '../data/autoRecipes';

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
