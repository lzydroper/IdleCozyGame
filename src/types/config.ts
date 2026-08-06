// 统一配方定义（ticket 01：手动/自动共享同一类型，字段统一 cost/reward；
// name/description 已删除，显示文案从产出物完全推导，见 state/workshop.ts 辅助函数）
import type { ItemCategory } from '../data/items';
import type { FacilityType } from './game';

export interface CropConfig {
  id: string;
  name: string;
  growthTime: number;
  yields: Record<string, number>;
  seedCost: Record<string, number>;
  description: string;
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

export interface Recipe {
  id: string;
  cost: Record<string, number>;    // 材料消耗（原自动侧 input 统一为此字段）
  reward: Record<string, number>;  // 产出物品（原自动侧 output 统一为此字段）
  special?: 'capsule_charge' | 'greenhouse_expansion'; // 特殊效果标记
  capsuleTarget?: string;          // 充能的胶囊 ID
  capsuleAmount?: number;          // 充能数量
  blueprintId?: string;            // 需要先解锁的图纸物品 ID（ticket 10：装备合成分层）
  facilityId?: FacilityType;       // 自动配方所属设施（手动配方缺省）
  duration?: number;               // 自动配方单次生产耗时（秒）
  category?: ItemCategory | 'building'; // 分类显式覆盖；默认从 reward 主产物类别推导
  displayName?: string;            // 无 reward 配方兜底显示名
}
