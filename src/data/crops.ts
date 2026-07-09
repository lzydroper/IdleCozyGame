import type { CropConfig } from '../types/config';
import cropGlowGrass from '../assets/crop_glow_grass.jpg';
import cropAetherBerry from '../assets/crop_aether_berry.jpg';
import cropSteelSunflower from '../assets/crop_steel_sunflower.jpg';
import cropMagmaPepper from '../assets/crop_magma_pepper.jpg';
import cropFrostBell from '../assets/crop_frost_bell.jpg';
import cropPlasmaPumpkin from '../assets/crop_plasma_pumpkin.jpg';
import cropVoidLotus from '../assets/crop_void_lotus.jpg';

export const CROPS_CONFIG: Record<string, CropConfig> = {
  glow_grass: {
    id: "glow_grass",
    name: "辐射荧光草",
    growthTime: 30,
    yields: { glow_fiber: 2, mana_dust: 1 },
    seedCost: { seed_glow_grass: 1 },
    description: "能在微弱辐射下散发冷光的杂草，蕴含微量魔力。",
    image: cropGlowGrass
  },
  aether_berry: {
    id: "aether_berry",
    name: "以太浆果",
    growthTime: 120,
    yields: { aether_pulp: 3, dream_shard: 1 },
    seedCost: { seed_aether_berry: 1 },
    description: "呈淡紫色的多汁浆果，能引起轻微的心灵共鸣。",
    image: cropAetherBerry
  },
  steel_sunflower: {
    id: "steel_sunflower",
    name: "钢纹向日葵",
    growthTime: 600,
    yields: { steel_petal: 4, alloy_plate: 1 },
    seedCost: { seed_steel_sunflower: 1 },
    description: "花瓣带金属纹路的植物，可提取出废土合金材料。",
    image: cropSteelSunflower
  },
  magma_pepper: {
    id: "magma_pepper",
    name: "熔岩椒",
    growthTime: 240,
    yields: { magma_core: 2, glow_fiber: 1 },
    seedCost: { seed_magma_pepper: 1 },
    description: "表皮滚烫，蕴含大量热能的变异辣椒。",
    image: cropMagmaPepper
  },
  frost_bell: {
    id: "frost_bell",
    name: "霜冻风铃草",
    growthTime: 480,
    yields: { frost_crystal: 2, mana_dust: 1 },
    seedCost: { seed_frost_bell: 1 },
    description: "发出清脆魔能共鸣的低温花卉。",
    image: cropFrostBell
  },
  plasma_pumpkin: {
    id: "plasma_pumpkin",
    name: "等离子南瓜",
    growthTime: 720,
    yields: { plasma_cell: 2, alloy_plate: 1 },
    seedCost: { seed_plasma_pumpkin: 1 },
    description: "外皮流淌金色电弧，可用于提炼应急能源。",
    image: cropPlasmaPumpkin
  },
  void_lotus: {
    id: "void_lotus",
    name: "虚空魔莲",
    growthTime: 1200,
    yields: { void_essence: 3, dream_shard: 2 },
    seedCost: { seed_void_lotus: 1 },
    description: "生长在心灵裂隙边缘的幽紫色花朵，能调和脑电波。",
    image: cropVoidLotus
  },

  // === 新增作物 (spritesheet 填充) ===
  echo_shroom: {
    id: "echo_shroom",
    name: "回音真菌",
    growthTime: 90,
    yields: { mana_dust: 2, glow_fiber: 1 },
    seedCost: { seed_echo_shroom: 1 },
    description: "散发淡粉色圈状光晕的真菌，收集溢散的魔能。",
  },
  magnetic_clover: {
    id: "magnetic_clover",
    name: "磁力三叶草",
    growthTime: 180,
    yields: { rusted_spring: 1, scrap_metal: 2 },
    seedCost: { seed_magnetic_clover: 1 },
    description: "叶片呈偏心磁铁形态的金属植株。",
  },
  solar_cactus: {
    id: "solar_cactus",
    name: "烈阳仙人掌",
    growthTime: 360,
    yields: { plasma_cell: 1, glow_fiber: 2 },
    seedCost: { seed_solar_cactus: 1 },
    description: "吸收烈日辐射转化电能的多肉植物。",
  },
  stellar_rose: {
    id: "stellar_rose",
    name: "星辰玫瑰",
    growthTime: 540,
    yields: { dream_shard: 2, mana_dust: 2 },
    seedCost: { seed_stellar_rose: 1 },
    description: "结晶形态的星辉花卉。",
  },
  nebula_moss: {
    id: "nebula_moss",
    name: "星云苔藓",
    growthTime: 660,
    yields: { nightmare_tear: 1, aether_pulp: 2 },
    seedCost: { seed_nebula_moss: 1 },
    description: "瓶中翻涌紫色星光的诡异苔藓。",
  },
  storm_sprout: {
    id: "storm_sprout",
    name: "雷暴幼芽",
    growthTime: 840,
    yields: { plasma_arc: 1, plasma_cell: 1 },
    seedCost: { seed_storm_sprout: 1 },
    description: "表皮缠绕金色电弧的狂暴芽株。",
  },
  crystal_reed: {
    id: "crystal_reed",
    name: "水晶芦苇",
    growthTime: 300,
    yields: { crystal_silicon: 1, steel_petal: 2 },
    seedCost: { seed_crystal_reed: 1 },
    description: "莹白色半透明的坚硬芦苇。",
  },
  shadow_fern: {
    id: "shadow_fern",
    name: "暗影蕨",
    growthTime: 1080,
    yields: { void_essence: 2, dream_shard: 1 },
    seedCost: { seed_shadow_fern: 1 },
    description: "吞噬四周光线的黑雾蕨类植物。",
  },
  chrono_vine: {
    id: "chrono_vine",
    name: "时光藤蔓",
    growthTime: 1500,
    yields: { aether_ingot: 1, void_essence: 2 },
    seedCost: { seed_chrono_vine: 1 },
    description: "呈双螺旋结构缓慢旋转的翠绿藤蔓。",
  }
};
