import type { AutoRecipe } from '../types/game';

export const AUTO_RECIPES: Record<string, AutoRecipe> = {
  smelt_alloy: { id: 'smelt_alloy', name: '提炼合金金属板', input: { scrap_metal: 2 }, output: { alloy_plate: 1 }, duration: 30, facilityId: 'smelter' },
  smelt_sunflower: { id: 'smelt_sunflower', name: '钢纹花瓣熔炼', input: { steel_petal: 3, scrap_metal: 1 }, output: { alloy_plate: 2 }, duration: 45, facilityId: 'smelter' },
  assemble_ration: { id: 'assemble_ration', name: '自动合成压缩口粮', input: { glow_fiber: 3 }, output: { ration: 1 }, duration: 20, facilityId: 'assembler' },
  assemble_energy: { id: 'assemble_energy', name: '能量补充剂组装', input: { glow_fiber: 2, scrap_metal: 1 }, output: { energy_refill: 1 }, duration: 40, facilityId: 'assembler' },
  assemble_turret: { id: 'assemble_turret', name: '防御炮塔装配', input: { scrap_metal: 3, glow_fiber: 3 }, output: { defensive_turret: 1 }, duration: 90, facilityId: 'assembler' },

  // === 新增自动化工序 ===
  craft_rusted_spring: { id: 'craft_rusted_spring', name: '弹簧零件锻造', input: { scrap_metal: 3 }, output: { rusted_spring: 2 }, duration: 25, facilityId: 'assembler' },
  craft_nanite_slurry: { id: 'craft_nanite_slurry', name: '纳米修复泥调配', input: { mana_dust: 3, glow_fiber: 2 }, output: { nanite_slurry: 1 }, duration: 35, facilityId: 'smelter' },
  craft_crystal_silicon: { id: 'craft_crystal_silicon', name: '晶体硅面板精炼', input: { steel_petal: 3, mana_dust: 1 }, output: { crystal_silicon: 1 }, duration: 40, facilityId: 'smelter' },
  craft_aether_ingot: { id: 'craft_aether_ingot', name: '以太合金熔炼', input: { aether_pulp: 4, scrap_metal: 2 }, output: { aether_ingot: 1 }, duration: 50, facilityId: 'smelter' },
  craft_plasma_arc: { id: 'craft_plasma_arc', name: '等离子弧能组装', input: { plasma_cell: 2, alloy_plate: 1 }, output: { plasma_arc: 1 }, duration: 45, facilityId: 'assembler' },
  craft_ration_deluxe: { id: 'craft_ration_deluxe', name: '高级罐头封装', input: { ration: 2, aether_pulp: 1 }, output: { ration_deluxe: 1 }, duration: 30, facilityId: 'assembler' }
};
