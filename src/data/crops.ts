import cropGlowGrass from '../assets/crop_glow_grass.jpg';
import cropAetherBerry from '../assets/crop_aether_berry.jpg';
import cropSteelSunflower from '../assets/crop_steel_sunflower.jpg';
import cropMagmaPepper from '../assets/crop_magma_pepper.jpg';
import cropFrostBell from '../assets/crop_frost_bell.jpg';
import cropPlasmaPumpkin from '../assets/crop_plasma_pumpkin.jpg';
import cropVoidLotus from '../assets/crop_void_lotus.jpg';

export const CROPS_CONFIG = {
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
  }
};
