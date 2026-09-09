// 英雄展示常量（config-json-migration 批次① 自 data/heroes.ts 与 data/heroGrowth.ts 抽取）。
import type { HeroClass, HeroFaction } from '../../types/game';
import type { PrimaryAttributes } from '../../state/statSystem';

export const HERO_CLASS_LABELS: Record<HeroClass, string> = {
  guardian: '守护者',
  attacker: '进攻者',
  conductor: '协奏者'
};

export const HERO_FACTION_LABELS: Record<HeroFaction, string> = {
  arcane: '奥术',
  mechanical: '机械',
  nightmare: '梦魇',
  spirit: '英灵',
  astral: '星界',
  soulseal: '魂印'
};

export const HERO_CLASS_COLORS: Record<HeroClass, string> = {
  guardian: 'text-sky-400 border-sky-500/40 bg-sky-950/40',
  attacker: 'text-rose-400 border-rose-500/40 bg-rose-950/40',
  conductor: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40'
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
