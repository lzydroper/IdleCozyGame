/**
 * items 域装配（config-json-migration 批次② 2.1）：
 * 四张分表 json → iconFor 注入 → 合并唯一 ITEMS_CONFIG。
 * 消费方只 import 本文件（旧路径 data/items/index 为转发 shim，批次④收口删除）。
 */
import consumablesJson from '../../data/items/consumables.json';
import resourcesJson from '../../data/items/resources.json';
import shardsJson from '../../data/items/shards.json';
import equipmentItemsJson from '../../data/items/equipmentItems.json';
import { iconFor } from '../mappings/iconMap';
import { devGuardTable } from './devGuard';
import type { ItemCategory, ItemMeta } from '../types/item.types';

type RawItemMeta = Omit<ItemMeta, 'icon'> & { iconKey?: string };

const assembleSheet = (
  domain: string,
  raw: Record<string, RawItemMeta>,
  category: ItemCategory
): Record<string, ItemMeta> => {
  const guarded = devGuardTable(domain, raw, { required: ['name', 'description'] });
  const out: Record<string, ItemMeta> = {};
  for (const [key, row] of Object.entries(guarded)) {
    out[key] = {
      ...row,
      id: row.id ?? key,
      category: row.category ?? category,
      icon: row.iconKey ? iconFor(row.iconKey) : undefined
    };
  }
  return out;
};

export const ITEM_CATEGORIES: ItemCategory[] = ['item', 'resource', 'shard', 'equipment'];

export const ITEMS_CONFIG: Record<string, ItemMeta> = {
  ...assembleSheet('items/consumables', consumablesJson as Record<string, RawItemMeta>, 'item'),
  ...assembleSheet('items/resources', resourcesJson as Record<string, RawItemMeta>, 'resource'),
  ...assembleSheet('items/shards', shardsJson as Record<string, RawItemMeta>, 'shard'),
  ...assembleSheet('items/equipmentItems', equipmentItemsJson as Record<string, RawItemMeta>, 'equipment')
};
