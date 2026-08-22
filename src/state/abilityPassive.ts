/**
 * Ability 触发型被动编译（combat-ability 08）：
 * 把 passive Ability 编译为 forever Buff + Trigger，走既有 Buff 层；被动 Buff 默认不可驱散。
 */

import type { BattleContext, BuffInstance } from './battleContext';
import type { BuffConfig } from './buffTypes';
import type { ResolvedAbility } from './abilityTypes';
import type { BattleUnitRuntime, TurnTimingContext } from './turnEngine';
import type { BattleUnitStats } from './battleTypes';
import { compileAbilityEffects } from './abilityCompiler';

export const passiveBuffId = (abilityId: string): string => 'passive:' + abilityId;

/**
 * statsResolver（combat-assembly 03 / M1）：被动效果在「触发结算时」经 resolveStats 取数，
 * 战斗内动态 Modifier（含元属性折算）即时生效；缺省回退入场静态快照（仅测试用）。
 */
export type PassiveStatsResolver = (unitId: string) => BattleUnitStats;

export const compilePassiveBuffConfig = (
  ability: ResolvedAbility,
  resolveStats?: PassiveStatsResolver
): BuffConfig => {
  const passive = ability.passive;
  return {
    buffId: passiveBuffId(ability.id),
    durationKind: 'forever',
    renew: false,
    stack: false,
    stackIncrement: 0,
    removable: false,
    triggers: passive?.triggers ?? [],
    createEffects: (instance: BuffInstance, timingCtx: TurnTimingContext) => {
      if (!passive) return [];
      const source = timingCtx.runtime.getUnit(instance.sourceId);
      if (!source) return [];
      const target = timingCtx.target ?? timingCtx.unit ?? source;
      // 结算时解析（resolveStats 唯一权威），不再读入场静态快照。
      const stats = resolveStats ? resolveStats(instance.sourceId) : source.stats;
      const passiveAbility: ResolvedAbility = { ...ability, effects: passive.effects };
      let localSeq = 0;
      const makeId = (): string => {
        localSeq += 1;
        return instance.id + ':passive:' + timingCtx.round + ':' + timingCtx.key + ':' + target.id + ':' + localSeq;
      };
      return compileAbilityEffects(passiveAbility, source, [target], stats, makeId).effects;
    }
  };
};

export const collectPassiveBuffConfigs = (
  abilities: ResolvedAbility[],
  resolveStats?: PassiveStatsResolver
): Record<string, BuffConfig> => {
  const configs: Record<string, BuffConfig> = {};
  for (const ability of abilities) {
    if (ability.activation === 'passive' && ability.passive) {
      configs[passiveBuffId(ability.id)] = compilePassiveBuffConfig(ability, resolveStats);
    }
  }
  return configs;
};

export const applyPassiveAbilities = (
  battle: BattleContext,
  units: readonly BattleUnitRuntime[]
): void => {
  for (const unit of units) {
    // BattleUnitRuntime.abilities 已是 ResolvedAbility[]（combat-entity 类型收口），无需强转（A#1 残余清理）。
    for (const ability of unit.abilities) {
      if (ability.activation !== 'passive' || !ability.passive) continue;
      const buffId = passiveBuffId(ability.id);
      const instance: BuffInstance = {
        id: 'passive:' + unit.id + ':' + ability.id,
        buffId,
        sourceId: unit.id,
        targetId: unit.id,
        stacks: 1,
        duration: null,
        values: {}
      };
      battle.applyBuff(unit.id, instance);
    }
  }
};