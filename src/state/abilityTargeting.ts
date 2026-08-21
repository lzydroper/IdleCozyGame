/**
 * Ability 目标选择器（combat-ability 02）：纯函数，按策略从当前存活单位中选目标。
 * 单目标敌方策略受 taunt 标记覆盖；enemy:all 不受覆盖。
 */

import type { BattleUnitRuntime } from './turnEngine';
import type { TargetingStrategy } from './abilityTypes';

export interface AbilityTargetContext {
  getLivingUnits(faction?: 'hero' | 'enemy'): BattleUnitRuntime[];
  getFlag(unitId: string, flag: string): number;
}

const highestTauntTarget = (
  ctx: AbilityTargetContext,
  enemies: BattleUnitRuntime[]
): BattleUnitRuntime | null => {
  const taunters = enemies.filter((enemy) => ctx.getFlag(enemy.id, 'taunt') > 0);
  if (taunters.length === 0) return null;
  return taunters.reduce((best, current) => {
    const currentTaunt = ctx.getFlag(current.id, 'taunt');
    const bestTaunt = ctx.getFlag(best.id, 'taunt');
    if (currentTaunt > bestTaunt) return current;
    if (currentTaunt < bestTaunt) return best;
    return current.entryOrder < best.entryOrder ? current : best;
  });
};

const minBy = (
  units: BattleUnitRuntime[],
  score: (unit: BattleUnitRuntime) => number
): BattleUnitRuntime | null =>
  units.reduce<BattleUnitRuntime | null>((best, current) => {
    if (!best) return current;
    const currentScore = score(current);
    const bestScore = score(best);
    if (currentScore < bestScore) return current;
    if (currentScore === bestScore && current.entryOrder < best.entryOrder) return current;
    return best;
  }, null);

export const selectTargets = (
  unit: BattleUnitRuntime,
  ctx: AbilityTargetContext,
  targeting: TargetingStrategy
): BattleUnitRuntime[] => {
  if (targeting === 'ally:self') {
    return unit.hp > 0 ? [unit] : [];
  }

  const opponentFaction = unit.faction === 'hero' ? 'enemy' : 'hero';
  const enemies = () => ctx.getLivingUnits(opponentFaction);
  const allies = () => ctx.getLivingUnits(unit.faction);

  if (targeting === 'enemy:all') {
    return enemies();
  }

  if (targeting === 'enemy:first') {
    const tauntTarget = highestTauntTarget(ctx, enemies());
    if (tauntTarget) return [tauntTarget];
    const first = enemies()[0];
    return first ? [first] : [];
  }

  if (targeting === 'enemy:lowestHp') {
    const tauntTarget = highestTauntTarget(ctx, enemies());
    if (tauntTarget) return [tauntTarget];
    const target = minBy(enemies(), (enemy) => enemy.hp);
    return target ? [target] : [];
  }

  if (targeting === 'ally:all') {
    return allies();
  }

  if (targeting === 'ally:lowestHpPercent') {
    const target = minBy(allies(), (ally) => (ally.maxHp > 0 ? ally.hp / ally.maxHp : 1));
    return target ? [target] : [];
  }

  return [];
};