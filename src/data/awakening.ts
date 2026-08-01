// 升星与觉醒配置（ticket 12）：终局养成闭环。
// 升星：消耗该英雄灵魂碎片（或通用共鸣碎片）提升星级，每星提供百分比属性加成；
// 觉醒：满星英雄消耗奥术星体（终局素材，区域 BOSS 掉落）—— 更名、强化被动、解锁专属战斗技能。
// 数据驱动：新增内容只需追加本文件配置，无需改动战斗逻辑。
import type { CombatBonus } from './bonds';

export const STAR_MAX = 5; // 星级上限（初始 1 星）

// 升星消耗：从当前星级升到下一级所需碎片数（灵魂碎片与共鸣碎片 1:1 通用，先扣专属再扣通用）
export const starUpShardCost = (currentStar: number): number => currentStar * 5;

// 每颗星（1 星以上）提供的百分比属性加成
export const STAR_STATS_PER_STAR: CombatBonus = { attackPercent: 2, defensePercent: 2, maxHpPercent: 4 };

// 觉醒消耗
export const AWAKEN_COST: Record<string, number> = { arcane_orb: 1 };

// 觉醒专属战斗技能：纳入轮询回合制结算（ticket 12）
export interface AwakenSkillConfig {
  name: string;
  description: string;
  type: 'strike' | 'aoe' | 'heal'; // 单体重击 / 群体攻击 / 自身治疗
  multiplier: number;   // strike/aoe：伤害 = 攻击 × 倍率（仍受目标防御减免）
  cooldown: number;     // 使用后的冷却回合数（按自身行动轮计，冷却中普通攻击）
  healPercent?: number; // heal：恢复自身最大生命的百分比
}

// 觉醒配置：每英雄一份（外观更名 / 强化被动 / 专属技能）
export interface AwakenConfig {
  awakenedName: string;   // 觉醒后的名字（外观变化）
  passive: CombatBonus;   // 觉醒强化被动（百分比，战斗内生效）
  skill: AwakenSkillConfig;
}

export const AWAKEN_CONFIG: Record<string, AwakenConfig> = {
  nova: {
    awakenedName: '觉醒·诺娃',
    passive: { attackPercent: 10 },
    skill: { name: '电涌过载', description: '对全部敌人造成 80% 攻击的群体电击伤害', type: 'aoe', multiplier: 0.8, cooldown: 3 }
  },
  buster: {
    awakenedName: '觉醒·巴斯特',
    passive: { attackPercent: 12 },
    skill: { name: '拆解重击', description: '对单个敌人造成 220% 攻击的重击', type: 'strike', multiplier: 2.2, cooldown: 3 }
  },
  soldier: {
    awakenedName: '觉醒·铁卫',
    passive: { maxHpPercent: 15 },
    skill: { name: '铁壁盾击', description: '对单个敌人造成 180% 攻击的盾击', type: 'strike', multiplier: 1.8, cooldown: 3 }
  },
  catherine: {
    awakenedName: '觉醒·凯瑟琳',
    passive: { maxHpPercent: 12, defensePercent: 5 },
    skill: { name: '应急治疗', description: '恢复自身 40% 最大生命', type: 'heal', multiplier: 0, cooldown: 4, healPercent: 40 }
  },
  roy: {
    awakenedName: '觉醒·罗伊',
    passive: { attackPercent: 8, defensePercent: 5 },
    skill: { name: '磁轨炮击', description: '对单个敌人造成 200% 攻击的炮击', type: 'strike', multiplier: 2, cooldown: 3 }
  },
  mei: {
    awakenedName: '觉醒·阿梅',
    passive: { maxHpPercent: 10, defensePercent: 8 },
    skill: { name: '藤蔓再生', description: '恢复自身 35% 最大生命', type: 'heal', multiplier: 0, cooldown: 4, healPercent: 35 }
  },
  zero: {
    awakenedName: '觉醒·赛罗',
    passive: { attackPercent: 10 },
    skill: { name: '魂印突刺', description: '对单个敌人造成 200% 攻击的突刺', type: 'strike', multiplier: 2, cooldown: 3 }
  },
  healer: {
    awakenedName: '觉醒·艾拉',
    passive: { maxHpPercent: 15 },
    skill: { name: '净化之泉', description: '恢复自身 50% 最大生命', type: 'heal', multiplier: 0, cooldown: 4, healPercent: 50 }
  },
  apprentice: {
    awakenedName: '觉醒·小米',
    passive: { defensePercent: 10, attackPercent: 5 },
    skill: { name: '星屑散射', description: '对全部敌人造成 70% 攻击的星屑伤害', type: 'aoe', multiplier: 0.7, cooldown: 3 }
  }
};
