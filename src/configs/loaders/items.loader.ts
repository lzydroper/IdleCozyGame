/**
 * items 域装配（config-json-migration 批次② 2.1；批次④后续收敛 + icon 单字段统一）：
 * 消费方只 import 本文件。四来源合并唯一 ITEMS_CONFIG：
 *   1. consumables / resources：显式分表 json；
 *   2. 英雄灵魂碎片：按英雄名册派生（shard_<id>；视觉直接继承英雄本体 GameArt，零额外定义，
 *      运行时 `shard_${heroId}` 约定已由 state/awakening·summon·seed 共享）；shards.json
 *      仅保留通用碎片（奥术星体/共鸣碎片），显式行可覆盖派生；
 *   3. 系列装备条目：由 EQUIPMENT_CONFIG 派生（name/description/icon 单一真相在装备行，
 *      装备域 icon 保持原始字符串，此处经 artMap 解析）；
 *      equipmentItems.json 仅保留独立物品（强化魔晶/图纸）。
 * 分表默认 category 由 assembleSheet 注入；icon 字符串统一经 artMap.resolveArt 解析为 GameArt。
 * 分表形态：键控表（key=id 对账）或行数组（行内 id 即身份、必填，resources.json 已迁移）；
 * 新内容一律用数组形态，id 只写一次。
 */
import consumablesJson from '../../data/items/consumables.json';
import resourcesJson from '../../data/items/resources.json';
import shardsJson from '../../data/items/shards.json';
import equipmentItemsJson from '../../data/items/equipmentItems.json';
import { devGuardKeyed } from './devGuard';
import { resolveArtOrDefault } from '../mappings/artMap';
import { HEROES_CONFIG } from './entities.loader';
import { EQUIPMENT_CONFIG } from './equipment.loader';
import type { ItemCategory, ItemMeta } from '../types/item.types';

// json 侧行形状：icon 为字符串（.png 切图路径或 iconKey），category 可省（分表默认注入）。
// 数组形态（推荐，新内容用此）：行内 id 即身份、必填——id 只写一次；
// 键控表形态（过渡兼容）：key 为身份，行内 id 可省（回退 key），写了则 devGuard 对账。
type RawItemRow = Omit<ItemMeta, 'icon' | 'category'> & {
  category?: ItemCategory;
  icon?: string;
};
type RawItemMeta = Omit<RawItemRow, 'id'> & { id?: string };

const assembleSheet = (
  domain: string,
  raw: Record<string, RawItemMeta> | RawItemRow[],
  category: ItemCategory
): Record<string, ItemMeta> => {
  const out: Record<string, ItemMeta> = {};
  for (const [key, row] of devGuardKeyed<RawItemMeta>(domain, raw, {
    required: ['name', 'description']
  })) {
    out[key] = {
      ...row,
      id: key,
      category: row.category ?? category,
      icon: resolveArtOrDefault(row.icon)
    };
  }
  return out;
};

/** 英雄灵魂碎片派生：身份 = shard_<heroId>（与库存键约定同源），视觉直接继承英雄 GameArt。 */
const deriveHeroShards = (): Record<string, ItemMeta> => {
  const out: Record<string, ItemMeta> = {};
  for (const [id, hero] of Object.entries(HEROES_CONFIG)) {
    out[`shard_${id}`] = {
      id: `shard_${id}`,
      name: `${hero.name}灵魂碎片`,
      description: `${hero.name}的专属碎片，用于升星`,
      category: 'shard',
      icon: hero.icon
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
      icon: resolveArtOrDefault(cfg.icon)
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
  ...assembleSheet('items/resources', resourcesJson as RawItemRow[], 'resource'),
  ...assembleSheet(
    'items/equipmentItems',
    equipmentItemsJson as Record<string, RawItemMeta>,
    'equipment'
  )
};
