// 装备系统数值常量（config-json-migration 批次① 自 data/equipment.ts 抽取）。
import type { EquipmentSlot } from '../../types/game';

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
