export interface ItemMeta {
  id: string;
  name: string;
  emoji: string;
  description: string;
  category: 'seed' | 'material' | 'food' | 'equipment' | 'special';
  useEffect?: {
    stats?: Partial<Record<'hp' | 'food' | 'energy' | 'sanity', number>>;
    pollution?: number;
  };
}

export const ITEMS_CONFIG: Record<string, ItemMeta> = {
  glow_fiber: { id: 'glow_fiber', name: '荧光草纤维', emoji: '🌿', description: '散发微弱冷光的植物纤维', category: 'material' },
  mana_dust: { id: 'mana_dust', name: '魔能之尘', emoji: '✨', description: '凝聚的微量魔力粒子', category: 'material' },
  aether_pulp: { id: 'aether_pulp', name: '以太果肉', emoji: '🍇', description: '富含以太能量的浆果果肉', category: 'material' },
  dream_shard: { id: 'dream_shard', name: '梦境碎片', emoji: '💠', description: '从梦境中凝结的意识结晶', category: 'special' },
  steel_petal: { id: 'steel_petal', name: '钢纹花瓣', emoji: '⚙️', description: '带金属纹理的坚硬花瓣', category: 'material' },
  alloy_plate: { id: 'alloy_plate', name: '合金金属板', emoji: '🔩', description: '废土提炼的轻量合金', category: 'material' },
  ration: { id: 'ration', name: '压缩口粮', emoji: '🍱', description: '高热量压缩食物', category: 'food', useEffect: { stats: { food: 30 } } },
  scrap_metal: { id: 'scrap_metal', name: '废旧金属', emoji: '🔧', description: '各类废弃金属零件', category: 'material' },
  seed_glow_grass: { id: 'seed_glow_grass', name: '荧光草种子', emoji: '🌱', description: '荧光草的种子', category: 'seed' },
  seed_aether_berry: { id: 'seed_aether_berry', name: '以太浆果种子', emoji: '🌱', description: '以太浆果的种子', category: 'seed' },
  seed_steel_sunflower: { id: 'seed_steel_sunflower', name: '钢纹向日葵种子', emoji: '🌱', description: '钢纹向日葵的种子', category: 'seed' },
  energy_refill: { id: 'energy_refill', name: '能量补充剂', emoji: '⚡', description: '恢复魔能的补充剂', category: 'equipment', useEffect: { stats: { energy: 30 } } },
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
  hot_stew: { id: 'hot_stew', name: '魔能熔岩热烩', emoji: '🍲', description: '大范围恢复饱食度与生命值的魔力食物。', category: 'food', useEffect: { stats: { food: 60, hp: 20 } } },
  nanite_injector: { id: 'nanite_injector', name: '纳米修复注射针', emoji: '💉', description: '快速修复身体损伤，恢复大量生命值的药剂。', category: 'equipment', useEffect: { stats: { hp: 60, food: 10 } } },
  purifying_serum: { id: 'purifying_serum', name: '心灵净化血清', emoji: '🧪', description: '清除大量心灵污染度，稳定理智的净化血清。', category: 'special', useEffect: { stats: { sanity: 30 }, pollution: -30 } },
  shield_battery: { id: 'shield_battery', name: '重载护盾电池', emoji: '⚡', description: '用于部分高难地表救援任务的能量护盾电池。', category: 'equipment' },

  // === 种子: spritesheet_seeds.png 索引 7-15 ===
  seed_echo_shroom: { id: 'seed_echo_shroom', name: '回音真菌孢子', emoji: '🍄', description: '散发淡粉色圈状光晕的魔法菌菇孢子囊', category: 'seed' },
  seed_magnetic_clover: { id: 'seed_magnetic_clover', name: '磁力三叶草种子', emoji: '🍀', description: '带有金属光泽、叶片呈偏心磁铁形态的种子', category: 'seed' },
  seed_solar_cactus: { id: 'seed_solar_cactus', name: '烈阳仙人掌球', emoji: '🌵', description: '散发微弱暖橙色光的带刺小仙人掌种球', category: 'seed' },
  seed_stellar_rose: { id: 'seed_stellar_rose', name: '星辰玫瑰种子', emoji: '🌹', description: '亮蓝色多面体结晶形态的花卉种子', category: 'seed' },
  seed_nebula_moss: { id: 'seed_nebula_moss', name: '星云苔藓孢子', emoji: '🪴', description: '瓶中含有紫色星团烟雾的细小苔藓孢子颗粒', category: 'seed' },
  seed_storm_sprout: { id: 'seed_storm_sprout', name: '雷暴幼芽种子', emoji: '⚡', description: '带有隐约金色闪电裂纹与焦黑表皮的种子', category: 'seed' },
  seed_crystal_reed: { id: 'seed_crystal_reed', name: '水晶芦苇根茎', emoji: '🔮', description: '莹白色半透明的坚硬芦苇根茎块', category: 'seed' },
  seed_shadow_fern: { id: 'seed_shadow_fern', name: '暗影蕨孢子', emoji: '🌑', description: '吞噬周围光线、呈黑雾气泡包裹的孢子团', category: 'seed' },
  seed_chrono_vine: { id: 'seed_chrono_vine', name: '时光藤蔓种子', emoji: '🕐', description: '呈双螺旋结构微弱旋转的发光翠绿色种子', category: 'seed' },

  // === 材料: spritesheet_materials.png 索引 10-15 ===
  aether_ingot: { id: 'aether_ingot', name: '以太魔导合金锭', emoji: '🔷', description: '亮蓝色发光的高纯度魔导合金砖块', category: 'material' },
  crystal_silicon: { id: 'crystal_silicon', name: '晶体硅面板', emoji: '💠', description: '表面带有蓝色反光折射面的废土精密电子硅基母板', category: 'material' },
  nanite_slurry: { id: 'nanite_slurry', name: '纳米修复泥', emoji: '🧪', description: '装着莹绿色活性修复物质的密封高科技玻璃试管', category: 'material' },
  nightmare_tear: { id: 'nightmare_tear', name: '梦魇之泪', emoji: '💧', description: '纯黑色、不断冒着黑色魔性迷雾的小小密封玻璃瓶', category: 'special' },
  rusted_spring: { id: 'rusted_spring', name: '生锈弹簧零件', emoji: '🔩', description: '机械感生锈的重型压缩弹簧和减震组件', category: 'material' },
  plasma_arc: { id: 'plasma_arc', name: '等离子弧能核心', emoji: '⚡', description: '带有金色线圈包裹和亮色球形电能的弧光核心', category: 'material' },

  // === 补给: spritesheet_supplies.png 索引 10-15 ===
  ration_deluxe: { id: 'ration_deluxe', name: '高级生存罐头', emoji: '🥫', description: '印有红色爱心徽标和铁皮密封扣的废土罐头', category: 'food', useEffect: { stats: { food: 45, hp: 10 } } },
  stimpack: { id: 'stimpack', name: '废土肾上腺素', emoji: '💉', description: '橙色瞬时急救药剂针管，代表红血时的极限求生', category: 'equipment', useEffect: { stats: { hp: 35, energy: 15 } } },
  geiger_counter: { id: 'geiger_counter', name: '盖革探测仪', emoji: '📡', description: '黄色外壳、带有科幻刻度表盘和雷达扫描的手持探测仪', category: 'equipment' },
  canteen: { id: 'canteen', name: '军用水壶', emoji: '🧴', description: '带迷彩保温护套和电子屏显示的科技感军用大水壶', category: 'equipment', useEffect: { stats: { food: 15 } } },
  deflective_lens: { id: 'deflective_lens', name: '偏光魔导镜片', emoji: '🔍', description: '折射七彩极光的六角形魔导透镜', category: 'special' },
  dream_lantern: { id: 'dream_lantern', name: '引梦魔灯', emoji: '🏮', description: '散发深蓝色星光光晕、带有魔导浮雕的复古手提挂灯', category: 'special', useEffect: { stats: { sanity: 10 } } },

  // === 虚空核心 (nightmareConfig 引用, 但之前缺失 item 定义) ===
  void_core: { id: 'void_core', name: '虚空核心', emoji: '💜', description: '击败梦魇入侵后掉落的能量核心', category: 'special' },
};
