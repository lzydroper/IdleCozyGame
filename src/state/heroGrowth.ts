/**
 * 英雄成长公式（config-json-migration 批次② 自 data/heroGrowth.ts 迁出——运行时逻辑归位 state）。
 * 数据源：职阶成长系数表 = progression.loader（json）；levelMilestones 留英雄侧（批次③ growth.json）。
 */
import type { BaseAttributes, PrimaryAttributes, SpecialAttributes, StatModifier, StatKey } from './statSystem';
import { DEFAULT_BASE_ATTRIBUTES } from '../configs/constants/statConfig';
import type { HeroConfig } from '../configs/types/entity.types';
import { HERO_GROWTH_BY_CLASS } from '../configs/loaders/progression.loader';
export interface HeroGrowthConfig {
  attackPerLevel: number;     // 基础攻击面板
  defensePerLevel: number;    // 基础防御面板
  maxHpPerLevel: number;      // 基础最大生命
  maxMpPerLevel: number;      // 基础最大魔力
  critRatePerLevel: number;   // 基础暴击率 (如 0.05 代表 5%)
  critDmgPerLevel: number;    // 基础暴击倍率 (如 1.50 代表 150%)
}

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

// 里程碑加成转为 StatModifier[]（detailed-stats-panel-rework 04）：
// 三层（base/primary/special）统一转为 flat 修饰符，每条打 source: "Lv{N}里程碑"。
// 供 combat.ts 和 HeroDetailModal 纳入 permanentModifiers，消除两处手动拆分重复代码。
export const getMilestoneModifiers = (config: HeroConfig, level: number): StatModifier[] => {
  if (!config.levelMilestones) return [];
  const mods: StatModifier[] = [];
  Object.entries(config.levelMilestones).forEach(([lv, b]) => {
    const lvNum = Number(lv);
    if (level < lvNum) return;
    const source = `Lv${lvNum}里程碑`;
    (Object.keys(b) as StatKey[]).forEach(k => {
      const v = b[k] ?? 0;
      if (v !== 0) mods.push({ stat: k, kind: 'flat', value: v, source });
    });
  });
  return mods;
};

// 英雄基础属性推导（stat-bonus-unification 统一实体；战斗与详情面板唯一真相源）：
// Lv1 种子（config.baseAttributes）+ 职阶成长 × (level-1)，返回完整六项 BaseAttributes。
// 里程碑 base 加成已转为 StatModifier（getMilestoneModifiers），走 modifier 管道统一计算。
// 纯推导：level 是唯一状态（等级不会下降 -> 基础值无需回调/持久化）。
export const heroBaseAttributes = (config: HeroConfig, level: number): BaseAttributes => {
  const g = getHeroGrowth(config);
  return {
    attack: config.baseAttributes.attack + (level - 1) * g.attackPerLevel,
    defense: config.baseAttributes.defense + (level - 1) * g.defensePerLevel,
    maxHp: config.baseAttributes.maxHp + (level - 1) * g.maxHpPerLevel,
    maxMp: (config.baseAttributes.maxMp ?? DEFAULT_BASE_ATTRIBUTES.maxMp) + (level - 1) * g.maxMpPerLevel,
    critRate: (config.baseAttributes.critRate ?? DEFAULT_BASE_ATTRIBUTES.critRate) + (level - 1) * g.critRatePerLevel,
    critDmg: (config.baseAttributes.critDmg ?? DEFAULT_BASE_ATTRIBUTES.critDmg) + (level - 1) * g.critDmgPerLevel
  };
};
