// 装备系统配置（ticket 10）：3 槽装备 + 系列套装 + 强化（上限 +30）+ 神话锻造。
// 无品质分层，深度由「套装特效 + 神话词条」承担（ADR-0003）。
// 获取分层：工坊合成（废土）→ 图纸解锁（余烬）→ 梦境探险掉落（幽梦）→ 区域 BOSS 掉落（星核，最强）。
import type { EquipmentSlot, HeroFaction } from '../types/game';
import type { CombatBonus } from './bonds';

// 装备提供的属性（平值，直接加在英雄基础属性上）
export interface EquipmentStats {
  attack?: number;
  defense?: number;
  maxHp?: number;
}

// 装备静态配置：同一装备在背包中为普通物品（ITEMS_CONFIG），穿戴后才成为装备实例
export interface EquipmentConfig {
  id: string;
  name: string;
  mythicName: string;         // 神话锻造后的更名
  slot: EquipmentSlot;
  set: string;                // 所属系列 id（EQUIPMENT_SETS）
  faction: HeroFaction;       // 专属阵营加成类型（同阵营英雄穿戴享受 +30% 基础加成）
  baseStats: EquipmentStats;  // 0 强化时的属性
  statPerEnhance: EquipmentStats; // 每 +1 强化增加的属性
  source: 'workshop' | 'blueprint' | 'dreamscape' | 'boss'; // 主要获取途径（分层标注）
  blueprintId?: string;       // source === 'blueprint' 时：解锁合成所需图纸物品 id
  description: string;
}

// 套装特效档位：同系列穿戴装备强化总和达到阈值即触发（可叠加）
export interface SetTierEffect {
  threshold: number;          // 10 / 20 / 30
  bonus: CombatBonus;         // 百分比加成（战斗内生效）
  description: string;
}

export interface EquipmentSetConfig {
  id: string;
  name: string;
  faction: HeroFaction;       // 系列所属阵营
  factionLabel: string;       // 阵营展示 Label
  tierEffects: SetTierEffect[];
  mythicAffix: CombatBonus;   // 系列共有词条：穿戴任意神话装备即生效（百分比）
  mythicAffixText: string;
}

// === 数值常量 ===

export const ENHANCE_MAX = 30;                    // 强化上限
export const MYTHIC_STAT_MULTIPLIER = 1.5;        // 神话锻造：基础属性 ×1.5（强化等级保留）
export const FACTION_EQUIPMENT_BONUS_MULTIPLIER = 1.3; // 英雄穿戴阵营装备加成倍率 (+30%)
export const FACTION_EQUIPMENT_BONUS_PERCENT = 30;     // 阵营穿戴加成展示百分比
// 强化消耗：从 level 强化到 level+1 所需强化魔晶数量（随等级递增，可配置）
export const enhanceCost = (level: number): number => 1 + Math.floor(level / 5);
// 神话锻造消耗
export const FORGE_COST: Record<string, number> = { enhance_stone: 20, alloy_plate: 5 };

export const EQUIPMENT_SLOTS: EquipmentSlot[] = ['weapon', 'armor', 'trinket'];

export const EQUIPMENT_SLOT_LABELS: Record<EquipmentSlot, string> = {
  weapon: '武器',
  armor: '防具',
  trinket: '饰品'
};

export const EQUIPMENT_SLOT_EMOJIS: Record<EquipmentSlot, string> = {
  weapon: '🗡️',
  armor: '🛡️',
  trinket: '💍'
};

// === 系列套装 ===

export const EQUIPMENT_SETS: Record<string, EquipmentSetConfig> = {
  wasteland: {
    id: 'wasteland',
    name: '废土系列',
    faction: 'mechanical',
    factionLabel: '【机械】',
    tierEffects: [
      { threshold: 10, bonus: { attackPercent: 5 }, description: '攻击 +5%' },
      { threshold: 20, bonus: { defensePercent: 8 }, description: '防御 +8%' },
      { threshold: 30, bonus: { maxHpPercent: 10 }, description: '生命上限 +10%' }
    ],
    mythicAffix: { attackPercent: 3 },
    mythicAffixText: '神话词条：攻击 +3%'
  },
  ember: {
    id: 'ember',
    name: '余烬系列',
    faction: 'spirit',
    factionLabel: '【英灵】',
    tierEffects: [
      { threshold: 10, bonus: { attackPercent: 8 }, description: '攻击 +8%' },
      { threshold: 20, bonus: { defensePercent: 10 }, description: '防御 +10%' },
      { threshold: 30, bonus: { maxHpPercent: 15 }, description: '生命上限 +15%' }
    ],
    mythicAffix: { maxHpPercent: 5 },
    mythicAffixText: '神话词条：生命上限 +5%'
  },
  dreamveil: {
    id: 'dreamveil',
    name: '幽梦系列',
    faction: 'arcane',
    factionLabel: '【奥术】',
    tierEffects: [
      { threshold: 10, bonus: { defensePercent: 8 }, description: '防御 +8%' },
      { threshold: 20, bonus: { maxHpPercent: 10 }, description: '生命上限 +10%' },
      { threshold: 30, bonus: { attackPercent: 12 }, description: '攻击 +12%' }
    ],
    mythicAffix: { defensePercent: 5 },
    mythicAffixText: '神话词条：防御 +5%'
  },
  starcore: {
    id: 'starcore',
    name: '星核系列',
    faction: 'astral',
    factionLabel: '【星界】',
    tierEffects: [
      { threshold: 10, bonus: { attackPercent: 10 }, description: '攻击 +10%' },
      { threshold: 20, bonus: { defensePercent: 12 }, description: '防御 +12%' },
      { threshold: 30, bonus: { maxHpPercent: 18 }, description: '生命上限 +18%' }
    ],
    mythicAffix: { attackPercent: 5, defensePercent: 5 },
    mythicAffixText: '神话词条：攻击 +5%、防御 +5%'
  }
};

// === 装备配置 ===

export const EQUIPMENT_CONFIG: Record<string, EquipmentConfig> = {
  // 废土系列：工坊合成（无图纸门槛，废土边缘材料，机械阵营）
  wasteland_weapon: {
    id: 'wasteland_weapon',
    name: '废土利刃',
    mythicName: '神话·废土利刃',
    slot: 'weapon',
    set: 'wasteland',
    faction: 'mechanical',
    baseStats: { attack: 10 },
    statPerEnhance: { attack: 1 },
    source: 'workshop',
    description: '用废旧金属打磨的求生刀刃，废土猎人的第一把武器。'
  },
  wasteland_armor: {
    id: 'wasteland_armor',
    name: '废土护甲',
    mythicName: '神话·废土护甲',
    slot: 'armor',
    set: 'wasteland',
    faction: 'mechanical',
    baseStats: { defense: 6 },
    statPerEnhance: { defense: 0.6 },
    source: 'workshop',
    description: '合金板拼接的简易护甲，能挡下大部分变异生物的爪牙。'
  },
  wasteland_trinket: {
    id: 'wasteland_trinket',
    name: '废土挂饰',
    mythicName: '神话·废土挂饰',
    slot: 'trinket',
    set: 'wasteland',
    faction: 'mechanical',
    baseStats: { maxHp: 20 },
    statPerEnhance: { maxHp: 2 },
    source: 'workshop',
    description: '用荧光纤维编成的护身挂饰，寄托着废土生存者的执念。'
  },

  // 余烬系列：图纸解锁合成（blueprint_ember_armory，旧城废墟 BOSS 掉落）+ BOSS 掉落，英灵阵营
  ember_weapon: {
    id: 'ember_weapon',
    name: '余烬长刃',
    mythicName: '神话·余烬长刃',
    slot: 'weapon',
    set: 'ember',
    faction: 'spirit',
    baseStats: { attack: 16 },
    statPerEnhance: { attack: 1.5 },
    source: 'blueprint',
    blueprintId: 'blueprint_ember_armory',
    description: '旧城废墟中淬炼的长刃，刃口残留着废墟霸主的余烬。'
  },
  ember_armor: {
    id: 'ember_armor',
    name: '余烬重铠',
    mythicName: '神话·余烬重铠',
    slot: 'armor',
    set: 'ember',
    faction: 'spirit',
    baseStats: { defense: 10 },
    statPerEnhance: { defense: 0.8 },
    source: 'blueprint',
    blueprintId: 'blueprint_ember_armory',
    description: '废墟合金锻造的重铠，装甲缝隙间隐隐透出暗红火光。'
  },
  ember_trinket: {
    id: 'ember_trinket',
    name: '余烬徽记',
    mythicName: '神话·余烬徽记',
    slot: 'trinket',
    set: 'ember',
    faction: 'spirit',
    baseStats: { maxHp: 30 },
    statPerEnhance: { maxHp: 2.5 },
    source: 'blueprint',
    blueprintId: 'blueprint_ember_armory',
    description: '旧城霸主陨落后留下的徽记，佩戴者能感受到灼热的战意。'
  },

  // 幽梦系列：梦境探险掉落，奥术阵营
  dreamveil_weapon: {
    id: 'dreamveil_weapon',
    name: '幽梦短匕',
    mythicName: '神话·幽梦短匕',
    slot: 'weapon',
    set: 'dreamveil',
    faction: 'arcane',
    baseStats: { attack: 14 },
    statPerEnhance: { attack: 1.5 },
    source: 'dreamscape',
    description: '梦境深处凝结的匕首，刃身如水雾般若有若无。'
  },
  dreamveil_armor: {
    id: 'dreamveil_armor',
    name: '幽梦纱衣',
    mythicName: '神话·幽梦纱衣',
    slot: 'armor',
    set: 'dreamveil',
    faction: 'arcane',
    baseStats: { defense: 12 },
    statPerEnhance: { defense: 0.8 },
    source: 'dreamscape',
    description: '以梦境丝线织成的纱衣，能卸去大部分物理冲击。'
  },
  dreamveil_trinket: {
    id: 'dreamveil_trinket',
    name: '幽梦坠饰',
    mythicName: '神话·幽梦坠饰',
    slot: 'trinket',
    set: 'dreamveil',
    faction: 'arcane',
    baseStats: { maxHp: 35 },
    statPerEnhance: { maxHp: 2.5 },
    source: 'dreamscape',
    description: '封存着一缕梦境的坠饰，佩戴者气血循环如入梦境般绵长。'
  },

  // 星核系列：仅区域 BOSS 掉落（辐射车间，最强系列，星界阵营）
  starcore_weapon: {
    id: 'starcore_weapon',
    name: '星核神兵',
    mythicName: '神话·星核神兵',
    slot: 'weapon',
    set: 'starcore',
    faction: 'astral',
    baseStats: { attack: 22 },
    statPerEnhance: { attack: 2 },
    source: 'boss',
    description: '以失控机器核心锻造的神兵，挥动时带起星屑残影。'
  },
  starcore_armor: {
    id: 'starcore_armor',
    name: '星核甲胄',
    mythicName: '神话·星核甲胄',
    slot: 'armor',
    set: 'starcore',
    faction: 'astral',
    baseStats: { defense: 15 },
    statPerEnhance: { defense: 1 },
    source: 'boss',
    description: '镶嵌星核碎片的甲胄，防御力随核心共鸣节节攀升。'
  },
  starcore_trinket: {
    id: 'starcore_trinket',
    name: '星核圣印',
    mythicName: '神话·星核圣印',
    slot: 'trinket',
    set: 'starcore',
    faction: 'astral',
    baseStats: { maxHp: 45 },
    statPerEnhance: { maxHp: 3 },
    source: 'boss',
    description: '畸变聚合体核心凝成的圣印，蕴含磅礴的生命能量。'
  }
};

// 装备列表（UI 遍历用）
export const EQUIPMENT_LIST: EquipmentConfig[] = Object.values(EQUIPMENT_CONFIG);
