import { BONDS } from '../data/bonds';
import type { CombatBonus } from '../data/bonds';
import { HEROES_CONFIG } from '../data/heroes';
import type { HeroFaction } from '../types/game';

// 羁绊判定（ticket 09）：上阵 3 人小队满足组合/阵营条件即触发，加成在战斗中生效。
// 纯函数：getActiveBonds 返回命中的羁绊表项；aggregateBonus 聚合为单一 CombatBonus。

/**
 * 计算当前上阵队伍命中的羁绊：
 * - heroes：列表中的英雄必须全部上阵（未知英雄不计入）
 * - factions：每个阵营要求 N 名上阵英雄，实际同阵营人数须 ≥ N
 */
export const getActiveBonds = (party: string[]): typeof BONDS => {
  const knownIds = new Set(party.filter(id => !!HEROES_CONFIG[id]));
  const factionCounts: Partial<Record<HeroFaction, number>> = {};
  party.forEach(id => {
    const faction = HEROES_CONFIG[id]?.faction;
    if (faction) factionCounts[faction] = (factionCounts[faction] || 0) + 1;
  });

  return BONDS.filter(bond =>
    bond.heroes.every(id => knownIds.has(id)) &&
    Object.entries(bond.factions).every(([faction, need]) =>
      (factionCounts[faction as HeroFaction] || 0) >= (need || 1)
    )
  );
};

/**
 * 聚合当前队伍全部激活羁绊的加成（百分比直接求和）。
 * 无羁绊或某项无加成时对应字段缺省（不写入 0 值）。
 */
export const aggregateBonus = (party: string[]): CombatBonus => {
  const total: CombatBonus = {};
  getActiveBonds(party).forEach(bond => {
    if (bond.bonus.attackPercent) total.attackPercent = (total.attackPercent || 0) + bond.bonus.attackPercent;
    if (bond.bonus.defensePercent) total.defensePercent = (total.defensePercent || 0) + bond.bonus.defensePercent;
    if (bond.bonus.maxHpPercent) total.maxHpPercent = (total.maxHpPercent || 0) + bond.bonus.maxHpPercent;
  });
  return total;
};
