export interface ExpeditionLocation {
  id: string;
  name: string;
  displayName: string;
  shortName?: string;
  requiredRole: string | null;
  scavengeInterval: number;
  lootTable: Array<{ itemId: string; chance: number; minQty: number; maxQty: number }>;
}

export type ExpeditionLocationsMap = Record<string, ExpeditionLocation>;

export const EXPEDITION_LOCATIONS: ExpeditionLocationsMap = {
  radar_station: {
    id: 'radar_station', name: '雷达站废墟', displayName: '废弃雷达站', shortName: '雷达站',
    requiredRole: null, scavengeInterval: 300,
    lootTable: [
      { itemId: 'scrap_metal', chance: 0.7, minQty: 1, maxQty: 2 },
      { itemId: 'energy_refill', chance: 0.1, minQty: 1, maxQty: 1 },
      { itemId: 'seed_glow_grass', chance: 0.2, minQty: 1, maxQty: 1 },
      { itemId: 'crystal_silicon', chance: 0.05, minQty: 1, maxQty: 1 }
    ]
  },
  subway_station: {
    id: 'subway_station', name: '坍塌地铁站', displayName: '坍塌地铁站', shortName: '地铁站',
    requiredRole: 'scout', scavengeInterval: 240,
    lootTable: [
      { itemId: 'scrap_metal', chance: 0.8, minQty: 1, maxQty: 3 },
      { itemId: 'steel_petal', chance: 0.3, minQty: 1, maxQty: 2 },
      { itemId: 'seed_aether_berry', chance: 0.15, minQty: 1, maxQty: 1 },
      { itemId: 'rusted_spring', chance: 0.1, minQty: 1, maxQty: 1 }
    ]
  },
  bio_lab: {
    id: 'bio_lab', name: '生化实验室', displayName: '生化实验室', shortName: '实验室',
    requiredRole: 'engineer', scavengeInterval: 360,
    lootTable: [
      { itemId: 'mana_dust', chance: 0.5, minQty: 1, maxQty: 2 },
      { itemId: 'dream_shard', chance: 0.2, minQty: 1, maxQty: 1 },
      { itemId: 'purifying_serum', chance: 0.05, minQty: 1, maxQty: 1 },
      { itemId: 'nanite_slurry', chance: 0.15, minQty: 1, maxQty: 1 }
    ]
  },
  green_ruins: {
    id: 'green_ruins', name: '古代温室废墟', displayName: '古代温室废墟', shortName: '温室废墟',
    requiredRole: null, scavengeInterval: 0, lootTable: []
  },
  signal_tower: {
    id: 'signal_tower', name: '高频信号塔', displayName: '高频信号塔', shortName: '信号塔',
    requiredRole: null, scavengeInterval: 0, lootTable: []
  },
  collapsed_subway: {
    id: 'collapsed_subway', name: '坍塌地铁站', displayName: '坍塌地铁站', shortName: '地铁站',
    requiredRole: null, scavengeInterval: 0, lootTable: []
  },
  military_depot: {
    id: 'military_depot', name: '废弃军火库', displayName: '废弃军火库', shortName: '军火库',
    requiredRole: null, scavengeInterval: 0, lootTable: []
  },

  // === 新幸存者救援地点 ===
  poison_factory: {
    id: 'poison_factory', name: '废弃制药厂', displayName: '废弃制药厂', shortName: '制药厂',
    requiredRole: 'engineer', scavengeInterval: 420,
    lootTable: [
      { itemId: 'crystal_silicon', chance: 0.4, minQty: 1, maxQty: 2 },
      { itemId: 'nanite_slurry', chance: 0.2, minQty: 1, maxQty: 1 },
      { itemId: 'scrap_metal', chance: 0.6, minQty: 1, maxQty: 3 },
      { itemId: 'ration', chance: 0.2, minQty: 1, maxQty: 1 }
    ]
  },
  ruined_armory: {
    id: 'ruined_armory', name: '坍塌军械库', displayName: '坍塌军械库', shortName: '军械库',
    requiredRole: 'guard', scavengeInterval: 360,
    lootTable: [
      { itemId: 'rusted_spring', chance: 0.5, minQty: 1, maxQty: 2 },
      { itemId: 'alloy_plate', chance: 0.3, minQty: 1, maxQty: 1 },
      { itemId: 'mana_dust', chance: 0.4, minQty: 1, maxQty: 2 },
      { itemId: 'seed_crystal_reed', chance: 0.15, minQty: 1, maxQty: 1 }
    ]
  },
  ancient_library: {
    id: 'ancient_library', name: '旧世大图书馆', displayName: '旧世大图书馆', shortName: '图书馆',
    requiredRole: null, scavengeInterval: 300,
    lootTable: [
      { itemId: 'dream_shard', chance: 0.3, minQty: 1, maxQty: 2 },
      { itemId: 'mana_dust', chance: 0.5, minQty: 1, maxQty: 2 },
      { itemId: 'nightmare_tear', chance: 0.05, minQty: 1, maxQty: 1 },
      { itemId: 'seed_stellar_rose', chance: 0.1, minQty: 1, maxQty: 1 }
    ]
  }
};
