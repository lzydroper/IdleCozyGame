import type { GameState, PlayerStats } from '../types/game';

export const INITIAL_PLAYER_STATS: PlayerStats = {
  hp: 100,
  maxHp: 100,
  food: 100,
  maxFood: 100,
  energy: 100,
  maxEnergy: 100,
  sanity: 100,
  maxSanity: 100,
  days: 1
};

export const INITIAL_STATE: GameState = {
  player: INITIAL_PLAYER_STATS,
  inventory: {
    seed_glow_grass: 5,
    seed_aether_berry: 2,
    ration: 5,
    scrap_metal: 10,
    dream_shard: 5
  },
  greenhouse: {
    slots: [
      { id: 1, cropId: null, growthProgress: 0, growthTimeLeft: 0, isWatered: false },
      { id: 2, cropId: null, growthProgress: 0, growthTimeLeft: 0, isWatered: false },
      { id: 3, cropId: null, growthProgress: 0, growthTimeLeft: 0, isWatered: false },
      { id: 4, cropId: null, growthProgress: 0, growthTimeLeft: 0, isWatered: false }
    ],
    unlockedSlotsCount: 4
  },
  survivors: {},
  exploration: {
    inRealityExploration: false,
    realitySteps: 0,
    realityLocationId: null,
    realityBag: {},
    realityEventId: null,
    inDreamExploration: false,
    dreamSteps: 0,
    dreamPollution: 0,
    dreamBag: {},
    dreamEventId: null,
    capsulesCharge: {
      sanity_capsule: 3,
      warp_capsule: 0
    },
    survivorResonance: {}
  },
  discoveredBlueprints: [
    'filter_refill',
    'ration_pack',
    'sanity_capsule',
    'hot_stew',
    'nanite_injector',
    'purifying_serum',
    'energy_refill_advanced',
    'shield_battery_recipe',
    'greenhouse_expansion'
  ],
  activeAlert: {
    type: null,
    hp: 0
  },
  lastTick: Date.now(),
  dayStartTime: Date.now(),
  logs: [
    { id: 'init', text: '▶ 避难所系统启动。欢迎来到废土魔导温室，生存者。', timestamp: Date.now(), type: 'system' }
  ],
  shelter: {
    maxOfflineDuration: 14400,
    batteryLevel: 1,
    generatorLevel: 0,
    recyclerLevel: 0,
    facilities: {
      smelter: {
        id: 'smelter',
        name: '魔导冶炼炉',
        level: 1,
        activeRecipeId: null,
        currentProgress: 0,
        timeLeft: 0,
        assignedSurvivorId: null
      },
      assembler: {
        id: 'assembler',
        name: '微型芯片组装台',
        level: 1,
        activeRecipeId: null,
        currentProgress: 0,
        timeLeft: 0,
        assignedSurvivorId: null
      }
    },
    assignedWatererId: null,
    assignedExplorerId: null,
    expedition: {
      locationId: null,
      startTime: null,
      lastScavengeTime: null
    },
    accumulatedEnergy: 0,
    accumulatedScrap: 0
  },
  lastOfflineReport: null
};
