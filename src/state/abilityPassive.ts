/**
 * Ability 触发型被动编译（combat-ability 08；config-json-migration 批次③ 数据驱动统一）：
 * 把 passive Ability 编译为 forever Buff——效果即 EffectTemplate 直载，
 * 公式（attack/maxHp 等）由 buffRuntime 物化器在触发结算时经 resolveStats 解析（M1 一致）。
 */

import type { BattleContext } from './battleContext';
import type { BuffConfig } from './buffTypes';
import type { ResolvedAbility } from './abilityTypes';

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
    effects: (passive?.effects ?? []).map(t => ({ kind: t.kind, params: t.params }))
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
  units: readonly { id: string; abilities: ResolvedAbility[] }[]
): void => {
  for (const unit of units) {
    // BattleUnitRuntime.abilities 已是 ResolvedAbility[]（combat-entity 类型收口）。
    for (const ability of unit.abilities) {
      if (ability.activation !== 'passive' || !ability.passive) continue;
      const instance = {
        id: 'passive:' + unit.id + ':' + ability.id,
        buffId: passiveBuffId(ability.id),
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
