/**
 * 装备系统类型（config-json-migration 批次④ 收口）。
 */
import type { EquipmentSlot, HeroFaction } from '../../types/game';
import type { StatModifier } from '../../state/statSystem';
import type { AbilityConfig } from '../../state/abilityTypes';

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
  /** json 侧 icon 字符串（本域保持原始值不解析；背包条目由 items.loader 经 artMap 解析） */
  icon?: string;
}

// 套装特效档位：同系列穿戴装备强化总和达到阈值即触发（可叠加）
export interface SetTierEffect {
  threshold: number;          // 10 / 20 / 30
  bonus: StatModifier[];      // 百分比加成（战斗内生效；文案由 formatModifiers 自动导出）
}

// 套装被动（heroes-skills 工单 06）：一套最多一条；三槽穿齐同系列才出现；
// 数值随强化线性（短板定值）：S = 1 + enhanceGrowth × min(三件 enhance)，装配期烘焙进公式叶。
export interface SetPassiveDef {
  id: string;
  /** 引用全局能力注册表（与 ability 二选一，guard 强制互斥）。 */
  abilityId?: string;
  /** 内联 passive 能力本体（activation 必须为 passive）。 */
  ability?: AbilityConfig;
  /** 每点最低强化的强度系数增量（缺省 = 不随强化成长）。 */
  enhanceGrowth?: number;
}

export interface EquipmentSetConfig {
  id: string;
  name: string;
  faction: HeroFaction;       // 系列所属阵营
  factionLabel: string;       // 阵营展示 Label
  tierEffects: SetTierEffect[];
  mythicAffix: StatModifier[];   // 系列共有词条：穿戴任意神话装备即生效（百分比；文案由 formatModifiers 导出）
  passiveSkills?: SetPassiveDef[]; // 套装被动定义（v1 至多一条）
}
