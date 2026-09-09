// 工坊分类栏位配置（config-json-migration 批次① 自 data/workshopCategories.ts 归位 constants，
// 用户裁决②：分类实为常量配置；icon 为 iconKey 字符串（icon 单字段约定），经 iconMap 解析）。
import type { ItemCategory } from '../types/item.types';

export type WorkshopCategory = ItemCategory;

export interface WorkshopCategoryConfig {
  id: WorkshopCategory;
  label: string;
  icon: string;
}

export const WORKSHOP_CATEGORIES: WorkshopCategoryConfig[] = [
  { id: 'item', label: '道具', icon: 'cooking-pot' },
  { id: 'resource', label: '资源', icon: 'layers' },
  { id: 'shard', label: '碎片', icon: 'gem' },
  { id: 'equipment', label: '装备', icon: 'shield' }
];
