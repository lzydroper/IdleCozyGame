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
    description: '消耗等离子电芯与废旧金属，合成 2 份能量补充剂(⚡恢复30魔能)',
    cost: { plasma_cell: 2, scrap_metal: 3 },
    reward: { energy_refill: 2 }
  },
  shield_battery_recipe: {
    id: 'shield_battery_recipe',
    name: '重载避难所电池',
    description: '使用电芯、冰晶和合金板组装防爆电池组，产出 3 份能量补充剂(⚡恢复30魔能)',
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
  },

  // === 新材料配方 ===
  aether_ingot_smelt: {
    id: 'aether_ingot_smelt',
    name: '以太魔导合金熔炼',
    description: '将以太果肉与废旧金属熔炼为高纯度魔导合金锭',
    cost: { aether_pulp: 3, scrap_metal: 2 },
    reward: { aether_ingot: 1 }
  },
  nanite_slurry_recipe: {
    id: 'nanite_slurry_recipe',
    name: '纳米修复泥调制',
    description: '混合魔能之尘与荧光纤维调制活性纳米修复泥',
    cost: { mana_dust: 3, glow_fiber: 2 },
    reward: { nanite_slurry: 1 }
  },
  plasma_arc_craft: {
    id: 'plasma_arc_craft',
    name: '等离子弧能核心组装',
    description: '将两个等离子电芯与合金板组合为高效弧能核心',
    cost: { plasma_cell: 2, alloy_plate: 1 },
    reward: { plasma_arc: 1 }
  },
  rusted_spring_craft: {
    id: 'rusted_spring_craft',
    name: '弹簧零件锻造',
    description: '将废旧金属锻造成可用的弹簧减震零件',
    cost: { scrap_metal: 3 },
    reward: { rusted_spring: 2 }
  },

  // === 新补给配方 ===
  ration_deluxe_recipe: {
    id: 'ration_deluxe_recipe',
    name: '高级生存罐头',
    description: '用压缩口粮和以太果肉制作的高营养罐头',
    cost: { ration: 2, aether_pulp: 1 },
    reward: { ration_deluxe: 1 }
  },
  stimpack_recipe: {
    id: 'stimpack_recipe',
    name: '废土肾上腺素合成',
    description: '利用纳米修复针的活性物质与荧光纤维合成急救药剂',
    cost: { nanite_injector: 1, glow_fiber: 2 },
    reward: { stimpack: 1 }
  },
  canteen_recipe: {
    id: 'canteen_recipe',
    name: '军用水壶制作',
    description: '利用合金板和废金属拼装耐用军用水壶',
    cost: { alloy_plate: 1, scrap_metal: 1 },
    reward: { canteen: 1 }
  },
  geiger_counter_recipe: {
    id: 'geiger_counter_recipe',
    name: '盖革探测仪装配',
    description: '用晶体硅面板和废金属组装辐射探测设备',
    cost: { crystal_silicon: 1, scrap_metal: 2 },
    reward: { geiger_counter: 1 }
  },
  deflective_lens_recipe: {
    id: 'deflective_lens_recipe',
    name: '偏光魔导镜片研磨',
    description: '将晶体硅面板与魔能之尘研磨为折射透镜',
    cost: { crystal_silicon: 1, mana_dust: 3 },
    reward: { deflective_lens: 1 }
  },
  dream_lantern_recipe: {
    id: 'dream_lantern_recipe',
    name: '引梦魔灯制作',
    description: '用梦境碎片与虚空精华灌注手提魔灯',
    cost: { dream_shard: 3, void_essence: 1 },
    reward: { dream_lantern: 1 }
  }
};
