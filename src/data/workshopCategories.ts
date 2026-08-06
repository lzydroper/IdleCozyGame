// 工坊分类栏位配置（ticket 03：数据驱动可扩展；维度 = 产出物类别对齐背包 ItemCategory + 补充「建筑」类）
import { CookingPot, Layers, Gem, Shield, Building2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ItemCategory } from './items';

export type WorkshopCategory = ItemCategory | 'building';

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
  { id: 'building', label: '建筑', icon: Building2 },
];
