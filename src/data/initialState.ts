import type { GameState, HeroState, PlayerStats } from '../types/game';
import { HEROES_CONFIG, STARTER_HERO_ID } from './heroes';
import { COMBAT_CONFIG } from './combatConfig';

export const INITIAL_PLAYER_STATS: PlayerStats = {
  food: 100,
  maxFood: 100,
  energy: 100,
  maxEnergy: 100,
  sanity: 100,
  maxSanity: 100,
  days: 1
};

// 依据配置创建 1 级初始英雄状态
export const createInitialHero = (configId: string): HeroState => {
  const config = HEROES_CONFIG[configId];
  if (!config) throw new Error(`Unknown hero config: ${configId}`);
  return {
    level: 1,
    exp: 0,
    hp: config.baseAttributes.maxHp,
    maxHp: config.baseAttributes.maxHp,
    star: 1,
    wounded: false,
    talentPoints: 0,   // 升级获得天赋点（ticket 11）
    talents: {},
    awakened: false,   // 满星后消耗奥术星体觉醒（ticket 12）
    logisticsFacilityId: null
  };
};

// 开局固定赠送的初始英雄（诺娃，第一位同伴）
export const INITIAL_HEROES: Record<string, HeroState> = {
  [STARTER_HERO_ID]: createInitialHero(STARTER_HERO_ID)
};

export const INITIAL_STATE: GameState = {
  player: INITIAL_PLAYER_STATS,
  inventory: {
    seed_glow_grass: 5,
    seed_aether_berry: 2,
    ration: 5,
    scrap_metal: 10,
    dream_shard: 5,
    // 经济实体物品化（ADR-0014）：货币与碎片全部入背包；shard_<hero> 随英雄配置生成
    soul_echo: 500,
    resonance_shard: 0,
    ...Object.fromEntries(Object.keys(HEROES_CONFIG).map(id => [`shard_${id}`, 0]))
  },
  greenhouse: {
    slots: [
      { id: 1, cropId: null, growthProgress: 0, growthTimeLeft: 0, isWatered: false },
      { id: 2, cropId: null, growthProgress: 0, growthTimeLeft: 0, isWatered: false },
      { id: 3, cropId: null, growthProgress: 0, growthTimeLeft: 0, isWatered: false },
      { id: 4, cropId: null, growthProgress: 0, growthTimeLeft: 0, isWatered: false }
    ],
    unlockedSlotsCount: 4,
    autoFarm: { enabled: false, cropId: null }
  },
  heroes: INITIAL_HEROES,
  equipment: {}, // 英雄装备栏：开局无装备（ticket 10）
  equipmentInventory: {}, // 背包装备实例（ADR-0014 修订）：开局无持有
  // 召唤经济（ADR-0014）：新手起始灵魂残响 500（= 5 抽），后续由战斗掉落/日常补充
  summon: { pityCount: 0 },
  // 战斗核心：开局满体力，初始小队 = 初始英雄诺娃
  stamina: COMBAT_CONFIG.maxStamina,
  maxStamina: COMBAT_CONFIG.maxStamina,
  party: [STARTER_HERO_ID],
  combat: {
    zoneId: null,
    lastSettlement: null,
    zonesCleared: [],
    idle: {
      zoneId: null,
      startTime: null
    }
  },
  exploration: {
    inRealityExploration: false,
    realitySteps: 0,
    realityLocationId: null,
    realityBag: {},
    realityEventId: null,
    realityEncounterId: null,
    inDreamExploration: false,
    dreamSteps: 0,
    dreamPollution: 0,
    dreamBag: {},
    dreamEventId: null,
    capsulesCharge: {
      sanity_capsule: 3,
      warp_capsule: 0
    },
    rescueProgress: {}, // 英雄救援进度（共鸣+坐标锁定，ADR-0013）
    dreamLockdownUntil: null
  },
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
    upgrades: {}, // 基建升级施工中（时间戳驱动，长节奏设定）
    facilities: {
      smelter: [
        {
          id: 'smelter',
          name: '魔导冶炼炉',
          level: 1,
          queue: [],
          currentProgress: 0,
          timeLeft: 0
        }
      ],
      assembler: [
        {
          id: 'assembler',
          name: '微型芯片组装台',
          level: 1,
          queue: [],
          currentProgress: 0,
          timeLeft: 0
        }
      ]
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
