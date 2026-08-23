/**
 * Buff 模块类型契约（combat-buff；config-json-migration 批次③ 数据驱动改造）：
 * - 配置策略（Duration/Renew/Stack/Trigger/消耗开关/效果模板）全部为纯数据形状，json 直存；
 * - 注册表装配收口 configs/loaders/combat.loader（glob combat/buffs/*.json）；
 * - 触发结算时的公式求值与目标解析见 buffRuntime 物化器（07 号票 W1 词表）。
 */

import type { TurnEventKey } from './turnEngine';
import type { EffectKind } from './effectSystem';

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

/** Buff 效果模板：json 直存形状（07 号票 W1 词表）。 */
export interface BuffEffectTemplate {
  kind: EffectKind;
  /** 效果标签：物化 id 后缀与调试定位用。 */
  label?: string;
  /** 目标引用：holder=buff 持有者（缺省）；eventTarget=本次时机事件的目标（如折焰打被攻击者）。 */
  targetRef?: 'holder' | 'eventTarget';
  params: Record<string, unknown>;
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
  /**
   * 效果模板数组（07 号票：createEffects 函数字段退役）。
   * params 数值可含公式对象（flat/perStack/livingEnemies/attack/maxHp），
   * 物化器在触发结算时求值并填 id/sourceId/targetId/origin。
   */
  effects: BuffEffectTemplate[];
}

export interface BuffApplication {
  instance: BuffInstance;
  /** false = 不同 source 冲突拒绝（或未知 buffId 不落地）。 */
  applied: boolean;
  /** applied=false 时的细分原因：conflict=source 冲突；unknown=未注册的 buffId。 */
  reason?: 'conflict' | 'unknown';
  /** true = 命中已有实例。 */
  refreshed: boolean;
  /** 更新后的层数。 */
  stacks: number;
}

// 注册表已数据化：data/combat/buffs/<buffId>.json（config-json-migration 批次③ / 07 号票）。
// 装配与 DEV 守卫收口 configs/loaders/combat.loader——此处转发兼容存量引用。
export { BUFF_CONFIGS, getBuffConfig } from '../configs/loaders/combat.loader';

/** owned Modifier 的 source 统一标记（combat-hygiene 04 / B§4.6）：挂载与回收共用同一格式。 */
export const buffModifierSource = (instance: Pick<BuffInstance, 'id'>): string => instance.id;
