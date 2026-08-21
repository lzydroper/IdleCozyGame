// 升星与觉醒配置（ticket 12）：终局养成闭环。
// 升星：消耗该英雄灵魂碎片（或通用共鸣碎片）提升星级，每星提供百分比属性加成；
// 觉醒：满星英雄消耗奥术星体（终局素材，区域 BOSS 掉落）—— 更名、强化被动、解锁专属战斗技能。
// 数据驱动：新增内容只需追加本文件配置，无需改动战斗逻辑。
import type { StatModifier } from '../state/statSystem';

export const STAR_MAX = 5; // 星级上限（初始 1 星）

// 升星消耗：从当前星级升到下一级所需碎片数（灵魂碎片与共鸣碎片 1:1 通用，先扣专属再扣通用）
export const starUpShardCost = (currentStar: number): number => currentStar * 5;

// 每颗星（1 星以上）提供的百分比属性加成
// 例：1 星 → 攻击 +2%、防御 +2%、生命 +4%
export const STAR_STATS_PER_STAR: StatModifier[] = [
  { stat: 'attack', kind: 'percent', value: 0.02 },
  { stat: 'defense', kind: 'percent', value: 0.02 },
  { stat: 'maxHp', kind: 'percent', value: 0.04 }
];

// 觉醒消耗
export const AWAKEN_COST: Record<string, number> = { arcane_orb: 1 };

// 觉醒专属战斗技能：改为引用 Ability 配置注册表（combat-ability）。
// 数值与效果唯一来源 = src/data/abilities.ts；此处只存 abilityId。

// 觉醒配置：每英雄一份（外观更名 / 强化被动 / 专属技能）
export interface AwakenConfig {
  awakenedName: string;   // 觉醒后的名字（外观变化）
  passive: StatModifier[]; // 觉醒强化被动（百分比，战斗内生效）
  abilityId: string;
}

export const AWAKEN_CONFIG: Record<string, AwakenConfig> = {
  nova: {
    awakenedName: '觉醒·诺娃',
    passive: [{ stat: 'attack', kind: 'percent', value: 0.10 }],
    abilityId: 'awaken_nova'
  },
  buster: {
    awakenedName: '觉醒·巴斯特',
    passive: [{ stat: 'attack', kind: 'percent', value: 0.12 }],
    abilityId: 'awaken_buster'
  },
  soldier: {
    awakenedName: '觉醒·铁卫',
    passive: [{ stat: 'maxHp', kind: 'percent', value: 0.15 }],
    abilityId: 'awaken_soldier'
  },
  catherine: {
    awakenedName: '觉醒·凯瑟琳',
    passive: [
      { stat: 'maxHp', kind: 'percent', value: 0.12 },
      { stat: 'defense', kind: 'percent', value: 0.05 }
    ],
    abilityId: 'awaken_catherine'
  },
  roy: {
    awakenedName: '觉醒·罗伊',
    passive: [
      { stat: 'attack', kind: 'percent', value: 0.08 },
      { stat: 'defense', kind: 'percent', value: 0.05 }
    ],
    abilityId: 'awaken_roy'
  },
  mei: {
    awakenedName: '觉醒·阿梅',
    passive: [
      { stat: 'maxHp', kind: 'percent', value: 0.10 },
      { stat: 'defense', kind: 'percent', value: 0.08 }
    ],
    abilityId: 'awaken_mei'
  },
  zero: {
    awakenedName: '觉醒·赛罗',
    passive: [{ stat: 'attack', kind: 'percent', value: 0.10 }],
    abilityId: 'awaken_zero'
  },
  healer: {
    awakenedName: '觉醒·艾拉',
    passive: [{ stat: 'maxHp', kind: 'percent', value: 0.15 }],
    abilityId: 'awaken_healer'
  },
  apprentice: {
    awakenedName: '觉醒·小米',
    passive: [
      { stat: 'defense', kind: 'percent', value: 0.10 },
      { stat: 'attack', kind: 'percent', value: 0.05 }
    ],
    abilityId: 'awaken_apprentice'
  }
};