import type { DropEntry } from '../data/regions';

/** 按 DropEntry 三形态掷骰，返回 itemId -> 数量。chanceBonus 为 0-1 概率加成。 */
export const rollDropEntries = (
  entries: DropEntry[],
  rng: () => number = Math.random,
  chanceBonus: number = 0
): Record<string, number> => {
  const out: Record<string, number> = {};
  const add = (itemId: string, count: number) => {
    out[itemId] = (out[itemId] || 0) + count;
  };

  for (const entry of entries) {
    if (entry.kind === 'fixed') {
      add(entry.itemId, entry.count);
    } else if (entry.kind === 'chance') {
      if (rng() * 100 < entry.chancePercent + chanceBonus * 100) add(entry.itemId, entry.count);
    } else {
      const totalWeight = entry.pool.reduce((sum, item) => sum + item.weight, 0);
      let roll = rng() * totalWeight;
      for (const item of entry.pool) {
        if (roll < item.weight) {
          add(item.itemId, item.count);
          break;
        }
        roll -= item.weight;
      }
    }
  }
  return out;
};
