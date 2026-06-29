export interface PlayerStats {
  hp: number;         // 现实生命值
  maxHp: number;
  food: number;       // 现实饱食度
  maxFood: number;
  energy: number;     // 现实魔能 (用于过滤辐射/温室供能)
  maxEnergy: number;
  sanity: number;     // 梦境精神力 (Sanity)
  maxSanity: number;
  days: number;       // 生存天数
}

export interface Crop {
  id: string;
  name: string;
  growthTime: number;
  yields: Record<string, number>;
  seedCost: Record<string, number>;
  description: string;
}

export interface LogEntry {
  id: string;
  text: string;
  timestamp: number;
  type: 'event' | 'harvest' | 'combat' | 'dream' | 'system';
}

export interface GreenhouseSlot {
  id: number;
  cropId: string | null;    // 种植的作物，null表示空闲
  growthProgress: number;   // 0 - 100
  growthTimeLeft: number;   // 剩余秒数
  isWatered: boolean;       // 浇水状态（生长速度翻倍）
}

export interface Survivor {
  id: string;
  name: string;
  role: "farmer" | "engineer" | "scout";
  bonus: number;            // 效率提升比例（例如 0.15 表示提升15%）
  isAssigned: boolean;      // 是否已指派工作
  assignedSlotId?: number;  // 指派的温室槽位或工坊槽位
  realityLocationId?: string; // 该幸存者在现实中的救援地点 ID
  assignedJobId?: string | null;
}

export interface GameState {
  player: PlayerStats;
  inventory: Record<string, number>; // 物品ID -> 数量
  greenhouse: {
    slots: GreenhouseSlot[];
    unlockedSlotsCount: number;
  };
  survivors: Record<string, Survivor>;
  exploration: {
    // 现实探索
    inRealityExploration: boolean;
    realitySteps: number;
    realityLocationId: string | null;
    realityBag: Record<string, number>; // 探索中临时背包
    realityEventId?: string | null;     // 当前激活的现实事件ID
    // 梦境探索
    inDreamExploration: boolean;
    dreamSteps: number;
    dreamPollution: number;            // 梦境污染度 0-100
    dreamBag: Record<string, number>;  // 梦境中获得的碎片/线索
    dreamEventId?: string | null;      // 当前激活的梦境事件ID
    capsulesCharge: Record<string, number>; // 梦胶囊ID -> 剩余可用次数
    survivorResonance: Record<string, number>; // 幸存者ID -> 共鸣度
  };
  discoveredBlueprints: string[];
  activeAlert: {
    type: "dream_leak" | null;
    hp: number;
  };
  lastTick: number;
  dayStartTime: number;  // 当前游戏天开始时间戳
  logs: LogEntry[];      // 避难所日志
  hasCatherine?: boolean;
  hasBuster?: boolean;
  hasNova?: boolean;
  shelter: ShelterStats;
  lastOfflineReport?: OfflineReport | null;
}

export interface AutoRecipe {
  id: string;
  name: string;
  input: Record<string, number>;
  output: Record<string, number>;
  duration: number; // 单次生产耗时（秒）
}

export interface AutomationFacility {
  id: string;                     // 'smelter' | 'assembler'
  name: string;
  level: number;                  // 设施等级，升级可缩短加工时间
  activeRecipeId: string | null;  // 当前启用的加工配方，null表示未启用
  currentProgress: number;        // 单次加工进度 (0 - 100)
  timeLeft: number;               // 当前单次加工剩余时间 (秒)
  assignedSurvivorId: string | null; // 派驻的幸存者ID（提供效率加成）
}

export interface ShelterStats {
  maxOfflineDuration: number;     // 离线收益结算上限时长（秒），初始 4 小时 (14400)
  batteryLevel: number;           // 蓄电池等级
  generatorLevel: number;         // 发电机等级
  recyclerLevel: number;           // 回收站等级
  facilities: Record<string, AutomationFacility>;
  
  // 岗位分配
  assignedWatererId: string | null;   // 指派自动浇水的幸存者ID
  assignedExplorerId: string | null;  // 指派挂机探索的幸存者ID
  
  // 挂机派遣状态
  expedition: {
    locationId: string | null;       // 派遣目的地，如 'radar_station'
    startTime: number | null;
    lastScavengeTime: number | null;  // 上次拾荒计算时间戳
  };
}

export interface OfflineReport {
  elapsedSeconds: number;
  recoveredEnergy: number;
  recoveredItems: Record<string, number>; // 包含发电机、收集器、挂机派遣、流水线产出
  logs: string[];
}
