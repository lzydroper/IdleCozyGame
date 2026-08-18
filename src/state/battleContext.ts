/**
 * BattleContext：TurnRuntime + 战斗态（统一 Modifier / Buff / 标记）的聚合。
 * Effect / Buff / Ability 只依赖 BattleContext，不直接散落访问状态。
 * Buff 完整语义（Renew/Stack/触发注册）由后续 Buff 模块实现；此处提供占位契约。
 */

import type { TurnRuntime } from './turnEngine';
import type { Modifier, ModifierNamespace } from './modifier';

export interface BuffInstance {
  id: string;
  buffId: string;
  sourceId: string;
  targetId: string;
  stacks: number;
  /** 剩余持续轮数；null = 永久（forever）。 */
  duration: number | null;
  [key: string]: unknown;
}

export interface AppliedModifier {
  id: string;
  modifier: Modifier;
}

export interface BuffApplication {
  instance: BuffInstance;
  refreshed: boolean;
  stacks: number;
}

export type BattleFlag = string;

export interface BattleContext {
  readonly turn: TurnRuntime;
  readonly rng: () => number;

  addModifier(unitId: string, modifier: Modifier): string;
  removeModifier(unitId: string, modifierId: string): boolean;
  getModifiers(unitId: string, ns?: ModifierNamespace): Modifier[];

  applyBuff(targetId: string, buff: BuffInstance): BuffApplication;
  removeBuff(targetId: string, buffId: string): boolean;
  getBuff(targetId: string, buffId: string): BuffInstance | undefined;
  listBuffs(targetId: string): BuffInstance[];

  setFlag(unitId: string, flag: BattleFlag, value: number): void;
  getFlag(unitId: string, flag: BattleFlag): number;
}

export interface BattleContextInitialState {
  modifiersByUnit?: Record<string, AppliedModifier[]>;
  buffsByUnit?: Record<string, BuffInstance[]>;
  flagsByUnit?: Record<string, Record<string, number>>;
}

export const createBattleContext = (
  runtime: TurnRuntime,
  initialState: BattleContextInitialState = {}
): BattleContext => {
  const modifiersByUnit = new Map<string, AppliedModifier[]>();
  const buffsByUnit = new Map<string, BuffInstance[]>();
  const flagsByUnit = new Map<string, Map<string, number>>();
  let nextModifierId = 0;

  for (const [unitId, mods] of Object.entries(initialState.modifiersByUnit ?? {})) {
    modifiersByUnit.set(unitId, mods.map(m => ({ ...m })));
  }
  for (const [unitId, buffs] of Object.entries(initialState.buffsByUnit ?? {})) {
    buffsByUnit.set(unitId, buffs.map(b => ({ ...b })));
  }
  for (const [unitId, flags] of Object.entries(initialState.flagsByUnit ?? {})) {
    flagsByUnit.set(unitId, new Map(Object.entries(flags)));
  }

  return {
    turn: runtime,
    rng: runtime.rng,

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

    getModifiers(unitId, ns) {
      const list = modifiersByUnit.get(unitId) ?? [];
      const mods = list.map(m => m.modifier);
      return ns ? mods.filter(m => m.target.startsWith(ns + '.')) : mods;
    },

    applyBuff(targetId, buff) {
      const list = buffsByUnit.get(targetId) ?? buffsByUnit.set(targetId, []).get(targetId)!;
      const existing = list.find(b => b.buffId === buff.buffId);
      if (existing) {
        return { instance: existing, refreshed: true, stacks: existing.stacks };
      }
      const instance: BuffInstance = { ...buff, targetId };
      list.push(instance);
      return { instance, refreshed: false, stacks: instance.stacks };
    },

    removeBuff(targetId, buffId) {
      const list = buffsByUnit.get(targetId);
      if (!list) return false;
      const idx = list.findIndex(b => b.buffId === buffId);
      if (idx < 0) return false;
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
    }
  };
};
