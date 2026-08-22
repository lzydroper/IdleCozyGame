/**
 * Ability 运行时（combat-ability 06）：选能力 → 选目标 → 扣费 → 写冷却 → 派发效果。
 * 冷却按「已经过的自身回合数」递减：注册单位自身 turnEnd，含被跳过回合。
 */

import type { TurnRuntime, TurnSubscriber, BattleUnitRuntime } from './turnEngine';
import type { BattleContext } from './battleContext';
import { selectTargets, type AbilityTargetContext } from './abilityTargeting';
import { compileAbilityEffects } from './abilityCompiler';
import { resolveEffect } from './effectSystem';
import type { ResolvedAbility } from './abilityTypes';

const toTargetContext = (battle: BattleContext): AbilityTargetContext => ({
  getLivingUnits: (faction) => battle.turn.getLivingUnits(faction),
  getFlag: (unitId, flag) => battle.getFlag(unitId, flag)
});

export interface AbilityRuntime {
  setup(runtime: TurnRuntime): void;
  performAction(unit: BattleUnitRuntime, runtime: TurnRuntime): void;
}

export const createAbilityRuntime = (getBattle: () => BattleContext): AbilityRuntime => {
  const cooldowns = new Map<string, Map<string, number>>();
  let nextEffectId = 0;

  const tickCooldowns = (unitId: string): void => {
    const map = cooldowns.get(unitId);
    if (!map) return;
    for (const [abilityId, cooldown] of Array.from(map.entries())) {
      if (cooldown > 0) {
        map.set(abilityId, cooldown - 1);
      }
    }
  };

  const setup = (runtime: TurnRuntime): void => {
    for (const unit of runtime.getLivingUnits()) {
      const subscriber: TurnSubscriber = () => tickCooldowns(unit.id);
      runtime.register('turnEnd', subscriber, unit.id);
    }
  };

  const performAction = (unit: BattleUnitRuntime, _runtime: TurnRuntime): void => {
    const battle = getBattle();
    const stats = battle.resolveStats(unit.id);
    const targetCtx = toTargetContext(battle);
    const abilities = unit.abilities as unknown as ResolvedAbility[];

    const candidates = abilities
      .map((ability, index) => {
        if (ability.activation !== 'active') return null;
        const cooldown = cooldowns.get(unit.id)?.get(ability.id) ?? 0;
        if (cooldown > 0) return null;
        if (ability.cost && !battle.canAfford(unit.id, ability.cost)) return null;

        const targets = selectTargets(unit, targetCtx, ability.targeting ?? 'enemy:first');
        if (targets.length === 0) return null;
        return { ability, index, targets };
      })
      .filter((candidate): candidate is { ability: ResolvedAbility; index: number; targets: BattleUnitRuntime[] } =>
        candidate !== null
      )
      .sort((a, b) => b.ability.priority - a.ability.priority || a.index - b.index);

    const selected = candidates[0];
    if (!selected) return;

    if (selected.ability.cost && !battle.spendCost(unit.id, selected.ability.cost)) {
      return;
    }

    let cooldownSet = 0;
    if (selected.ability.cooldown > 0) {
      const reduction = Math.min(1, Math.max(0, stats.cooldownReduction ?? 0));
      cooldownSet = Math.max(0, Math.ceil(selected.ability.cooldown * (1 - reduction)));
      const map = cooldowns.get(unit.id) ?? cooldowns.set(unit.id, new Map()).get(unit.id)!;
      // 冷却按「已经过的自身回合数」计：施放回合不计入已过回合。
      // 因此内部多存 1，让首个 turnEnd 把值降到配置冷却；事件仍上报 cooldownSet。
      map.set(selected.ability.id, cooldownSet + 1);
    }

    battle.turn.dispatchEvent('abilityUsed', {
      unitId: unit.id,
      sourceId: unit.id,
      targetId: selected.targets[0]?.id ?? null,
      data: {
        abilityId: selected.ability.id,
        abilityName: selected.ability.name,
        targetIds: selected.targets.map((target) => target.id),
        costPaid: selected.ability.cost ?? null,
        cooldownSet,
        priority: selected.ability.priority
      }
    });

    const makeId = (): string => 'ability-' + nextEffectId++;
    const compiled = compileAbilityEffects(
      selected.ability,
      unit,
      selected.targets,
      stats,
      makeId
    );
    const effects = compiled.effects;

    const resolved = effects.map((effect) => ({ effect, result: resolveEffect(battle, effect) }));

    for (const { effect, result } of resolved) {
      if (effect.kind !== 'damage') continue;
      const params = effect.params as { amount: number };
      const amount = Math.round(typeof params.amount === 'number' ? params.amount : 0);
      const damage = result.values.damage ?? 0;
      const data =
        selected.ability.id === 'basic_attack'
          ? {
              kind: 'attack' as const,
              abilityId: selected.ability.id,
              damage,
              amount,
              fireCount: compiled.fireCount
            }
          : {
              kind: 'skill' as const,
              skillName: selected.ability.name,
              abilityId: selected.ability.id,
              damage,
              amount,
              fireCount: compiled.fireCount
            };
      battle.turn.dispatchEvent('attackAfter', {
        unitId: unit.id,
        sourceId: unit.id,
        targetId: effect.targetId,
        data
      });
    }
  };

  return { setup, performAction };
};