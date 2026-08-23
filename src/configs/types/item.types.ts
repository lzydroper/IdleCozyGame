// 物品定义类型（单一真相源，ADR-0015）：分类四值 + icon 单字段视觉。
// icon：json 侧字符串（.png 切图路径或 Lucide iconKey），装配后为 GameArt 判别联合。
import type { GameArt } from './art.types';

// 物品分类：道具 / 资源 / 碎片 / 装备（ADR-0014）
export type ItemCategory = 'item' | 'resource' | 'shard' | 'equipment';

export interface ItemMeta {
  id: string;
  name: string;
  description: string;
  category: ItemCategory;
  /** 视觉（装配后必存在）：切图 URL 或 Lucide 组件，由 artMap.resolveArt 解析 */
  icon: GameArt;
  useEffect?: {
    stats?: Partial<Record<'food' | 'energy' | 'sanity', number>>;
    pollution?: number;
    /** 梦境充能（ADR-0016）：消耗 1 个物品 → 对应胶囊充能次数 +N */
    capsuleCharge?: Partial<Record<'sanity_capsule' | 'warp_capsule', number>>;
    /** 英雄经验（15 号）：消耗 1 个物品 → 英雄获得 N 经验（经验手册） */
    heroExp?: number;
  };
}
