import type { ModifierKey } from '../systems/passiveModifiers';

export interface PassiveEffect {
  modifier: ModifierKey;
  adjustment: number;
  operator: 'add' | 'mul';
  condition?: 'rescued' | 'assigned';
}

export interface CostFormula {
  multiply: number;
  offset: number;
}

export interface UpgradeEffect {
  type: string;
  baseValue: number;
  increment: number;
}

export interface UpgradePath {
  id: string;
  name: string;
  description: string;
  maxLevel: number;
  costFormula: CostFormula;
  effects: UpgradeEffect[];
}
