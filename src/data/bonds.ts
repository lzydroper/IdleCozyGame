import type { HeroFaction } from '../types/game';

// 羁绊配置（ticket 09）：队伍构筑策略层 —— 特定英雄组合 / 阵营条件上阵触发数值加成，
// 生效于战斗数值（攻击/防御/生命），由 state/bonds.ts 计算，combat.ts 应用。
// 新增内容只需在此追加配置，无需改动战斗逻辑。

// 战斗数值加成（百分比，叠加求和）
export interface CombatBonus {
  attackPercent?: number;   // 攻击力 +x%
  defensePercent?: number;  // 防御力 +x%
  maxHpPercent?: number;    // 生命上限 +x%（战斗中按同比例缩放当前血量）
}

export interface BondConfig {
  id: string;
  name: string;
  description: string;
  heroes: string[];                            // 必须同时上阵的英雄（可空：纯阵营条件）
  factions: Partial<Record<HeroFaction, number>>; // 阵营要求：该阵营至少 N 名上阵（可空：纯英雄组合）
  bonus: CombatBonus;                          // 触发后给予的加成数值
}

export const BONDS: BondConfig[] = [
  {
    id: 'mechanical_partners',
    name: '机械搭档',
    description: '诺娃与罗伊同为机械阵营，配合让魔导设施过载运转，攻势更凌厉。',
    heroes: ['nova', 'roy'],
    factions: {},
    bonus: { attackPercent: 10 }
  },
  {
    id: 'arcane_resonance',
    name: '奥术共鸣',
    description: '两名奥术阵营英雄的魔力同频共振，生命上限提升。',
    heroes: [],
    factions: { arcane: 2 },
    bonus: { maxHpPercent: 10 }
  },
  {
    id: 'wasteland_guardians',
    name: '废土守护',
    description: '星界清道夫与英灵铁卫并肩而立，构筑坚实的防线。',
    heroes: ['buster', 'soldier'],
    factions: {},
    bonus: { defensePercent: 10 }
  }
];

// 加成数值 → 展示文案（UI 共用）
export const formatBonus = (bonus: CombatBonus): string => {
  const parts: string[] = [];
  if (bonus.attackPercent) parts.push(`攻击 +${bonus.attackPercent}%`);
  if (bonus.defensePercent) parts.push(`防御 +${bonus.defensePercent}%`);
  if (bonus.maxHpPercent) parts.push(`生命 +${bonus.maxHpPercent}%`);
  return parts.join('、');
};
