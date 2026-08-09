// 统一配方定义（ticket 01：手动/自动共享同一类型，字段统一 cost/reward；
// name/description 已删除，显示文案从产出物完全推导，见 state/workshop.ts 辅助函数）
import type { ItemCategory } from '../data/items';
import type { FacilityType } from '../data/facilities';
import type { LucideIcon } from 'lucide-react';

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
  cost: Record<string, number>; // 材料消耗（支持多材料：{ scrap_metal: 50, alloy_plate: 5 }）
  effectValue: number;          // The value of the main effect at this level
  effectText: string;           // Formatted text description of the effect (e.g. "13.0h", "0.90 能量/分")
  duration: number;             // 升级到该等级所需耗时（秒），长节奏基建施工设定
}

// 解锁条件（统一为 type/id/minValue）
// upgrade_level: id=升级项 id, minValue=最低等级
// item_count: id=物品 id, minValue=最低数量
export interface UnlockRequirement {
  type: 'upgrade_level' | 'item_count';
  id: string;
  minValue: number;
}

export interface UpgradePath {
  id: string;
  name: string;
  description: string;
  maxLevel: number;
  category: 'base' | 'facility';
  effectLabel: string;          // Label describing the effect (e.g. "离线最大挂机续航时间")
  icon?: LucideIcon;                  // 图标组件引用（同 HEROES_CONFIG.icon，经 GameIcon 注册表渲染）
  unlockRequirements?: UnlockRequirement[];  // 解锁条件（满足后才在列表中显示）
  levels: UpgradeLevel[];
}

export interface Recipe {
  id: string;
  cost: Record<string, number>;    // 材料消耗（原自动侧 input 统一为此字段）
  reward: Record<string, number>;  // 产出物品（原自动侧 output 统一为此字段）
  special?: 'capsule_charge'; // 特殊效果标记（温室扩展坞已迁移至后勤基建，不再作为合成配方）
  capsuleTarget?: string;          // 充能的胶囊 ID
  capsuleAmount?: number;          // 充能数量
  blueprintId?: string;            // 需要先解锁的图纸物品 ID（ticket 10：装备合成分层）
  description?: string;            // 无 reward 配方兜底描述（如建筑类温室扩建；有 reward 配方由产物推导）
  facilityId?: FacilityType;       // 自动配方所属设施（手动配方缺省）
  duration?: number;               // 自动配方单次生产耗时（秒）
  category?: ItemCategory; // 分类显式覆盖；默认从 reward 主产物类别推导（建筑类已迁出工坊）
  displayName?: string;            // 无 reward 配方兜底显示名
}
