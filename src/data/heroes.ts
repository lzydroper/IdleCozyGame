import type { HeroClass, HeroFaction } from '../types/game';
import type { LucideIcon } from 'lucide-react';
import { FlaskConical, Footprints, Hammer, HandMetal, HeartPulse, Rocket, Shield, Wheat, Wrench } from 'lucide-react';
import type { ItemSprite } from './items/types';
import type { BaseAttributes, PrimaryAttributes, SpecialAttributes } from '../state/statSystem';

// 英雄后勤 Meta 属性定义：英雄驻守设施时提供的产能/速度加成
export interface HeroDutyMeta {
  facilitySpeedMultiplier?: number; // 加速设施运行 (如 0.20 = +20% 生产速度)
  facilityYieldMultiplier?: number; // 额外增加产出数量 (如 0.15 = +15% 产量)
  facilityCostReduction?: number;   // 降低配方原料消耗 (如 0.10 = -10% 原料)
}

// 英雄配置：静态档案（职阶/阵营/基础属性/元属性/里程碑/后勤Meta），运行时状态见 GameState.heroes
// 元属性与里程碑（16 号，08 决策 D2）：initialPrimary = 初始元属性（详情面板实装增益）；
// levelMilestones = 到达指定等级一次性获得的基础属性加成（英雄级差异化微调点）。
export interface HeroConfig {
  id: string;
  name: string;
  heroClass: HeroClass;
  faction: HeroFaction;
  baseHp: number;
  baseAttack: number;
  baseDefense: number;
  primaryAttributes: PrimaryAttributes;   // 初始元属性（力量/体质/敏捷/智慧/意志/超越）
  levelMilestones?: Record<number, Partial<BaseAttributes & PrimaryAttributes & SpecialAttributes>>; // 里程碑：如 { 10: { attack: 5 }, 20: { strength: 2, critRate: 0.01 } }
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
    primaryAttributes: { strength: 7, constitution: 3, agility: 3, intelligence: 6, willpower: 1, transcendence: 2 },
    levelMilestones: { 10: { attack: 5 }, 20: { critRate: 0.02 } },
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
    primaryAttributes: { strength: 8, constitution: 5, agility: 3, intelligence: 2, willpower: 2, transcendence: 2 },
    levelMilestones: { 10: { attack: 4 }, 25: { maxHp: 20 } },
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
    primaryAttributes: { strength: 4, constitution: 8, agility: 2, intelligence: 2, willpower: 4, transcendence: 2 },
    levelMilestones: { 10: { maxHp: 30 }, 20: { defense: 3 } },
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
    primaryAttributes: { strength: 2, constitution: 6, agility: 3, intelligence: 5, willpower: 6, transcendence: 1 },
    levelMilestones: { 10: { maxHp: 25 }, 20: { defense: 2 } },
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
    primaryAttributes: { strength: 4, constitution: 4, agility: 3, intelligence: 7, willpower: 2, transcendence: 3 },
    levelMilestones: { 10: { attack: 3, maxHp: 10 } },
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
    primaryAttributes: { strength: 2, constitution: 4, agility: 3, intelligence: 8, willpower: 3, transcendence: 3 },
    levelMilestones: { 10: { maxHp: 15 }, 20: { defense: 2 } },
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
    primaryAttributes: { strength: 3, constitution: 3, agility: 8, intelligence: 4, willpower: 2, transcendence: 3 },
    levelMilestones: { 10: { attack: 3 }, 20: { critRate: 0.01 } },
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
    primaryAttributes: { strength: 1, constitution: 4, agility: 3, intelligence: 7, willpower: 6, transcendence: 2 },
    levelMilestones: { 10: { maxHp: 15 }, 20: { attack: 2 } },
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
    primaryAttributes: { strength: 3, constitution: 4, agility: 4, intelligence: 5, willpower: 3, transcendence: 4 },
    levelMilestones: { 10: { attack: 2, defense: 1 } },
    dutyMeta: { facilityYieldMultiplier: 0.15, facilityCostReduction: 0.10 },
    sprite: { sheet: 'survivors', index: 8 },
    icon: Hammer,
    backstory: '在废土中长大的拾荒学徒，星野之间练就了一双巧手。'
  }
};

// 开局固定赠送的初始英雄（第一位同伴，可重复抽取）
export const STARTER_HERO_ID = 'nova';
