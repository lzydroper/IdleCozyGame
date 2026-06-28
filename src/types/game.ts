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
  growthTime: number; // 生长所需总时间（秒）
  yields: Record<string, number>; // 收获所得材料及其数量
  seedCost: Record<string, number>; // 种植消耗
  description: string;
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
    // 梦境探索
    inDreamExploration: boolean;
    dreamSteps: number;
    dreamPollution: number;            // 梦境污染度 0-100
    dreamBag: Record<string, number>;  // 梦境中获得的碎片/线索
    capsulesCharge: Record<string, number>; // 梦胶囊ID -> 剩余可用次数
  };
  discoveredBlueprints: string[];     // 已解锁的配方ID
  activeAlert: {
    type: "dream_leak" | null;        // 梦魇侵入等危机状态
    hp: number;                       // 侵入怪物血量
  };
  lastTick: number;                   // 上一次心跳的时间戳
}
