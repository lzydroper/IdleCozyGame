/**
 * 装备系统类型（config-json-migration 批次④ 收口）。
 */
import type { EquipmentSlot, HeroFaction } from '../../types/game';
import type { StatModifier } from '../../state/statSystem';

export interface EquipmentConfig {
  id: string;
  name: string;
  mythicName: string;         // 神话锻造后的更名
  slot: EquipmentSlot;
  set: string;                // 所属系列 id（EQUIPMENT_SETS）
  faction: HeroFaction;       // 专属阵营加成类型（同阵营英雄穿戴享受 +30% 基础加成）
  baseStats: StatModifier[];  // 0 强化时的属性（flat 修饰符）
  statPerEnhance: StatModifier[]; // 每 +1 强化增加的属性（flat 修饰符）
  source: 'workshop' | 'blueprint' | 'dreamscape' | 'boss'; // 主要获取途径（分层标注）
  blueprintId?: string;       // source === 'blueprint' 时：解锁合成所需图纸物品 id
  description: string;
}

// 套装特效档位：同系列穿戴装备强化总和达到阈值即触发（可叠加）
export interface SetTierEffect {
  threshold: number;          // 10 / 20 / 30
  bonus: StatModifier[];      // 百分比加成（战斗内生效；文案由 formatModifiers 自动导出）
}

export interface EquipmentSetConfig {
  id: string;
  name: string;
  faction: HeroFaction;       // 系列所属阵营
  factionLabel: string;       // 阵营展示 Label
  tierEffects: SetTierEffect[];
  mythicAffix: StatModifier[];   // 系列共有词条：穿戴任意神话装备即生效（百分比；文案由 formatModifiers 导出）
}
