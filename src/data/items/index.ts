// 物品注册表（单一真相源，ADR-0015）：聚合分域配置导出唯一 ITEMS_CONFIG。
// 新增物品只需在对应分域文件添加一条（元数据 + 图标内聚），无需改动本文件与 GameIcon。
export type { ItemCategory, ItemMeta, ItemSheet, ItemSprite } from './types';

import { PROPS_ITEMS } from './props';
import { RESOURCE_ITEMS } from './resources';
import { SHARD_ITEMS } from './shards';
import { EQUIPMENT_ITEMS } from './equipment';
import type { ItemCategory, ItemMeta } from './types';

export const ITEM_CATEGORIES: ItemCategory[] = ['item', 'resource', 'shard', 'equipment'];

export const ITEMS_CONFIG: Record<string, ItemMeta> = {
  ...PROPS_ITEMS,
  ...RESOURCE_ITEMS,
  ...SHARD_ITEMS,
  ...EQUIPMENT_ITEMS,
};
