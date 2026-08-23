// 物品注册表（单一真相源，ADR-0015）。
// config-json-migration 批次②：数据本体已迁 data/items/*.json，
// 装配与 iconKey 注入收口至 configs/loaders/items.loader——本文件仅转发兼容存量引用（批次④收口删除）。
export type { ItemCategory, ItemMeta, ItemSheet, ItemSprite } from '../../configs/types/item.types';
export { ITEMS_CONFIG, ITEM_CATEGORIES } from '../../configs/loaders/items.loader';
