// 英雄成长配置（16 号，08 决策 D1/D4）：职阶基础成长系数 + 英雄级里程碑加成 + 元属性作用说明。
// 每级成长唯一真相源：战斗计算（state/combat.ts）与详情面板（HeroDetailModal）共用本文件。
import type { HeroClass } from '../types/game';
import type { BaseAttributes, PrimaryAttributes, SpecialAttributes } from '../state/statSystem';
import { DEFAULT_BASE_ATTRIBUTES } from './statConfig';
import type { HeroConfig } from './heroes';

export interface HeroGrowthConfig {
  attackPerLevel: number;     // 基础攻击面板
  defensePerLevel: number;    // 基础防御面板
  maxHpPerLevel: number;      // 基础最大生命
  maxMpPerLevel: number;      // 基础最大魔力
  critRatePerLevel: number;   // 基础暴击率 (如 0.05 代表 5%)
  critDmgPerLevel: number;    // 基础暴击倍率 (如 1.50 代表 150%)
}

// 职阶基础成长系数（08 决策 D1：守护者血厚、进攻者攻高、协奏者均衡）
export const HERO_GROWTH_BY_CLASS: Record<HeroClass, HeroGrowthConfig> = {
  guardian: { attackPerLevel: 1, defensePerLevel: 5, maxHpPerLevel: 12, maxMpPerLevel: 3, critRatePerLevel: 0, critDmgPerLevel: 0 },
  attacker: { attackPerLevel: 3, defensePerLevel: 1, maxHpPerLevel: 3, maxMpPerLevel: 6, critRatePerLevel: 0.002, critDmgPerLevel: 0.002 },
  conductor: { attackPerLevel: 2, defensePerLevel: 2, maxHpPerLevel: 9, maxMpPerLevel: 9, critRatePerLevel: 0.001, critDmgPerLevel: 0.001 },
};

export const getHeroGrowth = (config: HeroConfig): HeroGrowthConfig =>
  HERO_GROWTH_BY_CLASS[config.heroClass];

// 英雄级里程碑加成（08 决策 D1 + stat-bonus-unification 06）：到达指定等级一次性获得三层属性加成
// （元/基础/特殊 21 项全覆盖），如 { 10: { attack: 5 }, 20: { strength: 2, critRate: 0.01 } }。
// 多档可叠加（20 级同时获得 10 级与 20 级加成）。
export const getLevelMilestoneBonus = (
  config: HeroConfig,
  level: number
): Partial<BaseAttributes & PrimaryAttributes & SpecialAttributes> => {
  if (!config.levelMilestones) return {};
  const bonus: Partial<BaseAttributes & PrimaryAttributes & SpecialAttributes> = {};
  Object.entries(config.levelMilestones).forEach(([lv, b]) => {
    if (level < Number(lv)) return;
    (Object.keys(b) as (keyof (BaseAttributes & PrimaryAttributes & SpecialAttributes))[]).forEach(k => {
      const v = b[k] ?? 0;
      bonus[k] = (bonus[k] ?? 0) + v;
    });
  });
  return bonus;
};

// 英雄基础属性推导（stat-bonus-unification 统一实体；战斗与详情面板唯一真相源）：
// Lv1 种子（config.baseAttributes）+ 职阶成长 × (level-1) + 里程碑 base 部分，返回完整六项 BaseAttributes。
// 纯推导：level 是唯一状态（等级不会下降 → 基础值无需回调/持久化）。
export const heroBaseAttributes = (config: HeroConfig, level: number): BaseAttributes => {
  const g = getHeroGrowth(config);
  const bonus = getLevelMilestoneBonus(config, level);
  return {
    attack: config.baseAttributes.attack + (level - 1) * g.attackPerLevel + (bonus.attack ?? 0),
    defense: config.baseAttributes.defense + (level - 1) * g.defensePerLevel + (bonus.defense ?? 0),
    maxHp: config.baseAttributes.maxHp + (level - 1) * g.maxHpPerLevel + (bonus.maxHp ?? 0),
    maxMp: (config.baseAttributes.maxMp ?? DEFAULT_BASE_ATTRIBUTES.maxMp) + (level - 1) * g.maxMpPerLevel + (bonus.maxMp ?? 0),
    critRate: (config.baseAttributes.critRate ?? DEFAULT_BASE_ATTRIBUTES.critRate) + (level - 1) * g.critRatePerLevel + (bonus.critRate ?? 0),
    critDmg: (config.baseAttributes.critDmg ?? DEFAULT_BASE_ATTRIBUTES.critDmg) + (level - 1) * g.critDmgPerLevel + (bonus.critDmg ?? 0)
  };
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
