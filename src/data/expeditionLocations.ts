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
      { itemId: 'seed_glow_grass', chance: 0.2, minQty: 1, maxQty: 1 }
    ]
  },
  subway_station: {
    id: 'subway_station', name: '坍塌地铁站', displayName: '坍塌地铁站', shortName: '地铁站',
    requiredRole: 'scout', scavengeInterval: 240,
    lootTable: [
      { itemId: 'scrap_metal', chance: 0.8, minQty: 1, maxQty: 3 },
      { itemId: 'steel_petal', chance: 0.3, minQty: 1, maxQty: 2 },
      { itemId: 'seed_aether_berry', chance: 0.15, minQty: 1, maxQty: 1 }
    ]
  },
  bio_lab: {
    id: 'bio_lab', name: '生化实验室', displayName: '生化实验室', shortName: '实验室',
    requiredRole: 'engineer', scavengeInterval: 360,
    lootTable: [
      { itemId: 'mana_dust', chance: 0.5, minQty: 1, maxQty: 2 },
      { itemId: 'dream_shard', chance: 0.2, minQty: 1, maxQty: 1 },
      { itemId: 'purifying_serum', chance: 0.05, minQty: 1, maxQty: 1 }
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
  }
};
