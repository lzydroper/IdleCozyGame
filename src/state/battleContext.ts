/**
 * BattleContext：TurnRuntime + 战斗态（统一 Modifier / Buff / 标记）的聚合。
 * Effect / Buff / Ability 只依赖 BattleContext，不直接散落访问状态。
 * Buff 配置策略来自 buffTypes 注册表；applyBuff 统一 source 锁定与 Renew/Stack。
 */

import type { TurnRuntime } from './turnEngine';
import type { BattleUnitStats } from './battleTypes';
import { toBattleUnitStats } from './battleTypes';
import { toStatModifier, type Modifier, type ModifierNamespace } from './modifier';
import { calculateEntityStats, type StatModifier } from './statSystem';
import {
  BUFF_CONFIGS,
  buffModifierSource,
  type BuffApplication,
  type BuffConfig,
  type BuffInstance
} from './buffTypes';

export type { BuffApplication, BuffConfig, BuffInstance };

export interface AppliedModifier {
  id: string;
  modifier: Modifier;
}

export type BattleFlag = string;

export interface BattleContext {
  readonly turn: TurnRuntime;

  addModifier(unitId: string, modifier: Modifier): string;
  removeModifier(unitId: string, modifierId: string): boolean;
  removeModifiersBySource(unitId: string, source: string): number;
  getModifiers(unitId: string, ns?: ModifierNamespace): Modifier[];

  applyBuff(targetId: string, buff: BuffInstance): BuffApplication;
  removeBuff(targetId: string, buffId: string): boolean;
  getBuff(targetId: string, buffId: string): BuffInstance | undefined;
  listBuffs(targetId: string): BuffInstance[];

  setFlag(unitId: string, flag: BattleFlag, value: number): void;
  getFlag(unitId: string, flag: BattleFlag): number;

  canAfford(unitId: string, cost: { resource: string; amount: number }): boolean;
  spendCost(unitId: string, cost: { resource: string; amount: number }): boolean;

  resolveStats(unitId: string): BattleUnitStats;
}

export interface BuffTriggerHooks {
  /** 注册某实例的全部触发器；返回逐条注销句柄（combat-hygiene 04 / Turn #7）。 */
  register(instance: BuffInstance): Array<() => void>;
}

export const createBattleContext = (
  runtime: TurnRuntime,
  buffConfigs: Record<string, BuffConfig> = BUFF_CONFIGS,
  triggerHooks?: BuffTriggerHooks
): BattleContext => {
  const modifiersByUnit = new Map<string, AppliedModifier[]>();
  const buffsByUnit = new Map<string, BuffInstance[]>();
  const flagsByUnit = new Map<string, Map<string, number>>();
  // Buff 触发器注销句柄：按实例 id 存于 BattleContext 自身状态（combat-hygiene 04 / B§2.5，
  // 取代 buffRuntime 的模块级 WeakMap，跨上下文内聚）。
  const buffTriggerHandles = new Map<string, Array<() => void>>();
  let nextModifierId = 0;

  const removeModifiersBySourceForUnit = (unitId: string, source: string): number => {
    const list = modifiersByUnit.get(unitId);
    if (!list) return 0;
    let removed = 0;
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].modifier.source === source) {
        list.splice(i, 1);
        removed++;
      }
    }
    return removed;
  };

  // 全单位回收（combat-hygiene 04 / B§4.5）：Buff 可能给其他单位挂 Modifier，清理不得只扫 targetId。
  const removeAllModifiersBySource = (source: string): number => {
    let removed = 0;
    for (const list of modifiersByUnit.values()) {
      for (let i = list.length - 1; i >= 0; i--) {
        if (list[i].modifier.source === source) {
          list.splice(i, 1);
          removed++;
        }
      }
    }
    return removed;
  };

  return {
    turn: runtime,

    addModifier(unitId, modifier) {
      const list = modifiersByUnit.get(unitId) ?? modifiersByUnit.set(unitId, []).get(unitId)!;
      const id = `mod_${nextModifierId++}`;
      list.push({ id, modifier: { ...modifier } });
      return id;
    },

    removeModifier(unitId, modifierId) {
      const list = modifiersByUnit.get(unitId);
      if (!list) return false;
      const idx = list.findIndex(m => m.id === modifierId);
      if (idx < 0) return false;
      list.splice(idx, 1);
      return true;
    },

    removeModifiersBySource: removeModifiersBySourceForUnit,

    getModifiers(unitId, ns) {
      const list = modifiersByUnit.get(unitId) ?? [];
      const mods = list.map(m => m.modifier);
      return ns ? mods.filter(m => m.target.startsWith(ns + '.')) : mods;
    },

    applyBuff(targetId, buff) {
      const config = buffConfigs[buff.buffId];
      if (!config) {
        return { instance: { ...buff, targetId }, applied: false, reason: 'unknown', refreshed: false, stacks: buff.stacks };
      }

      const list = buffsByUnit.get(targetId) ?? buffsByUnit.set(targetId, []).get(targetId)!;
      const existing = list.find(b => b.buffId === buff.buffId);

      if (existing) {
        if (existing.sourceId !== buff.sourceId) {
          return { instance: existing, applied: false, reason: 'conflict', refreshed: false, stacks: existing.stacks };
        }

        let duration = existing.duration;
        if (config.durationKind === 'temporary' && config.renew && buff.duration !== null) {
          duration = Math.max(existing.duration ?? 0, buff.duration);
        } else if (config.durationKind === 'forever') {
          duration = null;
        }

        const stacks = config.stack
          ? existing.stacks + config.stackIncrement
          : existing.stacks;

        existing.duration = duration;
        existing.stacks = stacks;
        existing.values = { ...buff.values };
        return { instance: existing, applied: true, refreshed: true, stacks };
      }

      const instance: BuffInstance = {
        ...buff,
        targetId,
        duration: config.durationKind === 'forever' ? null : buff.duration,
        values: { ...buff.values }
      };
      list.push(instance);
      const handles = triggerHooks?.register(instance);
      if (handles && handles.length > 0) buffTriggerHandles.set(instance.id, handles);
      return { instance, applied: true, refreshed: false, stacks: instance.stacks };
    },

    removeBuff(targetId, buffId) {
      const config = buffConfigs[buffId];
      if (config && config.removable === false) return false;

      const list = buffsByUnit.get(targetId);
      if (!list) return false;
      const idx = list.findIndex(b => b.buffId === buffId);
      if (idx < 0) return false;
      const instance = list[idx];
      // 注销句柄存于本上下文（combat-hygiene 04）；Modifier 全单位回收（B§4.5）。
      for (const handle of buffTriggerHandles.get(instance.id) ?? []) handle();
      buffTriggerHandles.delete(instance.id);
      removeAllModifiersBySource(buffModifierSource(instance));
      list.splice(idx, 1);
      return true;
    },

    getBuff(targetId, buffId) {
      return (buffsByUnit.get(targetId) ?? []).find(b => b.buffId === buffId);
    },

    listBuffs(targetId) {
      return [...(buffsByUnit.get(targetId) ?? [])];
    },

    setFlag(unitId, flag, value) {
      const unitFlags = flagsByUnit.get(unitId) ?? flagsByUnit.set(unitId, new Map()).get(unitId)!;
      unitFlags.set(flag, value);
    },

    getFlag(unitId, flag) {
      return flagsByUnit.get(unitId)?.get(flag) ?? 0;
    },

    canAfford(unitId, cost) {
      if (cost.resource !== 'mp') return false;
      const unit = runtime.getUnit(unitId);
      if (!unit) return false;
      const current = unit.currentMp ?? unit.stats.maxMp;
      return current >= cost.amount;
    },

    spendCost(unitId, cost) {
      if (cost.resource !== 'mp') return false;
      const unit = runtime.getUnit(unitId);
      if (!unit) return false;
      const current = unit.currentMp ?? unit.stats.maxMp;
      if (current < cost.amount) return false;
      unit.currentMp = current - cost.amount;
      return true;
    },

    resolveStats(unitId) {
      const unit = runtime.getUnit(unitId);
      if (!unit) {
        throw new Error('resolveStats: unknown unit ' + unitId);
      }
      // 回退收紧（combat-assembly 03 / M1）：所有实体工厂均产 statParams；
      // 缺失只可能来自构造残缺，静默回退会掩盖动态 Modifier 失效。
      if (!unit.statParams) {
        throw new Error(`resolveStats: unit '${unitId}' 缺少 statParams`);
      }

      const dynamicModifiers = this.getModifiers(unitId, 'stat')
        .map(toStatModifier)
        .filter((m): m is StatModifier => m !== null);
      const calculated = calculateEntityStats(unit.statParams, [
        ...unit.statParams.permanentModifiers,
        ...dynamicModifiers
      ]);

      // 展平唯一走 toBattleUnitStats（combat-aftermath 04 N2）；maxHp ≥1 钳制已在 statSystem 计算层。
      return toBattleUnitStats(calculated);
    }
  };
};