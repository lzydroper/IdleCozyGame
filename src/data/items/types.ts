// 物品定义类型（单一真相源，ADR-0015）：分类四值 + sprite 图标索引 + Lucide 回退。
import type { LucideIcon } from 'lucide-react';

// 物品分类：道具 / 资源 / 碎片 / 装备（ADR-0014）
export type ItemCategory = 'item' | 'resource' | 'shard' | 'equipment';

// spritesheet 类型：物品三张 4x4 表 + 英雄立绘 3x3 表
export type ItemSheet = 'seeds' | 'materials' | 'supplies' | 'survivors';

export interface ItemSprite {
  sheet: ItemSheet;
  index: number;
}

export interface ItemMeta {
  id: string;
  name: string;
  description: string;
  category: ItemCategory;
  /** spritesheet 图标索引；未配置时用 icon（Lucide）回退渲染「待补 sprite」标记 */
  sprite?: ItemSprite;
  /** Lucide 回退图标（sprite 缺失时显示） */
  icon?: LucideIcon;
  useEffect?: {
    stats?: Partial<Record<'food' | 'energy' | 'sanity', number>>;
    pollution?: number;
    /** 梦境充能（ADR-0016）：消耗 1 个物品 → 对应胶囊充能次数 +N */
    capsuleCharge?: Partial<Record<'sanity_capsule' | 'warp_capsule', number>>;
  };
}
