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
  seed_magma_pepper: { id: 'seed_magma_pepper', name: '熔岩椒种子', emoji: '🌱', description: '熔岩椒的种子', category: 'seed' },
  seed_frost_bell: { id: 'seed_frost_bell', name: '霜冻风铃草种子', emoji: '🌱', description: '霜冻风铃草的种子', category: 'seed' },
  seed_plasma_pumpkin: { id: 'seed_plasma_pumpkin', name: '等离子南瓜种子', emoji: '🌱', description: '等离子南瓜的种子', category: 'seed' },
  seed_void_lotus: { id: 'seed_void_lotus', name: '虚空魔莲种子', emoji: '🌱', description: '虚空魔莲的种子', category: 'seed' },
  magma_core: { id: 'magma_core', name: '熔岩核心碎片', emoji: '🔥', description: '在地下热泉旁突变产生的火红辣椒提取的碎片，蕴含大量热能。', category: 'material' },
  frost_crystal: { id: 'frost_crystal', name: '冰晶结晶', emoji: '❄️', description: '常年吸收冰川辐射变异的浅蓝色花卉提取的冰霜冷气结晶。', category: 'material' },
  plasma_cell: { id: 'plasma_cell', name: '等离子电芯', emoji: '🔋', description: '外皮流淌金色电弧的巨型南瓜提炼的应急电芯。', category: 'material' },
  void_essence: { id: 'void_essence', name: '虚空精华', emoji: '🔮', description: '心灵裂隙边缘虚空魔莲提取的精华，能调和脑电波。', category: 'material' },
  hot_stew: { id: 'hot_stew', name: '魔能熔岩热烩', emoji: '🍲', description: '大范围恢复饱食度与生命值的魔力食物。', category: 'food' },
  nanite_injector: { id: 'nanite_injector', name: '纳米修复注射针', emoji: '💉', description: '快速修复身体损伤，恢复大量生命值的药剂。', category: 'equipment' },
  purifying_serum: { id: 'purifying_serum', name: '心灵净化血清', emoji: '🧪', description: '清除大量心灵污染度，稳定理智的净化血清。', category: 'special' },
  shield_battery: { id: 'shield_battery', name: '重载护盾电池', emoji: '⚡', description: '用于部分高难地表救援任务的能量护盾电池。', category: 'equipment' },
};
