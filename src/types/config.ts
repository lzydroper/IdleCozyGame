import type { ModifierKey } from '../systems/passiveModifiers';

export interface CropConfig {
  id: string;
  name: string;
  growthTime: number;
  yields: Record<string, number>;
  seedCost: Record<string, number>;
  description: string;
  image?: string;
}

export interface PassiveEffect {
  modifier: ModifierKey;
  adjustment: number;
  operator: 'add' | 'mul';
  condition?: 'rescued' | 'assigned';
}

export interface UpgradeLevel {
  level: number;
  cost: Record<string, number>; // Materials needed to reach this level
  effectValue: number;          // The value of the main effect at this level
  effectText: string;           // Formatted text description of the effect (e.g. "13.0h", "0.90 能量/分")
}

export interface UpgradePath {
  id: string;
  name: string;
  description: string;
  maxLevel: number;
  category: 'base' | 'facility';
  effectLabel: string;          // Label describing the effect (e.g. "离线最大挂机续航时间")
  levels: UpgradeLevel[];
}
