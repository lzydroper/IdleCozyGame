import type { AutoRecipe } from '../types/game';

export const AUTO_RECIPES: Record<string, AutoRecipe> = {
  smelt_alloy: { id: 'smelt_alloy', name: '提炼合金金属板', input: { scrap_metal: 2 }, output: { alloy_plate: 1 }, duration: 30, facilityId: 'smelter' },
  smelt_sunflower: { id: 'smelt_sunflower', name: '钢纹花瓣熔炼', input: { steel_petal: 3, scrap_metal: 1 }, output: { alloy_plate: 2 }, duration: 45, facilityId: 'smelter' },
  assemble_ration: { id: 'assemble_ration', name: '自动合成压缩口粮', input: { glow_fiber: 3 }, output: { ration: 1 }, duration: 20, facilityId: 'assembler' },
  assemble_energy: { id: 'assemble_energy', name: '能量补充剂组装', input: { glow_fiber: 2, scrap_metal: 1 }, output: { energy_refill: 1 }, duration: 40, facilityId: 'assembler' },
  assemble_turret: { id: 'assemble_turret', name: '防御炮塔装配', input: { scrap_metal: 3, glow_fiber: 3 }, output: { defensive_turret: 1 }, duration: 90, facilityId: 'assembler' }
};
