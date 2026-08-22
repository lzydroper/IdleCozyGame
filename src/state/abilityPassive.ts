/**
 * Ability 触发型被动编译（combat-ability 08）：
 * 把 passive Ability 编译为 forever Buff + Trigger，走既有 Buff 层；被动 Buff 默认不可驱散。
 */

import type { BattleContext, BuffInstance } from './battleContext';
import type { BuffConfig } from './buffTypes';
import type { ResolvedAbility } from './abilityTypes';
import type { BattleUnitRuntime, TurnTimingContext } from './turnEngine';
import { compileAbilityEffects } from './abilityCompiler';

export const passiveBuffId = (abilityId: string): string => 'passive:' + abilityId;

export const compilePassiveBuffConfig = (ability: ResolvedAbility): BuffConfig => {
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
      const stats = source.stats;
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
  abilities: ResolvedAbility[]
): Record<string, BuffConfig> => {
  const configs: Record<string, BuffConfig> = {};
  for (const ability of abilities) {
    if (ability.activation === 'passive' && ability.passive) {
      configs[passiveBuffId(ability.id)] = compilePassiveBuffConfig(ability);
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