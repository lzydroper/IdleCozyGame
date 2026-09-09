// 事件域权重常量（config-json-migration 批次② 自 data/realityEvents.ts 抽取）。
export const CATEGORY_WEIGHTS: Record<string, number> = {
  common: 100,
  danger: 80,
  combat: 60,
  welfare: 40,
  relic: 30,
  anomaly: 20,
  encounter: 40
};
