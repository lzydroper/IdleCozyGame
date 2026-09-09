/**
 * 套装被动（heroes-skills spec §3）：
 * 三槽穿齐同系列 → 出现该套装的唯一被动，强度按最低强化件线性插值（短板定值），
 * 装配期烘焙进公式叶后作为普通 passive ResolvedAbility 进入 abilityPassive 管线——零引擎改动。
 */
import { EQUIPMENT_CONFIG, EQUIPMENT_SETS } from '../configs/loaders/equipment.loader';
import { getAbilityConfig } from '../configs/loaders/combat.loader';
import { resolveAbilityConfig, type ResolvedAbility } from './abilityTypes';
import { scaleFormulaLeaves } from './heroSkills';
import type { HeroEquipment, EquipmentSlot } from '../types/game';
import type { SetPassiveDef } from '../configs/types/equipment.types';

const SLOTS: readonly EquipmentSlot[] = ['weapon', 'armor', 'trinket'];

export interface CompleteSetInfo {
  setId: string;
  /** 三件中的最低强化等级（短板定值）。 */
  minEnhance: number;
}

/** 穿齐判定：三槽全满且同系列才返回该系列与 min(enhance)；否则 null。 */
export const detectCompleteSet = (equip: HeroEquipment | null): CompleteSetInfo | null => {
  if (!equip) return null;
  const pieces = SLOTS.map(slot => equip[slot]).filter((item): item is NonNullable<typeof item> => !!item);
  if (pieces.length < SLOTS.length) return null;
  const setIds = new Set(
    pieces.map(piece => EQUIPMENT_CONFIG[piece.itemId]?.set).filter((setId): setId is string => !!setId)
  );
  if (setIds.size !== 1) return null;
  const setId = [...setIds][0];
  if (!EQUIPMENT_SETS[setId]) return null;
  return { setId, minEnhance: Math.min(...pieces.map(piece => piece.enhance)) };
};

/** 强度系数：S = 1 + enhanceGrowth × min(enhance)。 */
export const setPassiveFactor = (def: SetPassiveDef, minEnhance: number): number =>
  1 + Math.max(0, def.enhanceGrowth ?? 0) * Math.max(0, minEnhance);

/** 单条套装被动定义解析：引用注册表或内联本体（必须 activation==='passive'），公式叶乘 S。 */
export const resolveSetPassiveDef = (def: SetPassiveDef, minEnhance: number): ResolvedAbility | null => {
  const base = def.abilityId ? getAbilityConfig(def.abilityId) : def.ability;
  if (!base || base.activation !== 'passive') return null; // 被动通道只收 passive；纯数值走 tierEffects
  const resolved = resolveAbilityConfig(base);
  const factor = setPassiveFactor(def, minEnhance);
  const scaleEffects = (
    effects: ResolvedAbility['effects']
  ): ResolvedAbility['effects'] =>
    effects.map(effect => ({ ...effect, params: scaleFormulaLeaves(effect.params, factor) }));
  return {
    ...resolved,
    effects: scaleEffects(resolved.effects),
    // 被动本体的效果住在 passive.effects（编译进 forever Buff 的就是它），同样吃 S
    ...(resolved.passive
      ? { passive: { ...resolved.passive, effects: scaleEffects(resolved.passive.effects) } }
      : {})
  };
};

/** 英雄当前套装被动：未穿齐 / 该系列未定义 → null。战斗装配与装备面板展示共用同一出口。 */
export const resolveHeroSetPassive = (equip: HeroEquipment | null): ResolvedAbility | null => {
  const detected = detectCompleteSet(equip);
  if (!detected) return null;
  const def = (EQUIPMENT_SETS[detected.setId].passiveSkills ?? [])[0];
  if (!def) return null;
  return resolveSetPassiveDef(def, detected.minEnhance);
};
