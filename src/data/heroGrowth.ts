// 英雄成长配置（16 号，08 决策 D1/D4）：职阶基础成长系数 + 英雄级里程碑加成 + 元属性作用说明。
// 每级成长唯一真相源：战斗计算（state/combat.ts）与详情面板（HeroDetailModal）共用本文件。
import type { HeroClass } from '../types/game';
import type { BaseAttributes, PrimaryAttributes } from '../state/statSystem';
import type { HeroConfig } from './heroes';

export interface HeroGrowthConfig {
  hpPerLevel: number;      // 每级生命成长
  attackPerLevel: number;  // 每级攻击成长
  defensePerLevel: number; // 每级防御成长
}

// 职阶基础成长系数（08 决策 D1：守护者血厚、进攻者攻高、协奏者均衡）
export const HERO_GROWTH_BY_CLASS: Record<HeroClass, HeroGrowthConfig> = {
  guardian: { hpPerLevel: 12, attackPerLevel: 2, defensePerLevel: 2 },
  attacker: { hpPerLevel: 6, attackPerLevel: 4, defensePerLevel: 1 },
  conductor: { hpPerLevel: 9, attackPerLevel: 3, defensePerLevel: 1 }
};

export const getHeroGrowth = (config: HeroConfig): HeroGrowthConfig =>
  HERO_GROWTH_BY_CLASS[config.heroClass];

// 英雄级里程碑加成（08 决策 D1）：到达指定等级一次性获得额外基础属性，如 { 10: { attack: 5 } }。
// 多档可叠加（20 级同时获得 10 级与 20 级加成）。
export const getLevelMilestoneBonus = (
  config: HeroConfig,
  level: number
): Partial<BaseAttributes> => {
  if (!config.levelMilestones) return {};
  const bonus: Partial<BaseAttributes> = {};
  Object.entries(config.levelMilestones).forEach(([lv, b]) => {
    if (level < Number(lv)) return;
    (Object.keys(b) as (keyof BaseAttributes)[]).forEach(k => {
      const v = b[k] ?? 0;
      bonus[k] = (bonus[k] ?? 0) + v;
    });
  });
  return bonus;
};

// 元属性作用说明（08 决策 D4：详情界面展示；数值与 statConfig.PRIMARY_STAT_SCALING_CONFIG 一致）
export const PRIMARY_STAT_DESCRIPTIONS: {
  key: keyof PrimaryAttributes;
  name: string;
  description: string;
}[] = [
  { key: 'strength', name: '力量 STR', description: '每点 +2 攻击、+0.5% 暴击倍率' },
  { key: 'constitution', name: '体质 CON', description: '每点 +10 生命、+1 防御' },
  { key: 'agility', name: '敏捷 AGI', description: '每点 +0.2% 暴击率、+0.1% 免暴击率' },
  { key: 'intelligence', name: '智慧 INT', description: '每点 +5 魔力、+0.5% 奥术增幅' },
  { key: 'willpower', name: '意志 WIL', description: '每点 +0.5% 负面持续减免、+0.5% 负面数值减免' },
  { key: 'transcendence', name: '超越 TRA', description: '每点 +0.3% 冷却减免' }
];
