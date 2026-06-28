export interface ItemMeta {
  id: string;
  name: string;       // 中文名
  emoji: string;      // 图标 emoji
  description: string;
  category: 'seed' | 'material' | 'food' | 'equipment' | 'special';
}

export const ITEMS_CONFIG: Record<string, ItemMeta> = {
  glow_fiber: { id: 'glow_fiber', name: '荧光草纤维', emoji: '🌿', description: '散发微弱冷光的植物纤维', category: 'material' },
  mana_dust: { id: 'mana_dust', name: '魔能之尘', emoji: '✨', description: '凝聚的微量魔力粒子', category: 'material' },
  aether_pulp: { id: 'aether_pulp', name: '以太果肉', emoji: '🍇', description: '富含以太能量的浆果果肉', category: 'material' },
  dream_shard: { id: 'dream_shard', name: '梦境碎片', emoji: '💠', description: '从梦境中凝结的意识结晶', category: 'special' },
  steel_petal: { id: 'steel_petal', name: '钢纹花瓣', emoji: '⚙️', description: '带金属纹理的坚硬花瓣', category: 'material' },
  alloy_plate: { id: 'alloy_plate', name: '合金金属板', emoji: '🔩', description: '废土提炼的轻量合金', category: 'material' },
  ration: { id: 'ration', name: '压缩口粮', emoji: '🍱', description: '高热量压缩食物', category: 'food' },
  scrap_metal: { id: 'scrap_metal', name: '废旧金属', emoji: '🔧', description: '各类废弃金属零件', category: 'material' },
  seed_glow_grass: { id: 'seed_glow_grass', name: '荧光草种子', emoji: '🌱', description: '荧光草的种子', category: 'seed' },
  seed_aether_berry: { id: 'seed_aether_berry', name: '以太浆果种子', emoji: '🌱', description: '以太浆果的种子', category: 'seed' },
  seed_steel_sunflower: { id: 'seed_steel_sunflower', name: '钢纹向日葵种子', emoji: '🌱', description: '钢纹向日葵的种子', category: 'seed' },
  energy_refill: { id: 'energy_refill', name: '能量补充剂', emoji: '⚡', description: '恢复魔能的补充剂', category: 'equipment' },
  defensive_turret: { id: 'defensive_turret', name: '防御炮塔', emoji: '🗼', description: '可部署的自动防御装置', category: 'equipment' },
  sanity_capsule: { id: 'sanity_capsule', name: '稳定胶囊', emoji: '💊', description: '维持精神稳定的胶囊药物', category: 'special' },
  warp_capsule: { id: 'warp_capsule', name: '跃迁胶囊', emoji: '🌀', description: '梦境中的传送工具', category: 'special' },
};
