import type { Recipe } from '../types/config';

// 设施自动配方（ticket 13：冶炼炉/组装机纯自动产线；ticket 01：与手动配方共享 Recipe 类型，
// 字段统一 cost/reward、删 name；与手动配方数值完全一致的 5 条重复已删除，仅保留工坊侧条目，
// 数值有刻意差异的 3 对（以太合金/炮塔/口粮）双条目保留以维持两侧经济平衡）
export const AUTO_RECIPES: Record<string, Recipe> = {
  smelt_alloy: { id: 'smelt_alloy', cost: { scrap_metal: 2 }, reward: { alloy_plate: 1 }, duration: 30, facilityId: 'smelter' },
  smelt_sunflower: { id: 'smelt_sunflower', cost: { steel_petal: 3, scrap_metal: 1 }, reward: { alloy_plate: 2 }, duration: 45, facilityId: 'smelter' },
  assemble_ration: { id: 'assemble_ration', cost: { glow_fiber: 3 }, reward: { ration: 1 }, duration: 20, facilityId: 'assembler' },
  assemble_turret: { id: 'assemble_turret', cost: { scrap_metal: 3, glow_fiber: 3 }, reward: { defensive_turret: 1 }, duration: 90, facilityId: 'assembler' },

  // === 新增自动化工序 ===
  craft_crystal_silicon: { id: 'craft_crystal_silicon', cost: { steel_petal: 3, mana_dust: 1 }, reward: { crystal_silicon: 1 }, duration: 40, facilityId: 'smelter' },
  craft_aether_ingot: { id: 'craft_aether_ingot', cost: { aether_pulp: 4, scrap_metal: 2 }, reward: { aether_ingot: 1 }, duration: 50, facilityId: 'smelter' }
};
