export interface Recipe {
  id: string;
  name: string;
  description: string;
  cost: Record<string, number>;    // 材料消耗
  reward: Record<string, number>;  // 产出物品
  special?: 'capsule_charge' | 'greenhouse_expansion'; // 特殊效果标记
  capsuleTarget?: string;          // 充能的胶囊 ID
  capsuleAmount?: number;          // 充能数量
}

export const RECIPES_CONFIG: Record<string, Recipe> = {
  ration_pack: {
    id: 'ration_pack',
    name: '防化口粮包',
    description: '用植物纤维和以太果肉合成的高热量口粮',
    cost: { glow_fiber: 3, aether_pulp: 1 },
    reward: { ration: 1 }
  },
  filter_refill: {
    id: 'filter_refill',
    name: '魔能过滤罐',
    description: '用于补充魔能过滤装置的滤芯',
    cost: { glow_fiber: 2, scrap_metal: 1 },
    reward: { energy_refill: 1 }
  },
  sanity_capsule: {
    id: 'sanity_capsule',
    name: '稳定胶囊(×3充能)',
    description: '合成3次使用量的精神稳定胶囊',
    cost: { dream_shard: 3, scrap_metal: 1 },
    reward: {},
    special: 'capsule_charge',
    capsuleTarget: 'sanity_capsule',
    capsuleAmount: 3
  },
  defensive_turret: {
    id: 'defensive_turret',
    name: '防御炮塔',
    description: '可自动攻击梦魇怪物的防御设施',
    cost: { scrap_metal: 3, glow_fiber: 4 },
    reward: { defensive_turret: 1 }
  },
  hot_stew: {
    id: 'hot_stew',
    name: '魔能熔岩热烩',
    description: '消耗熔岩核心与口粮制作的高能量食品',
    cost: { magma_core: 1, ration: 1 },
    reward: { hot_stew: 1 }
  },
  nanite_injector: {
    id: 'nanite_injector',
    name: '纳米修复注射针',
    description: '消耗等离子电芯与废铁制作的自适应医疗纳米修复针',
    cost: { plasma_cell: 1, scrap_metal: 2 },
    reward: { nanite_injector: 1 }
  },
  purifying_serum: {
    id: 'purifying_serum',
    name: '心灵净化血清',
    description: '消耗虚空精华与梦境碎片合成的理智净化药剂',
    cost: { void_essence: 1, dream_shard: 2 },
    reward: { purifying_serum: 1 }
  },
  energy_refill_advanced: {
    id: 'energy_refill_advanced',
    name: '能量超频核心',
    description: '消耗等离子电芯与废铁合成的备用高能滤罐',
    cost: { plasma_cell: 2, scrap_metal: 3 },
    reward: { energy_refill: 2 }
  },
  shield_battery_recipe: {
    id: 'shield_battery_recipe',
    name: '重载避难所电池',
    description: '使用电芯、冰结晶和合金板组合的防爆电池组',
    cost: { plasma_cell: 1, frost_crystal: 1, alloy_plate: 1 },
    reward: { energy_refill: 3 }
  },
  greenhouse_expansion: {
    id: 'greenhouse_expansion',
    name: '温室智能扩展坞',
    description: '使用合金与电芯建造的扩展槽位模块，能解锁额外 2 个高阶培养槽。最高支持扩展至 8 槽。',
    cost: { scrap_metal: 50, alloy_plate: 10, plasma_cell: 2, mana_dust: 5 },
    reward: {},
    special: 'greenhouse_expansion'
  }
};
