// 梦魇入侵与泄露防御配置（ticket 14：废除全局 HP 后，泄露改为出战小队防御）
export const NIGHTMARE_CONFIG = {
  // 泄露触发：梦境污染度 100% 强制唤醒时生成的梦魇血量
  dreamLeakDamage: 60,
  // 炮塔辅助：开战前先输出一轮的固定伤害（保留原数值，语义从"直接击杀"变为辅助）
  turretDamage: 35,
  // 防御胜利奖励：击败梦魇后掉落的虚空核心
  turretReward: { void_core: 1 },
  // 泄露战斗的梦魇属性（攻击/防御），供出战小队防御时模拟战斗
  leakAttack: 14,
  leakDefense: 4,
  // 梦境封锁时长（秒）：泄露防御失败 → 小队全员重伤 + 梦境探索禁用
  dreamLockdownDuration: 1800, // 30 分钟
};
