import type { UpgradePath } from '../types/config';
import { Battery, Zap, RefreshCw, Flame, Cpu, Sprout } from 'lucide-react';

export const SHELTER_UPGRADES: Record<string, UpgradePath> = {
  battery: {
    id: 'battery',
    name: '蓄电池',
    description: '延长离线收益结算上限',
    maxLevel: 10,
    category: 'base',
    effectLabel: '离线最大挂机续航时间',
    icon: Battery,
    // 长节奏耗时（ADR-2025）：1h → 48h 递增，离线 4h 上限内早期升级可离线完成
    levels: [
      { level: 1, cost: {}, effectValue: 14400, effectText: '4.0h', duration: 0 },
      { level: 2, cost: { scrap_metal: 20 }, effectValue: 18000, effectText: '5.0h', duration: 3600 },
      { level: 3, cost: { scrap_metal: 30 }, effectValue: 21600, effectText: '6.0h', duration: 7200 },
      { level: 4, cost: { scrap_metal: 40 }, effectValue: 25200, effectText: '7.0h', duration: 14400 },
      { level: 5, cost: { scrap_metal: 50 }, effectValue: 28800, effectText: '8.0h', duration: 28800 },
      { level: 6, cost: { scrap_metal: 60 }, effectValue: 32400, effectText: '9.0h', duration: 43200 },
      { level: 7, cost: { scrap_metal: 70 }, effectValue: 36000, effectText: '10.0h', duration: 64800 },
      { level: 8, cost: { scrap_metal: 80 }, effectValue: 39600, effectText: '11.0h', duration: 86400 },
      { level: 9, cost: { scrap_metal: 90 }, effectValue: 43200, effectText: '12.0h', duration: 129600 },
      { level: 10, cost: { scrap_metal: 100 }, effectValue: 46800, effectText: '13.0h', duration: 172800 }
    ]
  },
  generator: {
    id: 'generator',
    name: '魔导发电机',
    description: '离线自动恢复魔能',
    maxLevel: 10,
    category: 'base',
    effectLabel: '能量凝结率',
    icon: Zap,
    // 长节奏耗时：30m → 48h 递增
    levels: [
      { level: 0, cost: {}, effectValue: 0, effectText: '已停机', duration: 0 },
      { level: 1, cost: { scrap_metal: 15 }, effectValue: 0.005, effectText: '0.30 能量/分', duration: 1800 },
      { level: 2, cost: { scrap_metal: 30 }, effectValue: 0.010, effectText: '0.60 能量/分', duration: 3600 },
      { level: 3, cost: { scrap_metal: 45 }, effectValue: 0.015, effectText: '0.90 能量/分', duration: 7200 },
      { level: 4, cost: { scrap_metal: 60 }, effectValue: 0.020, effectText: '1.20 能量/分', duration: 14400 },
      { level: 5, cost: { scrap_metal: 75 }, effectValue: 0.025, effectText: '1.50 能量/分', duration: 28800 },
      { level: 6, cost: { scrap_metal: 90 }, effectValue: 0.030, effectText: '1.80 能量/分', duration: 43200 },
      { level: 7, cost: { scrap_metal: 105 }, effectValue: 0.035, effectText: '2.10 能量/分', duration: 64800 },
      { level: 8, cost: { scrap_metal: 120 }, effectValue: 0.040, effectText: '2.40 能量/分', duration: 86400 },
      { level: 9, cost: { scrap_metal: 135 }, effectValue: 0.045, effectText: '2.70 能量/分', duration: 129600 },
      { level: 10, cost: { scrap_metal: 150 }, effectValue: 0.050, effectText: '3.00 能量/分', duration: 172800 }
    ]
  },
  recycler: {
    id: 'recycler',
    name: '物资自动回收站',
    description: '离线自动收集废旧金属',
    maxLevel: 10,
    category: 'base',
    effectLabel: '废铁提炼率',
    icon: RefreshCw,
    // 长节奏耗时：30m → 48h 递增
    levels: [
      { level: 0, cost: {}, effectValue: 0, effectText: '已停机', duration: 0 },
      { level: 1, cost: { scrap_metal: 15 }, effectValue: 0.002, effectText: '0.12 废铁/分', duration: 1800 },
      { level: 2, cost: { scrap_metal: 30 }, effectValue: 0.004, effectText: '0.24 废铁/分', duration: 3600 },
      { level: 3, cost: { scrap_metal: 45 }, effectValue: 0.006, effectText: '0.36 废铁/分', duration: 7200 },
      { level: 4, cost: { scrap_metal: 60 }, effectValue: 0.008, effectText: '0.48 废铁/分', duration: 14400 },
      { level: 5, cost: { scrap_metal: 75 }, effectValue: 0.010, effectText: '0.60 废铁/分', duration: 28800 },
      { level: 6, cost: { scrap_metal: 90 }, effectValue: 0.012, effectText: '0.72 废铁/分', duration: 43200 },
      { level: 7, cost: { scrap_metal: 105 }, effectValue: 0.014, effectText: '0.84 废铁/分', duration: 64800 },
      { level: 8, cost: { scrap_metal: 120 }, effectValue: 0.016, effectText: '0.96 废铁/分', duration: 86400 },
      { level: 9, cost: { scrap_metal: 135 }, effectValue: 0.018, effectText: '1.08 废铁/分', duration: 129600 },
      { level: 10, cost: { scrap_metal: 150 }, effectValue: 0.020, effectText: '1.20 废铁/分', duration: 172800 }
    ]
  },
  smelter: {
    id: 'smelter',
    name: '魔导冶炼炉',
    description: '自动熔炼金属（队列容量 = 等级）',
    maxLevel: 5,
    category: 'facility',
    effectLabel: '效率',
    icon: Flame,
    // 长节奏耗时：30m → 24h
    levels: [
      { level: 1, cost: {}, effectValue: 0.1, effectText: '效率 +10%，队列 1', duration: 0 },
      { level: 2, cost: { scrap_metal: 20 }, effectValue: 0.2, effectText: '效率 +20%，队列 2', duration: 1800 },
      { level: 3, cost: { scrap_metal: 40 }, effectValue: 0.3, effectText: '效率 +30%，队列 3', duration: 7200 },
      { level: 4, cost: { scrap_metal: 60 }, effectValue: 0.4, effectText: '效率 +40%，队列 4', duration: 28800 },
      { level: 5, cost: { scrap_metal: 80 }, effectValue: 0.5, effectText: '效率 +50%，队列 5', duration: 86400 }
    ]
  },
  assembler: {
    id: 'assembler',
    name: '微型芯片组装台',
    description: '自动组装物品（队列容量 = 等级）',
    maxLevel: 5,
    category: 'facility',
    effectLabel: '效率',
    icon: Cpu,
    // 长节奏耗时：30m → 24h
    levels: [
      { level: 1, cost: {}, effectValue: 0.1, effectText: '效率 +10%，队列 1', duration: 0 },
      { level: 2, cost: { scrap_metal: 20 }, effectValue: 0.2, effectText: '效率 +20%，队列 2', duration: 1800 },
      { level: 3, cost: { scrap_metal: 40 }, effectValue: 0.3, effectText: '效率 +30%，队列 3', duration: 7200 },
      { level: 4, cost: { scrap_metal: 60 }, effectValue: 0.4, effectText: '效率 +40%，队列 4', duration: 28800 },
      { level: 5, cost: { scrap_metal: 80 }, effectValue: 0.5, effectText: '效率 +50%，队列 5', duration: 86400 }
    ]
  },
  greenhouse_dock: {
    id: 'greenhouse_dock',
    name: '温室智能扩展坞',
    description: '扩建温室培养槽（原工坊建筑配方迁移至基建）',
    maxLevel: 2,
    category: 'base',
    effectLabel: '培养槽上限',
    icon: Sprout,
    // 等级由已解锁槽位推导：(unlockedSlotsCount - 4) / 2；旧存档按槽位自动换算，无需迁移
    // 长节奏耗时：Lv1 2h / Lv2 12h
    levels: [
      { level: 0, cost: {}, effectValue: 4, effectText: '4 槽（初始）', duration: 0 },
      { level: 1, cost: { scrap_metal: 50, alloy_plate: 10, plasma_cell: 2, mana_dust: 5 }, effectValue: 6, effectText: '6 槽', duration: 7200 },
      { level: 2, cost: { scrap_metal: 100, alloy_plate: 20, plasma_cell: 4, mana_dust: 10 }, effectValue: 8, effectText: '8 槽（上限）', duration: 43200 }
    ]
  }
};

// 产线扩建（ticket 13）：同一类型设施可扩建多台并行运转；costs[i] = 扩建第 i+2 台的费用
// durations[i] = 扩建第 i+2 台的施工耗时（秒），长节奏设定（第 2 台 1h / 第 3 台 6h）
export const FACILITY_EXPANSION: Record<'smelter' | 'assembler', { maxUnits: number; costs: Record<string, number>[]; durations: number[] }> = {
  smelter: {
    maxUnits: 3,
    costs: [
      { scrap_metal: 40 },
      { scrap_metal: 120 }
    ],
    durations: [
      3600,
      21600
    ]
  },
  assembler: {
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
};
