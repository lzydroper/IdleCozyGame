/**
 * gameplay 域类型（config-json-migration 批次②）：后勤设施与种植/工坊共享的形状声明。
 */
import type { GameArt } from './art.types';
import type { UpgradeLevel, UnlockRequirement } from '../../types/config';
import type { FACILITIES_CONFIG } from '../loaders/shelter.loader';

/**
 * 设备种类单一真相源 = facilities.json 的键集合（新增设备零代码改动）。
 * ⚠️ 该表必须保持键控 map 形态、不得改为行数组——TS 无法从 json 数组提取字面量 id，
 * 误翻数组时此类型退化为 never 并在编译期大面积报错（有意为之的 tripwire）。
 */
export type FacilityType = Extract<keyof typeof FACILITIES_CONFIG, string>;

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
  icon: GameArt;                   // 装配后解析（loader 经 mappings/artMap 解析 json icon 字符串）
  effectLabel: string;             // 升级效果标签（如「效率」）
  levels: UpgradeLevel[];          // 升级等级表（单一真相源）；最高等级由 levels 推导（getMaxUpgradeLevel）
  expansion: FacilityExpansionConfig;
  unlockRequirements?: UnlockRequirement[]; // 解锁条件（满足后才在产线/基建 tab 显示；缺省无条件）
}
