export interface Recipe {
  id: string;
  name: string;
  description: string;
  cost: Record<string, number>;    // 材料消耗
  reward: Record<string, number>;  // 产出物品
  special?: 'capsule_charge';      // 特殊效果标记
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
  }
};
