import { HEROES_CONFIG } from '../data/heroes';

// 英雄显示名（heroes 状态无 name，从配置读取）
export const getHeroName = (heroId: string): string =>
  HEROES_CONFIG[heroId]?.name || heroId;

// 获取特定物品在背包里的数量（inventory 为扁平 id→数量的映射）
export const getInvQty = (inventory: Record<string, number>, itemId: string): number =>
  inventory[itemId] || 0;

// 秒数 → 中文时长文本（长节奏基建升级/施工显示用）
// 例：45 → "45秒"，1500 → "25分"，9000 → "2小时30分"，200000 → "2天7小时"
export const formatDuration = (seconds: number): string => {
  const s = Math.max(0, Math.ceil(seconds));
  if (s < 60) return `${s}秒`;
  const mins = Math.floor(s / 60);
  if (mins < 60) return `${mins}分`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  if (days > 0) return remHours > 0 ? `${days}天${remHours}小时` : `${days}天`;
  return remMins > 0 ? `${hours}小时${remMins}分` : `${hours}小时`;
};
