import type { UpgradePath } from '../types/config';

export const SHELTER_UPGRADES: Record<string, UpgradePath> = {
  battery: {
    id: 'battery', name: '蓄电池', description: '延长离线收益结算上限', maxLevel: 10,
    costFormula: { multiply: 10, offset: 0 },
    effects: [{ type: 'maxOfflineDuration', baseValue: 14400, increment: 3600 }]
  },
  generator: {
    id: 'generator', name: '发电机', description: '离线自动恢复魔能', maxLevel: 10,
    costFormula: { multiply: 15, offset: 1 },
    effects: [{ type: 'generatorRate', baseValue: 0.005, increment: 0.005 }]
  },
  recycler: {
    id: 'recycler', name: '回收站', description: '离线自动收集废金属', maxLevel: 10,
    costFormula: { multiply: 15, offset: 1 },
    effects: [{ type: 'recyclerRate', baseValue: 0.002, increment: 0.002 }]
  },
  smelter: {
    id: 'smelter', name: '魔导冶炼炉', description: '自动熔炼金属', maxLevel: 5,
    costFormula: { multiply: 20, offset: 0 },
    effects: [{ type: 'speedBonus', baseValue: 0.1, increment: 0.1 }]
  },
  assembler: {
    id: 'assembler', name: '微型芯片组装台', description: '自动组装物品', maxLevel: 5,
    costFormula: { multiply: 20, offset: 0 },
    effects: [{ type: 'speedBonus', baseValue: 0.1, increment: 0.1 }]
  }
};
