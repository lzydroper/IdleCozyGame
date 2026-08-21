/**
 * Buff 模块类型契约与配置注册表（combat-buff）。
 * 配置层策略（Duration / Renew / Stack / Trigger / 消耗开关 / 触发效果构建）只存在于此；
 * BuffInstance 只记录运行时状态与创建时传入的数值，不计算数值。
 */

import type { TurnEventKey, TurnTimingContext } from './turnEngine';
import type { EffectInstance } from './effectSystem';

export type BuffDurationKind = 'forever' | 'temporary';

export interface BuffTrigger {
  timing: TurnEventKey;
  unitRef: 'target' | 'source';
}

export interface BuffInstance {
  id: string;
  buffId: string;
  sourceId: string;
  targetId: string;
  stacks: number;
  /** null = forever；number = temporary 剩余回合。 */
  duration: number | null;
  /** 创建时传入的数值；实例不计算。 */
  values: Record<string, number>;
  [key: string]: unknown;
}

export interface BuffConfig {
  buffId: string;
  durationKind: BuffDurationKind;
  /** true = 重复获得时刷新时长，取 max。 */
  renew: boolean;
  /** true = 重复获得时叠加层数。 */
  stack: boolean;
  /** Stack=true 时每次挂载增量；Stack=false 时忽略。 */
  stackIncrement: number;
  triggers: BuffTrigger[];
  /** 是否可被驱散；缺省 true。被动生成的永久 Buff 设 false。 */
  removable?: boolean;
  /** forever 消耗类（如折焰）每触发消耗 1 层。 */
  consumeOnTrigger?: boolean;
  /** 配置层的效果构建：一次触发应派发哪些 Effect。 */
  createEffects: (instance: BuffInstance, timingCtx: TurnTimingContext) => EffectInstance[];
}

export interface BuffApplication {
  instance: BuffInstance;
  /** false = 不同 source 冲突拒绝（或未知 buffId 不落地）。 */
  applied: boolean;
  /** true = 命中已有实例。 */
  refreshed: boolean;
  /** 更新后的层数。 */
  stacks: number;
}

const damageEffect = (
  instance: BuffInstance,
  effectId: string,
  targetId: string,
  amount: number
): EffectInstance => ({
  id: instance.id + ':' + effectId,
  effectId,
  kind: 'damage',
  sourceId: instance.sourceId,
  targetId,
  params: { amount },
  origin: { kind: 'buff', id: instance.id }
});

const burnEffects = (instance: BuffInstance): EffectInstance[] => {
  const amount = instance.values.amount ?? 30 * instance.stacks;
  return [damageEffect(instance, 'burn_tick', instance.targetId, amount)];
};

const foldFlameEffects = (instance: BuffInstance, timingCtx: TurnTimingContext): EffectInstance[] => {
  const amount = instance.values.amount ?? 5;
  const targetId = timingCtx.target?.id ?? instance.targetId;
  return [damageEffect(instance, 'fold_flame_bonus', targetId, amount)];
};

const warSpiritEffects = (instance: BuffInstance, timingCtx: TurnTimingContext): EffectInstance[] => {
  const livingEnemies = timingCtx.runtime.getLivingUnits('enemy').length;
  const value = 1.5 * livingEnemies;
  return [{
    id: instance.id + ':war_spirit_recalc',
    effectId: 'war_spirit_recalc',
    kind: 'statModify',
    sourceId: instance.sourceId,
    targetId: instance.targetId,
    params: {
      modifier: {
        target: 'stat.strength',
        op: 'add',
        value,
        source: instance.id
      }
    },
    origin: { kind: 'buff', id: instance.id }
  }];
};

export const BUFF_CONFIGS: Record<string, BuffConfig> = {
  burn: {
    buffId: 'burn',
    durationKind: 'temporary',
    renew: true,
    stack: true,
    stackIncrement: 1,
    triggers: [{ timing: 'turnStart', unitRef: 'target' }],
    createEffects: (instance) => burnEffects(instance)
  },
  stun: {
    buffId: 'stun',
    durationKind: 'temporary',
    renew: true,
    stack: false,
    stackIncrement: 0,
    triggers: [{ timing: 'turnStart', unitRef: 'target' }],
    createEffects: () => []
  },
  foldFlame: {
    buffId: 'foldFlame',
    durationKind: 'forever',
    renew: false,
    stack: true,
    stackIncrement: 5,
    triggers: [{ timing: 'attackAfter', unitRef: 'target' }],
    consumeOnTrigger: true,
    createEffects: (instance, timingCtx) => foldFlameEffects(instance, timingCtx)
  },
  warSpirit: {
    buffId: 'warSpirit',
    durationKind: 'forever',
    renew: false,
    stack: false,
    stackIncrement: 0,
    triggers: [{ timing: 'turnStart', unitRef: 'target' }],
    createEffects: (instance, timingCtx) => warSpiritEffects(instance, timingCtx)
  }
};

export const getBuffConfig = (buffId: string): BuffConfig | undefined => BUFF_CONFIGS[buffId];