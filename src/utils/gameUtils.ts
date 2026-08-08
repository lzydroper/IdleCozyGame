import { HEROES_CONFIG } from '../data/heroes';

// 英雄显示名（heroes 状态无 name，从配置读取）
export const getHeroName = (heroId: string): string =>
  HEROES_CONFIG[heroId]?.name || heroId;

// 获取特定物品在背包里的数量（inventory 为扁平 id→数量的映射）
export const getInvQty = (inventory: Record<string, number>, itemId: string): number =>
  inventory[itemId] || 0;
