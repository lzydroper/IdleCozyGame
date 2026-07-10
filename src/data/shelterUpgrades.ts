import type { UpgradePath } from '../types/config';

export const SHELTER_UPGRADES: Record<string, UpgradePath> = {
  battery: {
    id: 'battery',
    name: '蓄电池',
    description: '延长离线收益结算上限',
    maxLevel: 10,
    category: 'base',
    effectLabel: '离线最大挂机续航时间',
    levels: [
      { level: 1, cost: {}, effectValue: 14400, effectText: '4.0h' },
      { level: 2, cost: { scrap_metal: 20 }, effectValue: 18000, effectText: '5.0h' },
      { level: 3, cost: { scrap_metal: 30 }, effectValue: 21600, effectText: '6.0h' },
      { level: 4, cost: { scrap_metal: 40 }, effectValue: 25200, effectText: '7.0h' },
      { level: 5, cost: { scrap_metal: 50 }, effectValue: 28800, effectText: '8.0h' },
      { level: 6, cost: { scrap_metal: 60 }, effectValue: 32400, effectText: '9.0h' },
      { level: 7, cost: { scrap_metal: 70 }, effectValue: 36000, effectText: '10.0h' },
      { level: 8, cost: { scrap_metal: 80 }, effectValue: 39600, effectText: '11.0h' },
      { level: 9, cost: { scrap_metal: 90 }, effectValue: 43200, effectText: '12.0h' },
      { level: 10, cost: { scrap_metal: 100 }, effectValue: 46800, effectText: '13.0h' }
    ]
  },
  generator: {
    id: 'generator',
    name: '魔导发电机',
    description: '离线自动恢复魔能',
    maxLevel: 10,
    category: 'base',
    effectLabel: '能量凝结率',
    levels: [
      { level: 0, cost: {}, effectValue: 0, effectText: '已停机' },
      { level: 1, cost: { scrap_metal: 15 }, effectValue: 0.005, effectText: '0.30 能量/分' },
      { level: 2, cost: { scrap_metal: 30 }, effectValue: 0.010, effectText: '0.60 能量/分' },
      { level: 3, cost: { scrap_metal: 45 }, effectValue: 0.015, effectText: '0.90 能量/分' },
      { level: 4, cost: { scrap_metal: 60 }, effectValue: 0.020, effectText: '1.20 能量/分' },
      { level: 5, cost: { scrap_metal: 75 }, effectValue: 0.025, effectText: '1.50 能量/分' },
      { level: 6, cost: { scrap_metal: 90 }, effectValue: 0.030, effectText: '1.80 能量/分' },
      { level: 7, cost: { scrap_metal: 105 }, effectValue: 0.035, effectText: '2.10 能量/分' },
      { level: 8, cost: { scrap_metal: 120 }, effectValue: 0.040, effectText: '2.40 能量/分' },
      { level: 9, cost: { scrap_metal: 135 }, effectValue: 0.045, effectText: '2.70 能量/分' },
      { level: 10, cost: { scrap_metal: 150 }, effectValue: 0.050, effectText: '3.00 能量/分' }
    ]
  },
  recycler: {
    id: 'recycler',
    name: '物资自动回收站',
    description: '离线自动收集废旧金属',
    maxLevel: 10,
    category: 'base',
    effectLabel: '废铁提炼率',
    levels: [
      { level: 0, cost: {}, effectValue: 0, effectText: '已停机' },
      { level: 1, cost: { scrap_metal: 15 }, effectValue: 0.002, effectText: '0.12 废铁/分' },
      { level: 2, cost: { scrap_metal: 30 }, effectValue: 0.004, effectText: '0.24 废铁/分' },
      { level: 3, cost: { scrap_metal: 45 }, effectValue: 0.006, effectText: '0.36 废铁/分' },
      { level: 4, cost: { scrap_metal: 60 }, effectValue: 0.008, effectText: '0.48 废铁/分' },
      { level: 5, cost: { scrap_metal: 75 }, effectValue: 0.010, effectText: '0.60 废铁/分' },
      { level: 6, cost: { scrap_metal: 90 }, effectValue: 0.012, effectText: '0.72 废铁/分' },
      { level: 7, cost: { scrap_metal: 105 }, effectValue: 0.014, effectText: '0.84 废铁/分' },
      { level: 8, cost: { scrap_metal: 120 }, effectValue: 0.016, effectText: '0.96 废铁/分' },
      { level: 9, cost: { scrap_metal: 135 }, effectValue: 0.018, effectText: '1.08 废铁/分' },
      { level: 10, cost: { scrap_metal: 150 }, effectValue: 0.020, effectText: '1.20 废铁/分' }
    ]
  },
  smelter: {
    id: 'smelter',
    name: '魔导冶炼炉',
    description: '自动熔炼金属',
    maxLevel: 5,
    category: 'facility',
    effectLabel: '效率',
    levels: [
      { level: 1, cost: {}, effectValue: 0.1, effectText: '效率 +10%' },
      { level: 2, cost: { scrap_metal: 20 }, effectValue: 0.2, effectText: '效率 +20%' },
      { level: 3, cost: { scrap_metal: 40 }, effectValue: 0.3, effectText: '效率 +30%' },
      { level: 4, cost: { scrap_metal: 60 }, effectValue: 0.4, effectText: '效率 +40%' },
      { level: 5, cost: { scrap_metal: 80 }, effectValue: 0.5, effectText: '效率 +50%' }
    ]
  },
  assembler: {
    id: 'assembler',
    name: '微型芯片组装台',
    description: '自动组装物品',
    maxLevel: 5,
    category: 'facility',
    effectLabel: '效率',
    levels: [
      { level: 1, cost: {}, effectValue: 0.1, effectText: '效率 +10%' },
      { level: 2, cost: { scrap_metal: 20 }, effectValue: 0.2, effectText: '效率 +20%' },
      { level: 3, cost: { scrap_metal: 40 }, effectValue: 0.3, effectText: '效率 +30%' },
      { level: 4, cost: { scrap_metal: 60 }, effectValue: 0.4, effectText: '效率 +40%' },
      { level: 5, cost: { scrap_metal: 80 }, effectValue: 0.5, effectText: '效率 +50%' }
    ]
  }
};
