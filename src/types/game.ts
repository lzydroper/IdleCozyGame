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
}
