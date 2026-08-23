// 升星与觉醒配置（ticket 12）：终局养成闭环。
// 升星常量已归位 configs/constants/awakeningConstants（config-json-migration 批次①）；
// 此处转发兼容存量引用，AWAKEN_CONFIG（per-hero 内容）批次③迁英雄 awaken.json。
import type { StatModifier } from '../state/statSystem';

export {
  STAR_MAX,
  starUpShardCost,
  STAR_STATS_PER_STAR,
  AWAKEN_COST
} from '../configs/constants/awakeningConstants';

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