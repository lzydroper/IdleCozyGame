/**
 * items 域装配（config-json-migration 批次② 2.1；批次④后续收敛）：
 * 消费方只 import 本文件。四来源合并唯一 ITEMS_CONFIG：
 *   1. consumables / resources：显式分表 json；
 *   2. 英雄灵魂碎片：按英雄名册派生（shard_<id>；贴图/图标与英雄本体同源，零额外定义，
 *      运行时 `shard_${heroId}` 约定已由 state/awakening·summon·seed 共享）；shards.json
 *      仅保留通用碎片（奥术星体/共鸣碎片），显式行可覆盖派生；
 *   3. 系列装备条目：由 EQUIPMENT_CONFIG 派生（name/description/iconKey 单一真相在装备行）；
 *      equipmentItems.json 仅保留独立物品（强化魔晶/图纸）。
 * 分表默认 category 由 assembleSheet 注入——json 不再显式书写等于默认值的字段。
 */
import consumablesJson from '../../data/items/consumables.json';
import resourcesJson from '../../data/items/resources.json';
import shardsJson from '../../data/items/shards.json';
import equipmentItemsJson from '../../data/items/equipmentItems.json';
import { iconFor } from '../mappings/iconMap';
import { devGuardTable } from './devGuard';
import { HEROES_CONFIG } from './entities.loader';
import { EQUIPMENT_CONFIG } from './equipment.loader';
import type { ItemCategory, ItemMeta, ItemSprite } from '../types/item.types';
import type { HeroConfig } from '../types/entity.types';

// json 侧行形状：category/iconKey 可省（分表默认注入 / iconMap 装配），其余字段同 ItemMeta。
type RawItemMeta = Omit<ItemMeta, 'icon' | 'category' | 'iconKey'> & {
  category?: ItemCategory;
  iconKey?: string;
};

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

/** 英雄灵魂碎片派生：身份 = shard_<heroId>（与库存键约定同源），展示与图标随英雄本体。 */
const deriveHeroShards = (): Record<string, ItemMeta> => {
  const out: Record<string, ItemMeta> = {};
  for (const [id, hero] of Object.entries(HEROES_CONFIG)) {
    const h = hero as HeroConfig;
    const sprite = h.sprite as ItemSprite | undefined;
    out[`shard_${id}`] = {
      id: `shard_${id}`,
      name: `${h.name}灵魂碎片`,
      description: `${h.name}的专属碎片，用于升星`,
      category: 'shard',
      sprite,
      iconKey: typeof h.iconKey === 'string' ? h.iconKey : undefined,
      icon: undefined
    };
  }
  return out;
};

/** 装备背包条目派生：同一装备在背包中为普通物品（穿戴后成为装备实例）。 */
const deriveEquipmentItems = (): Record<string, ItemMeta> => {
  const out: Record<string, ItemMeta> = {};
  for (const [key, cfg] of Object.entries(EQUIPMENT_CONFIG)) {
    out[key] = {
      id: cfg.id ?? key,
      name: cfg.name,
      description: cfg.description,
      category: 'equipment',
      iconKey: cfg.iconKey,
      icon: cfg.iconKey ? iconFor(cfg.iconKey) : undefined
    };
  }
  return out;
};

export const ITEM_CATEGORIES: ItemCategory[] = ['item', 'resource', 'shard', 'equipment'];

export const ITEMS_CONFIG: Record<string, ItemMeta> = {
  // 派生在前、显式在后：显式分表行可覆盖同名派生条目（当前无重叠，语义留作扩展口）
  ...deriveHeroShards(),
  ...assembleSheet('items/shards', shardsJson as Record<string, RawItemMeta>, 'shard'),
  ...deriveEquipmentItems(),
  ...assembleSheet('items/consumables', consumablesJson as Record<string, RawItemMeta>, 'item'),
  ...assembleSheet('items/resources', resourcesJson as Record<string, RawItemMeta>, 'resource'),
  ...assembleSheet(
    'items/equipmentItems',
    equipmentItemsJson as Record<string, RawItemMeta>,
    'equipment'
  )
};
