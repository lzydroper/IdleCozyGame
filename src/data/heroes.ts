import type { HeroClass, HeroFaction } from '../types/game';
import type { LucideIcon } from 'lucide-react';
import { FlaskConical, Footprints, Hammer, HandMetal, HeartPulse, Rocket, Shield, Wheat, Wrench } from 'lucide-react';
import type { ItemSprite } from './items/types';

// 英雄后勤 Meta 属性定义：英雄驻守设施时提供的产能/速度加成
export interface HeroDutyMeta {
  facilitySpeedMultiplier?: number; // 加速设施运行 (如 0.20 = +20% 生产速度)
  facilityYieldMultiplier?: number; // 额外增加产出数量 (如 0.15 = +15% 产量)
  facilityCostReduction?: number;   // 降低配方原料消耗 (如 0.10 = -10% 原料)
}

// 英雄配置：静态档案（职阶/阵营/基础属性/后勤Meta），运行时状态见 GameState.heroes
export interface HeroConfig {
  id: string;
  name: string;
  avatar?: string; // 英雄头像图片路径/URL（若无则备选显示首字）
  heroClass: HeroClass;
  faction: HeroFaction;
  baseHp: number;
  baseAttack: number;
  baseDefense: number;
  dutyMeta?: HeroDutyMeta; // 后勤驻守 Meta 属性
  sprite?: ItemSprite;      // 立绘雪碧图（survivors sheet，3x3）
  icon?: LucideIcon;        // Lucide 回退图标（sprite 缺失时显示）
  backstory: string;
}

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

/**
 * 英雄配置表：9 位英雄并赋予各不相同的设施后勤 Meta 属性加成。
 */
export const HEROES_CONFIG: Record<string, HeroConfig> = {
  nova: {
    id: 'nova',
    name: '诺娃',

    heroClass: 'attacker',
    faction: 'mechanical',
    baseHp: 100,
    baseAttack: 35,
    baseDefense: 8,
    dutyMeta: { facilitySpeedMultiplier: 0.25 }, // +25% 设施运行速度
    sprite: { sheet: 'survivors', index: 5 },
    icon: Rocket,
    backstory: '前联合防卫军魔导机甲的备用驾驶员，擅长让魔导设施过载运转。'
  },
  buster: {
    id: 'buster',
    name: '巴斯特',

    heroClass: 'attacker',
    faction: 'astral',
    baseHp: 110,
    baseAttack: 32,
    baseDefense: 10,
    dutyMeta: { facilityYieldMultiplier: 0.20 }, // +20% 产出数量
    sprite: { sheet: 'survivors', index: 4 },
    icon: HandMetal,
    backstory: '在废土中行走了二十年的清道夫硬汉，能从垃圾堆里淘出核心部件。'
  },
  soldier: {
    id: 'soldier',
    name: '铁卫',

    heroClass: 'guardian',
    faction: 'spirit',
    baseHp: 160,
    baseAttack: 15,
    baseDefense: 16,
    dutyMeta: { facilityCostReduction: 0.15 }, // -15% 原料消耗
    sprite: { sheet: 'survivors', index: 6 },
    icon: Shield,
    backstory: '避难所防御队长，擅长防御部署与阵地战。'
  },
  catherine: {
    id: 'catherine',
    name: '凯瑟琳',

    heroClass: 'guardian',
    faction: 'nightmare',
    baseHp: 150,
    baseAttack: 15,
    baseDefense: 15,
    dutyMeta: { facilitySpeedMultiplier: 0.15, facilityYieldMultiplier: 0.10 },
    sprite: { sheet: 'survivors', index: 3 },
    icon: HeartPulse,
    backstory: '前辐射防治所主任，常年镇守边陲、熟悉梦魇的侵蚀手段。'
  },
  roy: {
    id: 'roy',
    name: '罗伊',

    heroClass: 'conductor',
    faction: 'mechanical',
    baseHp: 115,
    baseAttack: 20,
    baseDefense: 12,
    dutyMeta: { facilitySpeedMultiplier: 0.30 }, // +30% 设施运行速度
    sprite: { sheet: 'survivors', index: 0 },
    icon: Wrench,
    backstory: '前废土矿山工程师，擅长修理各种机械设备。'
  },
  mei: {
    id: 'mei',
    name: '阿梅',

    heroClass: 'conductor',
    faction: 'arcane',
    baseHp: 120,
    baseAttack: 18,
    baseDefense: 10,
    dutyMeta: { facilityYieldMultiplier: 0.25 }, // +25% 作物/温室产出
    sprite: { sheet: 'survivors', index: 1 },
    icon: Wheat,
    backstory: '对变异植物了如指掌的农学家，以魔法作物滋养队伍。'
  },
  zero: {
    id: 'zero',
    name: '赛罗',

    heroClass: 'conductor',
    faction: 'soulseal',
    baseHp: 110,
    baseAttack: 22,
    baseDefense: 9,
    dutyMeta: { facilitySpeedMultiplier: 0.20 },
    sprite: { sheet: 'survivors', index: 2 },
    icon: Footprints,
    backstory: '废土信使，沿途留下魂印标记，熟悉所有地形与危险区域。'
  },
  healer: {
    id: 'healer',
    name: '艾拉',

    heroClass: 'conductor',
    faction: 'arcane',
    baseHp: 115,
    baseAttack: 16,
    baseDefense: 11,
    dutyMeta: { facilityCostReduction: 0.20 }, // -20% 药剂/配方消耗
    sprite: { sheet: 'survivors', index: 7 },
    icon: FlaskConical,
    backstory: '精通净化药剂调配的药剂师，以奥术药剂维系队伍续航。'
  },
  apprentice: {
    id: 'apprentice',
    name: '小米',

    heroClass: 'conductor',
    faction: 'astral',
    baseHp: 108,
    baseAttack: 19,
    baseDefense: 10,
    dutyMeta: { facilityYieldMultiplier: 0.15, facilityCostReduction: 0.10 },
    sprite: { sheet: 'survivors', index: 8 },
    icon: Hammer,
    backstory: '在废土中长大的拾荒学徒，星野之间练就了一双巧手。'
  }
};

// 开局固定赠送的初始英雄（第一位同伴，可重复抽取）
export const STARTER_HERO_ID = 'nova';
