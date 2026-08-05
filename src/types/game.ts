export interface PlayerStats {
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
  type: 'event' | 'logistics' | 'combat' | 'dream' | 'system';
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
  role: "farmer" | "engineer" | "scout" | "guard" | "chemist" | "scavenger";
  isAssigned: boolean;      // 是否已指派工作
  assignedSlotId?: number;  // 指派的温室槽位或工坊槽位
  realityLocationId?: string; // 该幸存者在现实中的救援地点 ID
  assignedJobId?: string | null;
}

// === 英雄（Hero）系统：Melvor 式改造新增 ===

// 英雄职阶：守护者（坦克）/ 进攻者（输出）/ 协奏者（辅助）
export type HeroClass = 'guardian' | 'attacker' | 'conductor';

// 英雄阵营：奥术 / 机械 / 梦魇 / 英灵 / 星界 / 魂印
export type HeroFaction = 'arcane' | 'mechanical' | 'nightmare' | 'spirit' | 'astral' | 'soulseal';

// 英雄运行时状态（Record 的 key = 英雄配置 id，英雄为唯一实例）
export interface HeroState {
  level: number;
  exp: number;
  hp: number;
  maxHp: number;
  star: number;
  wounded: boolean;         // 重伤标记：战斗失败（小队全灭）后禁止上阵
  talentPoints: number;     // 未分配天赋点（升级获得，ticket 11）
  talents: Record<string, number>; // 天赋树投入：节点 id -> 已投入点数（ticket 11）
  awakened: boolean;        // 觉醒标记：满星后消耗奥术星体觉醒（ticket 12）
  logisticsFacilityId: string | null; // 设施后勤驻守 ID（null 表示未驻守后勤，非 null 时无法上阵战斗）
}

// 召唤进度状态（100 抽保底计数）
export interface SummonState {
  pityCount: number;        // 连续未获得未拥有英雄的累计次数（100 抽硬保底 + 软保底共用）
}

// === 装备系统（ticket 10）：3 槽装备 + 系列套装 + 强化 + 神话锻造 ===

// 装备槽位：武器 / 防具 / 饰品
export type EquipmentSlot = 'weapon' | 'armor' | 'trinket';

// 已穿戴的装备实例：配置 id + 强化等级（0-30）+ 神话标记
export interface EquippedItem {
  itemId: string;   // EQUIPMENT_CONFIG 中的装备配置 id
  enhance: number;  // 强化等级，上限 +30
  mythic: boolean;  // 是否已锻造为神话装备（必为 +30）
}

// 英雄的三槽装备栏（null = 空槽）
export interface HeroEquipment {
  weapon: EquippedItem | null;
  armor: EquippedItem | null;
  trinket: EquippedItem | null;
}

// === 战斗核心（ticket 05）：三人轮询回合制 ===

// 单次攻击动作（战斗日志的一行）
export interface BattleAction {
  round: number;
  actorSide: 'hero' | 'enemy';
  actorId: string;
  actorName: string;
  actorEmoji: string;
  targetName: string;
  damage: number;
  kind?: 'attack' | 'skill' | 'heal'; // 行动类型（ticket 12 觉醒专属技能：heal 的 damage 为治疗量）
  skillName?: string;                  // kind === 'skill' | 'heal' 时的技能名
}

// 一场战斗的模拟结果（纯战斗，不含经济结算）
export interface BattleResult {
  victory: boolean;      // 敌人全灭 → 胜利
  partyWiped: boolean;   // 英雄全灭 → 战败（重伤触发条件）
  rounds: number;
  actions: BattleAction[];
  // 逐动作 HP 快照（ticket 21 血条播放）：hpTrack[0] = 初始满血状态，
  // hpTrack[k] = 第 k 个动作执行后的全员 HP（长度 = actions.length + 1）。
  // 可选：旧存档/测试 mock 无此字段时 UI 回退为纯日志播报。
  hpTrack?: BattleHpEntry[][];
}

// 单个参战者的 HP 快照（ticket 21 血条展示用）
export interface BattleHpEntry {
  id: string;
  side: 'hero' | 'enemy';
  name: string;
  emoji: string;
  hp: number;
  maxHp: number;
}

// 战斗结算：掉落/经验/重伤入账
export interface CombatSettlement {
  battle: BattleResult;
  drops: Record<string, number>;   // 胜利掉落（材料），已入账
  soulEchoes: number;              // 胜利灵魂残响掉落，已入账
  expPerHero: number;              // 每位上阵英雄获得的经验（战败为 0）
  woundedHeroIds: string[];        // 战败后进入重伤的英雄
}

// 确认式离线挂机（ticket 08）：玩家在某战斗区域主动开启后，离线期间战斗才推进；
// 可随时停止；体力耗尽或小队战败自动停止
export interface CombatIdleState {
  zoneId: string | null;       // 正在挂机的区域（null = 未挂机）
  startTime: number | null;    // 开始挂机时间戳（UI 展示用）
}

// 战斗状态：最近战斗区域与最近一次结算（供 UI 展示）
export interface CombatState {
  zoneId: string | null;
  lastSettlement: CombatSettlement | null;
  zonesCleared: string[];  // 已通关区域（ticket 07 线性区域链：通关当前区解锁下一区）
  idle: CombatIdleState;   // 确认式离线挂机开关（ticket 08）
}

export interface GameState {
  player: PlayerStats;
  inventory: Record<string, number>; // 物品ID -> 数量
  greenhouse: {
    slots: GreenhouseSlot[];
    unlockedSlotsCount: number;
  };
  survivors: Record<string, Survivor>;
  heroes: Record<string, HeroState>;   // 英雄系统：config id -> 英雄状态（开局赠送诺娃）
  equipment: Record<string, HeroEquipment>; // 英雄装备栏：hero id -> 三槽装备（ticket 10）
  soulEchoes: number;                  // 灵魂残响：英雄召唤货币（战斗掉落/日常/特殊途径获取）
  resonanceShards: number;             // 共鸣碎片：通用灵魂碎片
  soulShards: Record<string, number>;  // 灵魂碎片：英雄专属碎片（重复召唤转化，用于升星）
  summon: SummonState;                 // 召唤进度（软保底）
  stamina: number;                     // 体力：自动战斗消耗的独立资源，随时间恢复
  maxStamina: number;                  // 体力上限
  party: string[];                     // 上阵队伍：最多 3 名英雄 id（无阵型，固定顺序）
  combat: CombatState;                 // 战斗状态（最近战斗区域与结算）
  exploration: {
    // 现实探索
    inRealityExploration: boolean;
    realitySteps: number;
    realityLocationId: string | null;
    realityBag: Record<string, number>; // 探索中临时背包
    realityEventId?: string | null;     // 当前激活的现实事件ID
    realityEncounterId: string | null;  // 待战斗的战斗遭遇事件ID（ticket 06 探索战斗汇合）
    // 梦境探索
    inDreamExploration: boolean;
    dreamSteps: number;
    dreamPollution: number;            // 梦境污染度 0-100
    dreamBag: Record<string, number>;  // 梦境中获得的碎片/线索
    dreamEventId?: string | null;      // 当前激活的梦境事件ID
    capsulesCharge: Record<string, number>; // 梦胶囊ID -> 剩余可用次数
    survivorResonance: Record<string, number>; // 幸存者ID -> 共鸣度
    dreamLockdownUntil: number | null; // 梦境封锁截止时间戳（泄露防御失败触发，ticket 14）
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

// 设施类型：冶炼炉 / 组装台（ticket 13 每种设施可扩建多台并行）
export type FacilityType = 'smelter' | 'assembler';

export interface AutoRecipe {
  id: string;
  name: string;
  input: Record<string, number>;
  output: Record<string, number>;
  duration: number; // 单次生产耗时（秒）
  facilityId: FacilityType;
}

// 产线设施实例（ticket 13）：每条 FIFO 配方队列顺序执行；队列容量 = 设施等级
export interface AutomationFacility {
  id: FacilityType;               // 设施类型 id: 'smelter' | 'assembler'
  name: string;
  level: number;                  // 设施等级：决定加工速度（每级 +10%）与队列容量（容量 = 等级）
  queue: string[];                // FIFO 配方队列：队首 = 正在生产，其余排队等待
  currentProgress: number;        // 队首配方单次加工进度 (0 - 100)
  timeLeft: number;               // 队首配方当前单次加工剩余时间 (秒)
  active?: boolean;               // 控制启用状态，默认为 true
}

export interface ShelterStats {
  maxOfflineDuration: number;     // 离线收益结算上限时长（秒），初始 4 小时 (14400)
  batteryLevel: number;           // 蓄电池等级
  generatorLevel: number;         // 发电机等级
  recyclerLevel: number;           // 回收站等级
  facilities: Record<FacilityType, AutomationFacility[]>; // 每种设施可扩建多台并行（ticket 13）
  
  // 岗位分配
  assignedWatererId: string | null;   // 指派自动浇水的幸存者ID
  assignedExplorerId: string | null;  // 指派挂机探索的幸存者ID
  
  // 挂机派遣状态
  expedition: {
    locationId: string | null;       // 派遣目的地，如 'radar_station'
    startTime: number | null;
    lastScavengeTime: number | null;  // 上次拾荒计算时间戳
  };
  accumulatedEnergy?: number;
  accumulatedScrap?: number;
}

export interface OfflineReport {
  elapsedSeconds: number;
  recoveredEnergy: number;
  recoveredStamina: number;            // 离线期间恢复的体力
  recoveredItems: Record<string, number>; // 包含发电机、收集器、挂机派遣、流水线产出
  logs: string[];
  idleCombat?: IdleCombatReport | null;    // 确认式离线挂机战斗结算（ticket 08）
}

// 离线挂机战斗结算报告（ticket 08）：重连弹窗展示掉落与经验
export interface IdleCombatReport {
  zoneId: string;
  zoneName: string;
  battlesFought: number;   // 本次离线实际战斗场数
  victories: number;       // 胜利场数
  defeats: number;         // 战败场数（战败即自动停止挂机）
  draws: number;           // 平局场数
  drops: Record<string, number>;     // 累计掉落（已入账）
  soulEchoesGained: number;          // 累计灵魂残响
  expPerHero: number;                // 每位上阵英雄累计获得经验
  staminaConsumed: number;           // 挂机战斗消耗的体力
  autoStopped: boolean;              // 是否自动停止（体力耗尽 / 战败）
  stopReason?: 'stamina' | 'defeat';
}
