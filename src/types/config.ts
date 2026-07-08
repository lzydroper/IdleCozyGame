export interface PassiveEffect {
  type: 'exploration_cost' | 'stat_cost' | 'item_yield' | 'max_energy' | 'craft_energy' | 'growth_speed' | 'defense_cost';
  target?: string;
  multiplier?: number;
  flatBonus?: number;
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
