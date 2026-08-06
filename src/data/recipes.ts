import type { Recipe } from '../types/config';

// 手动合成配方（工坊页面；ticket 01：与自动配方共享 Recipe 类型，name/description 已删除，
// 显示文案从 reward 主产物推导；category 默认推导、无产出配方显式声明）
export const RECIPES_CONFIG: Record<string, Recipe> = {
  ration_pack: {
    id: 'ration_pack',
    cost: { glow_fiber: 3, aether_pulp: 1 },
    reward: { ration: 1 }
  },
  filter_refill: {
    id: 'filter_refill',
    cost: { glow_fiber: 2, scrap_metal: 1 },
    reward: { energy_refill: 1 }
  },
  sanity_capsule: {
    id: 'sanity_capsule',
    cost: { dream_shard: 3, scrap_metal: 1 },
    reward: {},
    special: 'capsule_charge',
    capsuleTarget: 'sanity_capsule',
    capsuleAmount: 3,
    category: 'item' // 充能配方产物为充能次数，显式归「道具」
  },
  defensive_turret: {
    id: 'defensive_turret',
    cost: { scrap_metal: 3, glow_fiber: 4 },
    reward: { defensive_turret: 1 }
  },
  hot_stew: {
    id: 'hot_stew',
    cost: { magma_core: 1, ration: 1 },
    reward: { hot_stew: 1 }
  },
  nanite_injector: {
    id: 'nanite_injector',
    cost: { plasma_cell: 1, scrap_metal: 2 },
    reward: { nanite_injector: 1 }
  },
  purifying_serum: {
    id: 'purifying_serum',
    cost: { void_essence: 1, dream_shard: 2 },
    reward: { purifying_serum: 1 }
  },
  energy_refill_advanced: {
    id: 'energy_refill_advanced',
    cost: { plasma_cell: 2, scrap_metal: 3 },
    reward: { energy_refill: 2 }
  },
  shield_battery_recipe: {
    id: 'shield_battery_recipe',
    cost: { plasma_cell: 1, frost_crystal: 1, alloy_plate: 1 },
    reward: { energy_refill: 3 }
  },
  greenhouse_expansion: {
    id: 'greenhouse_expansion',
    cost: { scrap_metal: 50, alloy_plate: 10, plasma_cell: 2, mana_dust: 5 },
    reward: {},
    special: 'greenhouse_expansion',
    category: 'building', // 无产物建筑类配方，显式归「建筑」
    displayName: '温室智能扩展坞',
    description: '使用合金与电芯建造的扩展槽位模块，能解锁额外 2 个高阶培养槽。最高支持扩展至 8 槽。'
  },

  // === 新材料配方 ===
  aether_ingot_smelt: {
    id: 'aether_ingot_smelt',
    cost: { aether_pulp: 3, scrap_metal: 2 },
    reward: { aether_ingot: 1 }
  },
  nanite_slurry_recipe: {
    id: 'nanite_slurry_recipe',
    cost: { mana_dust: 3, glow_fiber: 2 },
    reward: { nanite_slurry: 1 }
  },
  plasma_arc_craft: {
    id: 'plasma_arc_craft',
    cost: { plasma_cell: 2, alloy_plate: 1 },
    reward: { plasma_arc: 1 }
  },
  rusted_spring_craft: {
    id: 'rusted_spring_craft',
    cost: { scrap_metal: 3 },
    reward: { rusted_spring: 2 }
  },

  // === 新补给配方 ===
  ration_deluxe_recipe: {
    id: 'ration_deluxe_recipe',
    cost: { ration: 2, aether_pulp: 1 },
    reward: { ration_deluxe: 1 }
  },
  stimpack_recipe: {
    id: 'stimpack_recipe',
    cost: { nanite_injector: 1, glow_fiber: 2 },
    reward: { stimpack: 1 }
  },
  canteen_recipe: {
    id: 'canteen_recipe',
    cost: { alloy_plate: 1, scrap_metal: 1 },
    reward: { canteen: 1 }
  },
  geiger_counter_recipe: {
    id: 'geiger_counter_recipe',
    cost: { crystal_silicon: 1, scrap_metal: 2 },
    reward: { geiger_counter: 1 }
  },
  deflective_lens_recipe: {
    id: 'deflective_lens_recipe',
    cost: { crystal_silicon: 1, mana_dust: 3 },
    reward: { deflective_lens: 1 }
  },
  dream_lantern_recipe: {
    id: 'dream_lantern_recipe',
    cost: { dream_shard: 3, void_essence: 1 },
    reward: { dream_lantern: 1 }
  },

  // === 装备合成分层（ticket 10） ===
  // 第一层：废土系列 —— 无图纸门槛，废土边缘材料即可合成
  wasteland_weapon_recipe: {
    id: 'wasteland_weapon_recipe',
    cost: { scrap_metal: 5, alloy_plate: 2 },
    reward: { wasteland_weapon: 1 }
  },
  wasteland_armor_recipe: {
    id: 'wasteland_armor_recipe',
    cost: { scrap_metal: 6, alloy_plate: 3 },
    reward: { wasteland_armor: 1 }
  },
  wasteland_trinket_recipe: {
    id: 'wasteland_trinket_recipe',
    cost: { glow_fiber: 4, mana_dust: 3, scrap_metal: 2 },
    reward: { wasteland_trinket: 1 }
  },
  // 第二层：余烬系列 —— 需先获得「余烬军械图纸」（旧城废墟 BOSS 掉落）
  ember_weapon_recipe: {
    id: 'ember_weapon_recipe',
    cost: { alloy_plate: 6, rusted_spring: 3, mana_dust: 5 },
    reward: { ember_weapon: 1 },
    blueprintId: 'blueprint_ember_armory'
  },
  ember_armor_recipe: {
    id: 'ember_armor_recipe',
    cost: { alloy_plate: 8, scrap_metal: 8 },
    reward: { ember_armor: 1 },
    blueprintId: 'blueprint_ember_armory'
  },
  ember_trinket_recipe: {
    id: 'ember_trinket_recipe',
    cost: { mana_dust: 6, glow_fiber: 6 },
    reward: { ember_trinket: 1 },
    blueprintId: 'blueprint_ember_armory'
  },
  // 强化资源：强化魔晶合成
  enhance_stone_recipe: {
    id: 'enhance_stone_recipe',
    cost: { mana_dust: 2, scrap_metal: 1 },
    reward: { enhance_stone: 1 }
  }
};
