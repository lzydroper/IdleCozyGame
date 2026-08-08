import type { HeroFaction } from '../types/game';
import type { StatModifier } from '../state/statSystem';

// 羁绊配置（ticket 09）：队伍构筑策略层 —— 特定英雄组合 / 阵营条件上阵触发数值加成，
// 生效于战斗数值，由 state/bonds.ts 计算，combat.ts 应用。
// 新增内容只需在此追加配置，无需改动战斗逻辑。

export interface BondConfig {
  id: string;
  name: string;
  description: string;
  heroes: string[];                            // 必须同时上阵的英雄（可空：纯阵营条件）
  factions: Partial<Record<HeroFaction, number>>; // 阵营要求：该阵营至少 N 名上阵（可空：纯英雄组合）
  bonus: StatModifier[];                      // 触发后给予的加成数值（修饰符）
}

export const BONDS: BondConfig[] = [
  {
    id: 'mechanical_partners',
    name: '机械搭档',
    description: '诺娃与罗伊同为机械阵营，配合让魔导设施过载运转，攻势更凌厉。',
    heroes: ['nova', 'roy'],
    factions: {},
    bonus: [{ stat: 'attack', kind: 'percent', value: 0.10 }]
  },
  {
    id: 'arcane_resonance',
    name: '奥术共鸣',
    description: '两名奥术阵营英雄的魔力同频共振，生命上限提升。',
    heroes: [],
    factions: { arcane: 2 },
    bonus: [{ stat: 'maxHp', kind: 'percent', value: 0.10 }]
  },
  {
    id: 'wasteland_guardians',
    name: '废土守护',
    description: '星界清道夫与英灵铁卫并肩而立，构筑坚实的防线。',
    heroes: ['buster', 'soldier'],
    factions: {},
    bonus: [{ stat: 'defense', kind: 'percent', value: 0.10 }]
  }
];
