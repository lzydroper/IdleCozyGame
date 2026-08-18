/**
 * Buff 触发运行时（combat-buff）：把 Buff 配置中的 Trigger 注册到 Turn 时机，
 * 在时机派发时按 canTrigger 判定归属，构建并结算对应 Effect，然后推进持续/层数。
 * 效果构建逻辑在配置层（buffTypes），本模块只负责触发与持续/层数推进。
 */

import type { BattleContext, BuffInstance, BuffTriggerHooks } from './battleContext';
import type { TurnSubscriber, TurnTimingContext } from './turnEngine';
import { getBuffConfig, type BuffTrigger } from './buffTypes';
import { resolveEffect, type EffectInstance } from './effectSystem';

interface Registration {
  key: string;
  unitId: string | null;
  subscriber: TurnSubscriber;
}

const registrations = new WeakMap<BuffInstance, Registration[]>();

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
    ctx.removeModifiersBySource(instance.targetId, instance.id);
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

export const createBuffTriggerHooks = (
  getCtx: () => BattleContext
): BuffTriggerHooks => ({
  register(instance) {
    const config = getBuffConfig(instance.buffId);
    if (!config) return;

    const records: Registration[] = [];
    for (const trigger of config.triggers) {
      const unitId = triggerOwnerId(instance, trigger);
      const subscriber: TurnSubscriber = (timingCtx) => {
        if (!canTriggerBuff(instance, trigger, timingCtx.key, timingCtx.unit?.id ?? null)) return;
        settleBuffTrigger(getCtx(), instance, timingCtx);
      };
      getCtx().turn.register(trigger.timing, subscriber, unitId);
      records.push({ key: trigger.timing, unitId, subscriber });
    }
    registrations.set(instance, records);
  },

  unregister(instance) {
    const records = registrations.get(instance) ?? [];
    for (const record of records) {
      getCtx().turn.unregister(record.key, record.subscriber, record.unitId);
    }
    registrations.delete(instance);
  }
});
