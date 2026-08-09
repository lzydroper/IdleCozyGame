// 工坊分类栏位配置（ticket 03：数据驱动可扩展；维度 = 产出物类别对齐背包 ItemCategory。
// 原「建筑」分类已随温室扩展坞迁移至后勤基建（升级耗时机制），工坊不再有建筑类配方）
import { CookingPot, Layers, Gem, Shield } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ItemCategory } from './items';

export type WorkshopCategory = ItemCategory;

export interface WorkshopCategoryConfig {
  id: WorkshopCategory;
  label: string;
  icon: LucideIcon;
}

export const WORKSHOP_CATEGORIES: WorkshopCategoryConfig[] = [
  { id: 'item', label: '道具', icon: CookingPot },
  { id: 'resource', label: '资源', icon: Layers },
  { id: 'shard', label: '碎片', icon: Gem },
  { id: 'equipment', label: '装备', icon: Shield },
];
