/**
 * Buff 触发运行时（combat-buff）：把 Buff 配置中的 Trigger 注册到 Turn 时机，
 * 在时机派发时按 canTrigger 判定归属，构建并结算对应 Effect，然后推进持续/层数。
 * 效果构建逻辑在配置层（buffTypes），本模块只负责触发与持续/层数推进。
 */

import type { BattleContext, BuffInstance, BuffTriggerHooks } from './battleContext';
import type { TurnSubscriber, TurnTimingContext } from './turnEngine';
import { buffModifierSource, getBuffConfig, type BuffTrigger } from './buffTypes';
import { resolveEffect, type EffectInstance } from './effectSystem';

export const triggerOwnerId = (instance: BuffInstance, trigger: BuffTrigger): string =>
  trigger.unitRef === 'source' ? instance.sourceId : instance.targetId;

export const canTriggerBuff = (
  instance: BuffInstance,
  trigger: BuffTrigger,
  timingKey: string,
  currentOwnerId: string | null
): boolean => trigger.timing === timingKey && currentOwnerId === triggerOwnerId(instance, trigger);

const buildBuffEffects = (
  instance: BuffInstance,
  timingCtx: TurnTimingContext
): EffectInstance[] => {
  const config = getBuffConfig(instance.buffId);
  if (!config) return [];

  // fireCount 是放大器注入的运行时放大系数：由 Ability/Effect 在派发时机事件时写入
  // timingCtx.data.fireCount；Buff 运行时只负责把它读出来复制 N 份效果，缺省 1。
  // 它对所有 Buff 生效（不特判灼烧），持续/层数结算与其无关。
  const rawFireCount = timingCtx.data.fireCount;
  const fireCount = typeof rawFireCount === 'number' && rawFireCount > 0
    ? Math.floor(rawFireCount)
    : 1;

  const baseEffects = config.createEffects(instance, timingCtx);
  const effects: EffectInstance[] = [];
  for (let i = 0; i < fireCount; i++) {
    for (const effect of baseEffects) {
      effects.push(i === 0 ? effect : { ...effect, id: effect.id + ':' + i });
    }
  }
  return effects;
};

export const settleBuffTrigger = (
  ctx: BattleContext,
  instance: BuffInstance,
  timingCtx: TurnTimingContext
): void => {
  const effects = buildBuffEffects(instance, timingCtx);
  if (effects.some(effect => effect.kind === 'statModify')) {
    ctx.removeModifiersBySource(instance.targetId, buffModifierSource(instance));
  }
  for (const effect of effects) {
    resolveEffect(ctx, effect);
  }

  const config = getBuffConfig(instance.buffId);
  if (!config) return;

  if (config.durationKind === 'temporary' && instance.duration !== null) {
    instance.duration -= 1;
    if (instance.duration <= 0) {
      ctx.removeBuff(instance.targetId, instance.buffId);
    }
    return;
  }

  if (config.consumeOnTrigger) {
    instance.stacks -= 1;
    if (instance.stacks <= 0) {
      ctx.removeBuff(instance.targetId, instance.buffId);
    }
  }
};

/** 控制类 Buff 集合：命中任一即无法行动（combat-aftermath 02 D3 集合化，新控制类只需注册于此）。 */
export const CONTROL_BUFF_KINDS: readonly string[] = ['stun'];

/**
 * 「无法行动」汇总（Turn #14 收口：从 combat.ts 迁入 Buff 模块）。
 * 判定语义 = 快照时点读当前 duration（combat-aftermath 02 D1）：duration>0 即不可行动。
 */
export const canActWithBuffs = (battle: BattleContext, unitId: string): boolean =>
  !CONTROL_BUFF_KINDS.some(kind => {
    const buff = battle.getBuff(unitId, kind);
    return !!buff && (buff.duration ?? 0) > 0;
  });

export const createBuffTriggerHooks = (
  getCtx: () => BattleContext
): BuffTriggerHooks => ({
  register(instance) {
    const config = getBuffConfig(instance.buffId);
    if (!config) return [];

    // 注册/注销经句柄对称完成（combat-hygiene 04 / Turn #7）；句柄由 BattleContext 按实例 id 保管，
    // 本模块不再维护模块级注册表。
    const handles: Array<() => void> = [];
    for (const trigger of config.triggers) {
      const unitId = triggerOwnerId(instance, trigger);
      const subscriber: TurnSubscriber = (timingCtx) => {
        if (!canTriggerBuff(instance, trigger, timingCtx.key, timingCtx.unit?.id ?? null)) return;
        settleBuffTrigger(getCtx(), instance, timingCtx);
      };
      handles.push(getCtx().turn.register(trigger.timing, subscriber, unitId));
    }
    return handles;
  }
});
