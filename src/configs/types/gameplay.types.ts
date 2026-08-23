/**
 * gameplay 域类型（config-json-migration 批次②）：后勤设施与种植/工坊共享的形状声明。
 * FacilityType 为显式 union——新增设备种类时在此追加（json key 与之保持一致）。
 */
import type { LucideIcon } from 'lucide-react';
import type { UpgradeLevel, UnlockRequirement } from '../../types/config';

export type FacilityType = 'smelter' | 'assembler';

export interface FacilityExpansionConfig {
  maxUnits: number;
  costs: Record<string, number>[];   // costs[i] = 扩建第 i+2 台的费用
  durations: number[];               // durations[i] = 扩建第 i+2 台的施工耗时（秒）
}

export interface FacilityConfig {
  id: string;
  name: string;
  shortName?: string;              // 徽章等紧凑场景短标签（如「熔炉」）；缺省回退 name
  description?: string;
  icon: LucideIcon;                // 装配后注入（loader 经 mappings/iconMap 解析 iconKey）
  iconKey?: string;                // json 侧图标键
  effectLabel: string;             // 升级效果标签（如「效率」）
  levels: UpgradeLevel[];          // 升级等级表（单一真相源）；最高等级由 levels 推导（getMaxUpgradeLevel）
  expansion: FacilityExpansionConfig;
  unlockRequirements?: UnlockRequirement[]; // 解锁条件（满足后才在产线/基建 tab 显示；缺省无条件）
}
