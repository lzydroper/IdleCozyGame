import type { LucideIcon } from 'lucide-react';
import { Flame, Cpu } from 'lucide-react';
import type { UpgradeLevel } from '../types/config';

// 产线设备配置表（生产 rework issue 05：数据驱动设备注册）
// 每类设备内聚：名称 / 图标 / 升级等级表（含耗时）/ 扩建（上限、费用、耗时）。
// FacilityType 由配置表 key 推导（satisfies 保留字面量推导，类型安全不丢）；
// 新增设备种类 = 本表一条 + AUTO_RECIPES 配方一条，其余（升级/扩建入口、产线/基建 UI、
// 驻守加成作用域、存档归一化、初始状态生成）全部自动生效。

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
  icon: LucideIcon;                // GameIcon upgrade 注册（与 SHELTER_UPGRADES.icon 兼容）
  maxLevel: number;
  effectLabel: string;             // 升级效果标签（如「效率」）
  levels: UpgradeLevel[];          // 升级等级表：复用 cost/effectValue/effectText/duration
  expansion: FacilityExpansionConfig;
}

export const FACILITIES_CONFIG = {
  smelter: {
    id: 'smelter',
    name: '魔导冶炼炉',
    shortName: '熔炉',
    description: '自动熔炼金属（队列容量 = 等级）',
    icon: Flame,
    maxLevel: 5,
    effectLabel: '效率',
    // 长节奏耗时：30m → 24h
    levels: [
      { level: 1, cost: {}, effectValue: 0.1, effectText: '效率 +10%，队列 1', duration: 0 },
      { level: 2, cost: { scrap_metal: 20 }, effectValue: 0.2, effectText: '效率 +20%，队列 2', duration: 1800 },
      { level: 3, cost: { scrap_metal: 40 }, effectValue: 0.3, effectText: '效率 +30%，队列 3', duration: 7200 },
      { level: 4, cost: { scrap_metal: 60 }, effectValue: 0.4, effectText: '效率 +40%，队列 4', duration: 28800 },
      { level: 5, cost: { scrap_metal: 80 }, effectValue: 0.5, effectText: '效率 +50%，队列 5', duration: 86400 }
    ] as UpgradeLevel[],
    // 扩建（ticket 13）：同一类型设施可扩建多台并行运转；第 2 台 1h / 第 3 台 6h
    expansion: {
      maxUnits: 3,
      costs: [
        { scrap_metal: 40 },
        { scrap_metal: 120 }
      ],
      durations: [
        3600,
        21600
      ]
    }
  },
  assembler: {
    id: 'assembler',
    name: '微型芯片组装台',
    shortName: '组装台',
    description: '自动组装物品（队列容量 = 等级）',
    icon: Cpu,
    maxLevel: 5,
    effectLabel: '效率',
    // 长节奏耗时：30m → 24h
    levels: [
      { level: 1, cost: {}, effectValue: 0.1, effectText: '效率 +10%，队列 1', duration: 0 },
      { level: 2, cost: { scrap_metal: 20 }, effectValue: 0.2, effectText: '效率 +20%，队列 2', duration: 1800 },
      { level: 3, cost: { scrap_metal: 40 }, effectValue: 0.3, effectText: '效率 +30%，队列 3', duration: 7200 },
      { level: 4, cost: { scrap_metal: 60 }, effectValue: 0.4, effectText: '效率 +40%，队列 4', duration: 28800 },
      { level: 5, cost: { scrap_metal: 80 }, effectValue: 0.5, effectText: '效率 +50%，队列 5', duration: 86400 }
    ] as UpgradeLevel[],
    expansion: {
      maxUnits: 3,
      costs: [
        { scrap_metal: 40 },
        { scrap_metal: 120 }
      ],
      durations: [
        3600,
        21600
      ]
    }
  }
} satisfies Record<string, FacilityConfig>;

// 设施类型由配置表推导：新增设备种类 = 配置表加一条，联合类型自动扩展
export type FacilityType = keyof typeof FACILITIES_CONFIG;

// 类型守卫：运行时校验字符串是否为已注册的设施类型（升级/扩建 key 解析、存档归一化共用）
export const isFacilityType = (t: string): t is FacilityType => t in FACILITIES_CONFIG;
