import type { HeroClass, HeroFaction } from '../types/game';

export interface ExpeditionLocation {
  id: string;
  name: string;
  displayName: string;
  shortName?: string;
  scavengeInterval: number;
  lootTable: Array<{ itemId: string; chance: number; minQty: number; maxQty: number }>;
  requiredHeroClass?: HeroClass;      // 职阶门槛（守护者/进攻者/协奏者）
  requiredFaction?: HeroFaction;      // 阵营门槛（奥术/机械/梦魇/英灵/星界/魂印）
  rationCost?: number;                // 出发时一次性消耗的口粮数量（默认 0 = 免费出发）
  rationConsumptionRate?: number;     // 持续消耗：每 N 秒消耗 1 份口粮（0 = 不持续消耗）
}

export type ExpeditionLocationsMap = Record<string, ExpeditionLocation>;

// 拾荒远征地点（ADR-0018：移除 4 个救援地点，requiredRole 迁移为 requiredHeroClass/requiredFaction）
// 救援地点（green_ruins/signal_tower/collapsed_subway/military_depot）已移除，
// SURVIVORS_CONFIG.realityLocationId 仍可引用它们作为救援坐标。
export const EXPEDITION_LOCATIONS: ExpeditionLocationsMap = {
  radar_station: {
    id: 'radar_station', name: '雷达站废墟', displayName: '废弃雷达站', shortName: '雷达站',
    scavengeInterval: 300,
    lootTable: [
      { itemId: 'scrap_metal', chance: 0.7, minQty: 1, maxQty: 2 },
      { itemId: 'energy_refill', chance: 0.1, minQty: 1, maxQty: 1 },
      { itemId: 'seed_glow_grass', chance: 0.2, minQty: 1, maxQty: 1 },
      { itemId: 'crystal_silicon', chance: 0.05, minQty: 1, maxQty: 1 }
    ],
    rationCost: 1,
    rationConsumptionRate: 0 // 不持续消耗
  },
  subway_station: {
    id: 'subway_station', name: '坍塌地铁站', displayName: '坍塌地铁站', shortName: '地铁站',
    requiredFaction: 'soulseal', scavengeInterval: 240,
    lootTable: [
      { itemId: 'scrap_metal', chance: 0.8, minQty: 1, maxQty: 3 },
      { itemId: 'steel_petal', chance: 0.3, minQty: 1, maxQty: 2 },
      { itemId: 'seed_aether_berry', chance: 0.15, minQty: 1, maxQty: 1 },
      { itemId: 'rusted_spring', chance: 0.1, minQty: 1, maxQty: 1 }
    ],
    rationCost: 1,
    rationConsumptionRate: 600 // 每 10 分钟消耗 1 份
  },
  bio_lab: {
    id: 'bio_lab', name: '生化实验室', displayName: '生化实验室', shortName: '实验室',
    requiredFaction: 'mechanical', scavengeInterval: 360,
    lootTable: [
      { itemId: 'mana_dust', chance: 0.5, minQty: 1, maxQty: 2 },
      { itemId: 'dream_shard', chance: 0.2, minQty: 1, maxQty: 1 },
      { itemId: 'purifying_serum', chance: 0.05, minQty: 1, maxQty: 1 },
      { itemId: 'nanite_slurry', chance: 0.15, minQty: 1, maxQty: 1 }
    ],
    rationCost: 1,
    rationConsumptionRate: 600
  },
  poison_factory: {
    id: 'poison_factory', name: '废弃制药厂', displayName: '废弃制药厂', shortName: '制药厂',
    requiredFaction: 'mechanical', scavengeInterval: 420,
    lootTable: [
      { itemId: 'crystal_silicon', chance: 0.4, minQty: 1, maxQty: 2 },
      { itemId: 'nanite_slurry', chance: 0.2, minQty: 1, maxQty: 1 },
      { itemId: 'scrap_metal', chance: 0.6, minQty: 1, maxQty: 3 },
      { itemId: 'ration', chance: 0.2, minQty: 1, maxQty: 1 }
    ],
    rationCost: 1,
    rationConsumptionRate: 600
  },
  ruined_armory: {
    id: 'ruined_armory', name: '坍塌军械库', displayName: '坍塌军械库', shortName: '军械库',
    requiredHeroClass: 'guardian', scavengeInterval: 360,
    lootTable: [
      { itemId: 'rusted_spring', chance: 0.5, minQty: 1, maxQty: 2 },
      { itemId: 'alloy_plate', chance: 0.3, minQty: 1, maxQty: 1 },
      { itemId: 'mana_dust', chance: 0.4, minQty: 1, maxQty: 2 },
      { itemId: 'seed_crystal_reed', chance: 0.15, minQty: 1, maxQty: 1 }
    ],
    rationCost: 1,
    rationConsumptionRate: 600
  },
  ancient_library: {
    id: 'ancient_library', name: '旧世大图书馆', displayName: '旧世大图书馆', shortName: '图书馆',
    scavengeInterval: 300,
    lootTable: [
      { itemId: 'dream_shard', chance: 0.3, minQty: 1, maxQty: 2 },
      { itemId: 'mana_dust', chance: 0.5, minQty: 1, maxQty: 2 },
      { itemId: 'nightmare_tear', chance: 0.05, minQty: 1, maxQty: 1 },
      { itemId: 'seed_stellar_rose', chance: 0.1, minQty: 1, maxQty: 1 }
    ],
    rationCost: 1,
    rationConsumptionRate: 600
  }
};
