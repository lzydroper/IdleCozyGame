import type { HeroClass, HeroFaction } from '../types/game';

// 英雄配置：静态档案（职阶/阵营/基础属性），运行时状态见 GameState.heroes
export interface HeroConfig {
  id: string;
  name: string;
  emoji: string;
  heroClass: HeroClass;
  faction: HeroFaction;
  baseHp: number;      // 初始占位数值，战斗系统（ticket 05）落地时调整
  baseAttack: number;
  baseDefense: number;
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
 * 英雄配置表：现有 9 位幸存者按职阶映射纳入英雄系统（ADR-0005）。
 * 职阶映射：守护者 = 铁卫/凯瑟琳；进攻者 = 巴斯特/诺娃；协奏者 = 罗伊/阿梅/赛罗/艾拉/小米。
 * 阵营为内容分配（可调），后续羁绊/阵营系统（ticket 09）将读取本字段。
 */
export const HEROES_CONFIG: Record<string, HeroConfig> = {
  nova: {
    id: 'nova',
    name: '诺娃',
    emoji: '☄️',
    heroClass: 'attacker',
    faction: 'mechanical',
    baseHp: 100,
    baseAttack: 35,
    baseDefense: 8,
    backstory: '前联合防卫军魔导机甲的备用驾驶员，擅长让魔导设施过载运转。'
  },
  buster: {
    id: 'buster',
    name: '巴斯特',
    emoji: '🦾',
    heroClass: 'attacker',
    faction: 'astral',
    baseHp: 110,
    baseAttack: 32,
    baseDefense: 10,
    backstory: '在废土中行走了二十年的清道夫硬汉，能从垃圾堆里淘出核心部件。'
  },
  soldier: {
    id: 'soldier',
    name: '铁卫',
    emoji: '🛡️',
    heroClass: 'guardian',
    faction: 'spirit',
    baseHp: 160,
    baseAttack: 15,
    baseDefense: 16,
    backstory: '避难所防御队长，擅长防御部署与阵地战。'
  },
  catherine: {
    id: 'catherine',
    name: '凯瑟琳',
    emoji: '🩺',
    heroClass: 'guardian',
    faction: 'nightmare',
    baseHp: 150,
    baseAttack: 15,
    baseDefense: 15,
    backstory: '前辐射防治所主任，常年镇守边陲、熟悉梦魇的侵蚀手段。'
  },
  roy: {
    id: 'roy',
    name: '罗伊',
    emoji: '🔧',
    heroClass: 'conductor',
    faction: 'mechanical',
    baseHp: 115,
    baseAttack: 20,
    baseDefense: 12,
    backstory: '前废土矿山工程师，擅长修理各种机械设备。'
  },
  mei: {
    id: 'mei',
    name: '阿梅',
    emoji: '🌾',
    heroClass: 'conductor',
    faction: 'arcane',
    baseHp: 120,
    baseAttack: 18,
    baseDefense: 10,
    backstory: '对变异植物了如指掌的农学家，以魔法作物滋养队伍。'
  },
  zero: {
    id: 'zero',
    name: '赛罗',
    emoji: '🏃',
    heroClass: 'conductor',
    faction: 'soulseal',
    baseHp: 110,
    baseAttack: 22,
    baseDefense: 9,
    backstory: '废土信使，沿途留下魂印标记，熟悉所有地形与危险区域。'
  },
  healer: {
    id: 'healer',
    name: '艾拉',
    emoji: '⚗️',
    heroClass: 'conductor',
    faction: 'arcane',
    baseHp: 115,
    baseAttack: 16,
    baseDefense: 11,
    backstory: '精通净化药剂调配的药剂师，以奥术药剂维系队伍续航。'
  },
  apprentice: {
    id: 'apprentice',
    name: '小米',
    emoji: '🔧',
    heroClass: 'conductor',
    faction: 'astral',
    baseHp: 108,
    baseAttack: 19,
    baseDefense: 10,
    backstory: '在废土中长大的拾荒学徒，星野之间练就了一双巧手。'
  }
};

// 开局固定赠送的初始英雄（第一位同伴，可重复抽取）
export const STARTER_HERO_ID = 'nova';
