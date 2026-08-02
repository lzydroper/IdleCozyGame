// 英雄召唤配置：所有数值可配置，上线后便于调参
export interface SummonConfig {
  costPerSummon: number;    // 单抽消耗的灵魂残响
  heroBaseChance: number;   // 基础出英雄概率 (0-1)
  pityThreshold: number;    // 软保底启动阈值：连续未出英雄达到该次数后概率开始递增
  pityStep: number;         // 超过阈值后，每多抽一次提升的概率增量 (0-1)
  guaranteedAt: number;     // 必出英雄的连续未出次数上限
  shardsPerDupe: number;    // 重复英雄转化获得的灵魂碎片数
  resonancePerMiss: number; // 未出英雄获得的共鸣碎片数
}

export const SUMMON_CONFIG: SummonConfig = {
  costPerSummon: 100,
  heroBaseChance: 0.6,
  pityThreshold: 10,
  pityStep: 0.1,
  guaranteedAt: 100,
  shardsPerDupe: 1,
  resonancePerMiss: 1
};
