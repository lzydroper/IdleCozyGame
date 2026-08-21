// 装备类物品（ADR-0015 单一真相源）：12 件系列装备由 EQUIPMENT_CONFIG 派生，
// 物品定义不重复维护 name/description；强化素材与图纸为手写条目。
import { Diamond, Gem, ScrollText, Shield, Sword } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { EQUIPMENT_CONFIG } from '../equipment';
import type { ItemMeta } from './types';

// 按装备槽位映射 Lucide 回退图标（无 sprite 的装备以此渲染）
const SLOT_FALLBACK_ICONS: Record<string, LucideIcon> = {
  weapon: Sword,
  armor: Shield,
  trinket: Gem,
};

// 从装备配置派生物品条目：id/name/description/category 与装备真相源保持一致
const deriveEquipmentItems = (): Record<string, ItemMeta> => {
  const result: Record<string, ItemMeta> = {};
  for (const cfg of Object.values(EQUIPMENT_CONFIG)) {
    result[cfg.id] = {
      id: cfg.id,
      name: cfg.name,
      description: cfg.description,
      category: 'equipment',
      icon: SLOT_FALLBACK_ICONS[cfg.slot],
    };
  }
  return result;
};

export const EQUIPMENT_ITEMS: Record<string, ItemMeta> = {
  ...deriveEquipmentItems(),
  // 装备生态：强化素材与图纸
  enhance_stone: { id: 'enhance_stone', name: '强化魔晶', description: '蕴含精纯魔力的晶石，用于强化装备（工坊可合成，战斗掉落）。', category: 'equipment', icon: Diamond },
  blueprint_ember_armory: { id: 'blueprint_ember_armory', name: '余烬军械图纸', description: '记载余烬系列装备锻造工艺的泛黄图纸，解锁后可于工坊合成。', category: 'equipment', icon: ScrollText },
};
