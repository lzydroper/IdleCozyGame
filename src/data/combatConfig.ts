// 战斗核心配置（ticket 05）：所有数值可配置，上线后便于调参
export interface CombatConfig {
  maxStamina: number;        // 体力上限
  staminaRegenSeconds: number; // 每 N 秒恢复 1 点体力
  partySize: number;         // 上阵队伍人数上限（三人小队）
  maxBattleRounds: number;   // 单场战斗回合上限（超时按战败处理）
  expPerLevel: number;       // 升到下一级所需经验 = 当前等级 * expPerLevel
  encounterStaminaCost: number; // 探索战斗遭遇的体力消耗（ticket 06，ADR-0002 战斗耗体力）
  battleDurationSeconds: number; // 离线挂机（ticket 08）每场战斗所需秒数
  maxIdleSettlementSeconds: number; // 离线挂机结算时间上限（ticket 08，配置项）
}

export const COMBAT_CONFIG: CombatConfig = {
  maxStamina: 100,
  staminaRegenSeconds: 3,
  partySize: 3,
  maxBattleRounds: 60,
  expPerLevel: 100,
  encounterStaminaCost: 5,
  battleDurationSeconds: 20,
  maxIdleSettlementSeconds: 8 * 3600
};
