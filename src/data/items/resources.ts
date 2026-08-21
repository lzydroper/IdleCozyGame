// 资源（不可主动使用、被生产行为消耗）：生产原料、种子、货币（含灵魂残响）。
import {
  Apple, BatteryCharging, BatteryFull, CircleDot, Cog, FlaskConical, Flame, Flower2, Gem, Layers,
  Leaf, MoonStar, Orbit, Radar, ScanSearch, Snowflake, Sparkles, Sprout, TowerControl, Wrench, Zap,
} from 'lucide-react';
import type { ItemMeta } from './types';

export const RESOURCE_ITEMS: Record<string, ItemMeta> = {
  // === 基础材料: spritesheet_materials.png 索引 0-9 ===
  glow_fiber: { id: 'glow_fiber', name: '荧光草纤维', description: '散发微弱冷光的植物纤维', category: 'resource', sprite: { sheet: 'materials', index: 0 }, icon: Leaf },
  mana_dust: { id: 'mana_dust', name: '魔能之尘', description: '凝聚的微量魔力粒子', category: 'resource', sprite: { sheet: 'materials', index: 1 }, icon: Sparkles },
  aether_pulp: { id: 'aether_pulp', name: '以太果肉', description: '富含以太能量的浆果果肉', category: 'resource', sprite: { sheet: 'materials', index: 2 }, icon: Apple },
  steel_petal: { id: 'steel_petal', name: '钢纹花瓣', description: '带金属纹理的坚硬花瓣', category: 'resource', sprite: { sheet: 'materials', index: 3 }, icon: Flower2 },
  alloy_plate: { id: 'alloy_plate', name: '合金金属板', description: '废土提炼的轻量合金', category: 'resource', sprite: { sheet: 'materials', index: 4 }, icon: Layers },
  scrap_metal: { id: 'scrap_metal', name: '废旧金属', description: '各类废弃金属零件', category: 'resource', sprite: { sheet: 'materials', index: 5 }, icon: Wrench },
  magma_core: { id: 'magma_core', name: '熔岩核心碎片', description: '在地下热泉旁突变产生的火红辣椒提取的碎片，蕴含大量热能。', category: 'resource', sprite: { sheet: 'materials', index: 6 }, icon: Flame },
  frost_crystal: { id: 'frost_crystal', name: '冰晶结晶', description: '常年吸收冰川辐射变异的浅蓝色花卉提取的冰霜冷气结晶。', category: 'resource', sprite: { sheet: 'materials', index: 7 }, icon: Snowflake },
  plasma_cell: { id: 'plasma_cell', name: '等离子电芯', description: '外皮流淌金色电弧的巨型南瓜提炼的应急电芯。', category: 'resource', sprite: { sheet: 'materials', index: 8 }, icon: BatteryCharging },
  void_essence: { id: 'void_essence', name: '虚空精华', description: '心灵裂隙边缘虚空魔莲提取的精华，能调和脑电波。', category: 'resource', sprite: { sheet: 'materials', index: 9 }, icon: MoonStar },
  // === 后段材料: spritesheet_materials.png 索引 10-15 ===
  aether_ingot: { id: 'aether_ingot', name: '以太魔导合金锭', description: '亮蓝色发光的高纯度魔导合金砖块', category: 'resource', sprite: { sheet: 'materials', index: 10 }, icon: Layers },
  crystal_silicon: { id: 'crystal_silicon', name: '晶体硅面板', description: '表面带有蓝色反光折射面的废土精密电子硅基母板', category: 'resource', sprite: { sheet: 'materials', index: 11 }, icon: Sparkles },
  nanite_slurry: { id: 'nanite_slurry', name: '纳米修复泥', description: '装着莹绿色活性修复物质的密封高科技玻璃试管', category: 'resource', sprite: { sheet: 'materials', index: 12 }, icon: FlaskConical },
  nightmare_tear: { id: 'nightmare_tear', name: '梦魇之泪', description: '纯黑色、不断冒着黑色魔性迷雾的小小密封玻璃瓶', category: 'resource', sprite: { sheet: 'materials', index: 13 }, icon: CircleDot },
  rusted_spring: { id: 'rusted_spring', name: '生锈弹簧零件', description: '机械感生锈的重型压缩弹簧和减震组件', category: 'resource', sprite: { sheet: 'materials', index: 14 }, icon: Cog },
  plasma_arc: { id: 'plasma_arc', name: '等离子弧能核心', description: '带有金色线圈包裹和亮色球形电能的弧光核心', category: 'resource', sprite: { sheet: 'materials', index: 15 }, icon: Zap },
  // === 特殊资源（原 special 转资源，名称含「碎片」但不是碎片类） ===
  void_core: { id: 'void_core', name: '虚空核心', description: '击败梦魇入侵后掉落的能量核心', category: 'resource', sprite: { sheet: 'materials', index: 9 }, icon: Orbit },
  dream_shard: { id: 'dream_shard', name: '梦境碎片', description: '从梦境中凝结的意识结晶', category: 'resource', sprite: { sheet: 'supplies', index: 5 }, icon: Gem },

  // === 种子: spritesheet_seeds.png 索引 0-15 ===
  seed_glow_grass: { id: 'seed_glow_grass', name: '荧光草种子', description: '荧光草的种子', category: 'resource', sprite: { sheet: 'seeds', index: 0 }, icon: Sprout },
  seed_aether_berry: { id: 'seed_aether_berry', name: '以太浆果种子', description: '以太浆果的种子', category: 'resource', sprite: { sheet: 'seeds', index: 1 }, icon: Sprout },
  seed_steel_sunflower: { id: 'seed_steel_sunflower', name: '钢纹向日葵种子', description: '钢纹向日葵的种子', category: 'resource', sprite: { sheet: 'seeds', index: 2 }, icon: Sprout },
  seed_magma_pepper: { id: 'seed_magma_pepper', name: '熔岩椒种子', description: '熔岩椒的种子', category: 'resource', sprite: { sheet: 'seeds', index: 3 }, icon: Sprout },
  seed_frost_bell: { id: 'seed_frost_bell', name: '霜冻风铃草种子', description: '霜冻风铃草的种子', category: 'resource', sprite: { sheet: 'seeds', index: 4 }, icon: Sprout },
  seed_plasma_pumpkin: { id: 'seed_plasma_pumpkin', name: '等离子南瓜种子', description: '等离子南瓜的种子', category: 'resource', sprite: { sheet: 'seeds', index: 5 }, icon: Sprout },
  seed_void_lotus: { id: 'seed_void_lotus', name: '虚空魔莲种子', description: '虚空魔莲的种子', category: 'resource', sprite: { sheet: 'seeds', index: 6 }, icon: Sprout },
  seed_echo_shroom: { id: 'seed_echo_shroom', name: '回音真菌孢子', description: '散发淡粉色圈状光晕的魔法菌菇孢子囊', category: 'resource', sprite: { sheet: 'seeds', index: 7 }, icon: Sprout },
  seed_magnetic_clover: { id: 'seed_magnetic_clover', name: '磁力三叶草种子', description: '带有金属光泽、叶片呈偏心磁铁形态的种子', category: 'resource', sprite: { sheet: 'seeds', index: 8 }, icon: Sprout },
  seed_solar_cactus: { id: 'seed_solar_cactus', name: '烈阳仙人掌球', description: '散发微弱暖橙色光的带刺小仙人掌种球', category: 'resource', sprite: { sheet: 'seeds', index: 9 }, icon: Sprout },
  seed_stellar_rose: { id: 'seed_stellar_rose', name: '星辰玫瑰种子', description: '亮蓝色多面体结晶形态的花卉种子', category: 'resource', sprite: { sheet: 'seeds', index: 10 }, icon: Sprout },
  seed_nebula_moss: { id: 'seed_nebula_moss', name: '星云苔藓孢子', description: '瓶中含有紫色星团烟雾的细小苔藓孢子颗粒', category: 'resource', sprite: { sheet: 'seeds', index: 11 }, icon: Sprout },
  seed_storm_sprout: { id: 'seed_storm_sprout', name: '雷暴幼芽种子', description: '带有隐约金色闪电裂纹与焦黑表皮的种子', category: 'resource', sprite: { sheet: 'seeds', index: 12 }, icon: Sprout },
  seed_crystal_reed: { id: 'seed_crystal_reed', name: '水晶芦苇根茎', description: '莹白色半透明的坚硬芦苇根茎块', category: 'resource', sprite: { sheet: 'seeds', index: 13 }, icon: Sprout },
  seed_shadow_fern: { id: 'seed_shadow_fern', name: '暗影蕨孢子', description: '吞噬周围光线、呈黑雾气泡包裹的孢子团', category: 'resource', sprite: { sheet: 'seeds', index: 14 }, icon: Sprout },
  seed_chrono_vine: { id: 'seed_chrono_vine', name: '时光藤蔓种子', description: '呈双螺旋结构微弱旋转的发光翠绿色种子', category: 'resource', sprite: { sheet: 'seeds', index: 15 }, icon: Sprout },

  // === 场景消耗装置（ADR-0016：需在特定场景/事件中消耗，非背包主动使用，归资源） ===
  defensive_turret: { id: 'defensive_turret', name: '防御炮塔', description: '可部署的自动防御装置', category: 'resource', sprite: { sheet: 'supplies', index: 2 }, icon: TowerControl },
  shield_battery: { id: 'shield_battery', name: '重载护盾电池', description: '用于部分高难地表救援任务的能量护盾电池。', category: 'resource', sprite: { sheet: 'supplies', index: 9 }, icon: BatteryFull },
  geiger_counter: { id: 'geiger_counter', name: '盖革探测仪', description: '黄色外壳、带有科幻刻度表盘和雷达扫描的手持探测仪', category: 'resource', sprite: { sheet: 'supplies', index: 12 }, icon: Radar },
  deflective_lens: { id: 'deflective_lens', name: '偏光魔导镜片', description: '折射七彩极光的六角形魔导透镜', category: 'resource', sprite: { sheet: 'supplies', index: 14 }, icon: ScanSearch },

  // === 货币（原顶层字段，ADR-0014 物品化） ===
  soul_echo: { id: 'soul_echo', name: '灵魂残响', description: '英雄召唤消耗的统一货币（战斗掉落/日常任务/特殊途径获取）', category: 'resource', icon: Gem },
};
