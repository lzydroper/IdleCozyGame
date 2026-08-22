import type { HeroClass, HeroFaction } from '../types/game';

/**
 * Region/Level 数据模型（combat-level ticket 01）。
 *
 * 纯数据配置：Region 内嵌有序 levels，Level 只带区域内稳定 local id；
 * 不设全局 level id、不设 level.regionId。全球唯一身份需要时由 `regionId:levelId` 派生。
 * 保持 JSON 兼容：本文件只允许 import type，禁止函数与运行时推导。
 */

export type DropEntry =
  | { kind: 'fixed'; itemId: string; count: number }
  | { kind: 'chance'; itemId: string; count: number; chancePercent: number }
  | { kind: 'weighted'; pool: { itemId: string; count: number; weight: number }[] };

export type RegionUnlockRequirement =
  | { type: 'regionExplored'; regionId: string; percent: number }
  | { type: 'levelCleared'; regionId: string; levelId: string }
  | { type: 'itemHeld'; itemId: string; count: number };

export type RegionUnlockRequirements = RegionUnlockRequirement[];

export interface ExplorationMilestone {
  atPercent: number;
  eventId: string;
}

export interface LevelConfig {
  id: string; // 区域内稳定 local id；本内容表内亦全局唯一（便于反查）
  name: string;
  enemies: string[]; // 必须是所在 region.enemyPool 子集
  staminaCost: number;
  drops: DropEntry[];
  firstClearDrops?: DropEntry[];
}

export interface ExpeditionConfig {
  id: string;
  name: string;
  displayName: string;
  shortName?: string;
  scavengeInterval: number;
  lootTable: DropEntry[];
  requiredHeroClass?: HeroClass;
  requiredFaction?: HeroFaction;
  rationCost?: number;
  rationConsumptionRate?: number;
}

export interface RegionConfig {
  id: string;
  name: string;
  description: string;
  order: number; // 主线顺序；isTestZone 排除
  recommendedLevel: number; // 仅展示
  icon?: string; // Lucide 映射 key，UI seam
  enemyPool: string[];
  explorationEvents: string[]; // 区域事件 id 池
  explorationStepsToClear: number; // 探索 100% 目标步数
  explorationMilestones: ExplorationMilestone[];
  levels: LevelConfig[]; // 有序，末位 = 区域关底
  unlock?: RegionUnlockRequirements;
  expedition?: ExpeditionConfig;
  initialCost?: { food: number; energy: number };
  isTestZone?: boolean;
}

export const REGION_CONFIGS = {
  wasteland_entrance: {
    id: 'wasteland_entrance',
    name: '废土边缘',
    description: '避难所大门外的第一片废土，游荡着饥饿的变异鬣狗与鼠群，是检验小队战力的最佳训练场。',
    order: 1,
    recommendedLevel: 1,
    enemyPool: ['wasteland_hound', 'mutant_rat', 'wasteland_hound_king'],
    explorationEvents: [
      'ruined_truck',
      'rusty_safe',
      'toxic_swamp',
      'military_caches',
      'mutant_beast',
      'cozy_hotspring',
      'abandoned_camp',
      'mysterious_capsule',
      'acid_rain_storm',
      'radiation_leak',
      'encounter_wasteland_pack'
    ],
    explorationStepsToClear: 10,
    explorationMilestones: [{ atPercent: 20, eventId: 'encounter_wasteland_pack' }],
    initialCost: { food: 10, energy: 10 },
    expedition: {
      id: 'radar_station',
      name: '雷达站废墟',
      displayName: '废弃雷达站',
      shortName: '雷达站',
      scavengeInterval: 300,
      rationCost: 1,
      rationConsumptionRate: 0,
      lootTable: [
        { kind: 'chance', itemId: 'scrap_metal', count: 2, chancePercent: 70 },
        { kind: 'chance', itemId: 'energy_refill', count: 1, chancePercent: 10 },
        { kind: 'chance', itemId: 'seed_glow_grass', count: 1, chancePercent: 20 },
        { kind: 'chance', itemId: 'crystal_silicon', count: 1, chancePercent: 5 }
      ]
    },
    levels: [
      {
        id: 'wasteland_entrance_1',
        name: '游荡者',
        enemies: ['wasteland_hound', 'mutant_rat'],
        staminaCost: 10,
        drops: [
          { kind: 'chance', itemId: 'scrap_metal', count: 2, chancePercent: 60 },
          { kind: 'chance', itemId: 'glow_fiber', count: 2, chancePercent: 40 },
          { kind: 'chance', itemId: 'enhance_stone', count: 2, chancePercent: 50 },
          { kind: 'chance', itemId: 'exp_tome', count: 1, chancePercent: 35 },
          { kind: 'fixed', itemId: 'exp_tome', count: 1 },
          { kind: 'fixed', itemId: 'soul_echo', count: 3 }
        ]
      },
      {
        id: 'wasteland_entrance_2',
        name: '鬣狗王',
        enemies: ['wasteland_hound_king'],
        staminaCost: 12,
        drops: [
          { kind: 'chance', itemId: 'scrap_metal', count: 3, chancePercent: 80 },
          { kind: 'chance', itemId: 'glow_fiber', count: 2, chancePercent: 50 },
          { kind: 'chance', itemId: 'mana_dust', count: 2, chancePercent: 30 },
          { kind: 'chance', itemId: 'enhance_stone', count: 2, chancePercent: 70 },
          { kind: 'chance', itemId: 'exp_tome', count: 2, chancePercent: 60 },
          { kind: 'fixed', itemId: 'exp_tome', count: 1 },
          { kind: 'fixed', itemId: 'soul_echo', count: 7 }
        ]
      }
    ]
  },
  old_town_ruins: {
    id: 'old_town_ruins',
    name: '旧城废墟',
    description: '残破的旧城街区盘踞着拾荒匪徒与变异生物，废墟深处埋藏着可用的合金与魔能材料。',
    order: 2,
    recommendedLevel: 3,
    enemyPool: ['ruin_scavenger', 'mutant_rat_elite', 'ruin_overlord'],
    explorationEvents: [
      'abandoned_train',
      'abandoned_cart',
      'waste_pool',
      'thorn_thicket',
      'wasteland_bandits',
      'bat_swarm',
      'hydrological_station',
      'wild_fruit',
      'ancient_library',
      'sandstorm',
      'magnetic_storm',
      'encounter_ruin_raiders'
    ],
    explorationStepsToClear: 15,
    explorationMilestones: [],
    initialCost: { food: 10, energy: 10 },
    levels: [
      {
        id: 'old_town_ruins_1',
        name: '拾荒者',
        enemies: ['ruin_scavenger', 'mutant_rat_elite'],
        staminaCost: 15,
        drops: [
          { kind: 'chance', itemId: 'scrap_metal', count: 2, chancePercent: 70 },
          { kind: 'chance', itemId: 'alloy_plate', count: 1, chancePercent: 30 },
          { kind: 'chance', itemId: 'mana_dust', count: 2, chancePercent: 30 },
          { kind: 'chance', itemId: 'enhance_stone', count: 2, chancePercent: 60 },
          { kind: 'chance', itemId: 'exp_tome', count: 1, chancePercent: 35 },
          { kind: 'fixed', itemId: 'exp_tome', count: 1 },
          { kind: 'fixed', itemId: 'soul_echo', count: 6 }
        ]
      },
      {
        id: 'old_town_ruins_2',
        name: '霸主',
        enemies: ['ruin_overlord', 'mutant_rat_elite'],
        staminaCost: 18,
        drops: [
          { kind: 'chance', itemId: 'alloy_plate', count: 2, chancePercent: 60 },
          { kind: 'chance', itemId: 'ember_weapon', count: 1, chancePercent: 15 },
          { kind: 'chance', itemId: 'ember_armor', count: 1, chancePercent: 10 },
          { kind: 'chance', itemId: 'ember_trinket', count: 1, chancePercent: 10 },
          { kind: 'chance', itemId: 'enhance_stone', count: 3, chancePercent: 80 },
          { kind: 'chance', itemId: 'exp_tome', count: 2, chancePercent: 60 },
          { kind: 'fixed', itemId: 'exp_tome', count: 2 },
          { kind: 'fixed', itemId: 'soul_echo', count: 13 }
        ],
        firstClearDrops: [{ kind: 'fixed', itemId: 'blueprint_ember_armory', count: 1 }]
      }
    ]
  },
  radiated_workshop: {
    id: 'radiated_workshop',
    name: '辐射车间',
    description: '被辐射侵蚀的自动化车间，失控机器与畸变实验体在浓雾中游荡，产出高价值合金与等离子材料。',
    order: 3,
    recommendedLevel: 6,
    enemyPool: ['radiation_mutant', 'rogue_machine', 'aberrant_subject', 'workshop_abomination'],
    explorationEvents: [
      'broken_greenhouse',
      'supply_crate',
      'fungus_nest',
      'giant_worm',
      'abandoned_lab',
      'old_bunker',
      'hail_storm',
      'encounter_workshop_horror'
    ],
    explorationStepsToClear: 20,
    explorationMilestones: [],
    initialCost: { food: 10, energy: 10 },
    levels: [
      {
        id: 'radiated_workshop_1',
        name: '畸变体',
        enemies: ['radiation_mutant', 'rogue_machine', 'aberrant_subject'],
        staminaCost: 20,
        drops: [
          { kind: 'chance', itemId: 'alloy_plate', count: 2, chancePercent: 60 },
          { kind: 'chance', itemId: 'rusted_spring', count: 2, chancePercent: 40 },
          { kind: 'chance', itemId: 'plasma_cell', count: 1, chancePercent: 25 },
          { kind: 'chance', itemId: 'nanite_slurry', count: 1, chancePercent: 20 },
          { kind: 'chance', itemId: 'enhance_stone', count: 3, chancePercent: 70 },
          { kind: 'chance', itemId: 'exp_tome', count: 1, chancePercent: 35 },
          { kind: 'fixed', itemId: 'exp_tome', count: 2 },
          { kind: 'fixed', itemId: 'soul_echo', count: 10 }
        ]
      },
      {
        id: 'radiated_workshop_2',
        name: '车间之主',
        enemies: ['workshop_abomination', 'rogue_machine'],
        staminaCost: 25,
        drops: [
          { kind: 'chance', itemId: 'plasma_cell', count: 2, chancePercent: 50 },
          { kind: 'chance', itemId: 'nanite_slurry', count: 2, chancePercent: 40 },
          { kind: 'chance', itemId: 'starcore_weapon', count: 1, chancePercent: 15 },
          { kind: 'chance', itemId: 'starcore_armor', count: 1, chancePercent: 10 },
          { kind: 'chance', itemId: 'starcore_trinket', count: 1, chancePercent: 10 },
          { kind: 'chance', itemId: 'arcane_orb', count: 1, chancePercent: 12 },
          { kind: 'chance', itemId: 'enhance_stone', count: 4, chancePercent: 90 },
          { kind: 'chance', itemId: 'exp_tome', count: 2, chancePercent: 60 },
          { kind: 'fixed', itemId: 'exp_tome', count: 2 },
          { kind: 'fixed', itemId: 'soul_echo', count: 22 }
        ]
      }
    ]
  },
  equipment_test_zone: {
    id: 'equipment_test_zone',
    name: '军备测试场 (测试专用)',
    description: '【测试专享区域】战斗胜利后 100% 掉落废土、余烬、幽梦、星核全套装备及大量强化魔晶，方便全方位测试装备系统。',
    order: 99,
    recommendedLevel: 99,
    isTestZone: true,
    enemyPool: ['test_dummy', 'test_boss'],
    explorationEvents: [],
    explorationStepsToClear: 0,
    explorationMilestones: [],
    levels: [
      {
        id: 'equipment_test_zone_1',
        name: '靶机',
        enemies: ['test_dummy'],
        staminaCost: 0,
        drops: [
          { kind: 'fixed', itemId: 'wasteland_weapon', count: 1 },
          { kind: 'fixed', itemId: 'wasteland_armor', count: 1 },
          { kind: 'fixed', itemId: 'wasteland_trinket', count: 1 },
          { kind: 'fixed', itemId: 'dreamveil_weapon', count: 1 },
          { kind: 'fixed', itemId: 'dreamveil_armor', count: 1 },
          { kind: 'fixed', itemId: 'dreamveil_trinket', count: 1 },
          { kind: 'fixed', itemId: 'enhance_stone', count: 40 },
          { kind: 'fixed', itemId: 'blueprint_ember_armory', count: 1 },
          { kind: 'fixed', itemId: 'exp_tome', count: 2 },
          { kind: 'fixed', itemId: 'soul_echo', count: 35 }
        ]
      },
      {
        id: 'equipment_test_zone_2',
        name: '测试领主',
        enemies: ['test_boss'],
        staminaCost: 10,
        drops: [
          { kind: 'fixed', itemId: 'ember_weapon', count: 1 },
          { kind: 'fixed', itemId: 'ember_armor', count: 1 },
          { kind: 'fixed', itemId: 'ember_trinket', count: 1 },
          { kind: 'fixed', itemId: 'starcore_weapon', count: 1 },
          { kind: 'fixed', itemId: 'starcore_armor', count: 1 },
          { kind: 'fixed', itemId: 'starcore_trinket', count: 1 },
          { kind: 'fixed', itemId: 'arcane_orb', count: 1 },
          { kind: 'fixed', itemId: 'enhance_stone', count: 100 },
          { kind: 'fixed', itemId: 'exp_tome', count: 3 },
          { kind: 'fixed', itemId: 'soul_echo', count: 75 }
        ]
      }
    ]
  }
} satisfies Record<string, RegionConfig>;
