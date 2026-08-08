import type { BattleResult, GameState } from '../types/game';
import { combatantFromSnapshot } from './combat';
import { DEFAULT_BASE_ATTRIBUTES, DEFAULT_PRIMARY_ATTRIBUTES, DEFAULT_SPECIAL_ATTRIBUTES } from '../data/statConfig';
import { NIGHTMARE_CONFIG } from '../data/nightmareConfig';
import { simulateBattle, heroToCombatant } from './combat';
import { aggregateBonus } from './bonds';
import { addLogUpdate } from './logs';
import type { UpdateResult } from './types';

// === 梦魇泄露防御（ticket 14）：出战当前小队，炮塔开战前辅助输出一轮 ===

export type DreamLeakDefenseMethod = 'turret' | 'direct';
export type DreamLeakDefenseFailure = 'no_alert' | 'no_party' | 'wounded' | 'no_turret';

// 梦境封锁分钟数（派生自可配置秒数，供日志/UI 统一展示）
export const getDreamLockdownMinutes = (): number =>
  Math.round(NIGHTMARE_CONFIG.dreamLockdownDuration / 60);

export interface DreamLeakDefenseOutcome {
  victory: boolean;         // 防御成功（梦魇被击退）
  partyWiped: boolean;      // 小队全灭（触发重伤 + 梦境封锁）
  failure?: DreamLeakDefenseFailure;
  battle: BattleResult | null; // 实际发生的战斗（炮塔直接击杀时为 null）
}

// 梦境封锁是否生效（封锁期间梦境探索禁用）
export const isDreamLockdownActive = (state: GameState, now: number = Date.now()): boolean =>
  !!state.exploration.dreamLockdownUntil && state.exploration.dreamLockdownUntil > now;

// 剩余封锁秒数
export const getDreamLockdownRemaining = (state: GameState, now: number = Date.now()): number =>
  Math.max(0, Math.ceil(((state.exploration.dreamLockdownUntil || 0) - now) / 1000));

const fail = (state: GameState, failure: DreamLeakDefenseFailure): UpdateResult<DreamLeakDefenseOutcome> => ({
  state,
  result: { victory: false, partyWiped: false, failure, battle: null }
});

/**
 * 迎战梦魇泄露：当前上阵小队防御。
 * - 炮塔（可选）：开战前先输出一轮固定伤害（消耗 1 台），可能直接击杀
 * - 胜利 → 梦魇清除、虚空核心奖励、污染归零、小队战后修整回满血
 * - 战败（小队全灭）→ 全员重伤 + 梦境封锁（时长可配置），警报保留可再战
 * - 平局（回合上限）→ 梦魇退回阴影，警报保留，无惩罚
 */
export const defendDreamLeakUpdate = (
  state: GameState,
  method: DreamLeakDefenseMethod
): UpdateResult<DreamLeakDefenseOutcome> => {
  if (state.activeAlert.type !== 'dream_leak') return fail(state, 'no_alert');

  const party = (state.party || []).filter(id => !!state.heroes[id]);
  if (party.length === 0) return fail(state, 'no_party');
  if (party.some(id => state.heroes[id].wounded)) return fail(state, 'wounded');

  // 炮塔辅助：开战前先输出一轮
  let nightmareHp = state.activeAlert.hp;
  const nextInventory = { ...state.inventory };
  if (method === 'turret') {
    if ((nextInventory.defensive_turret || 0) < 1) return fail(state, 'no_turret');
    nextInventory.defensive_turret -= 1;
    nightmareHp -= NIGHTMARE_CONFIG.turretDamage;
  }

  const nextHeroes = { ...state.heroes };
  let battle: BattleResult | null = null;

  if (nightmareHp > 0) {
    // 梦魇也是战斗实体：与英雄/敌人同走统一实体原语（baseAttributes 缺省 = DEFAULT_BASE_ATTRIBUTES）
    const nightmare = combatantFromSnapshot('dream_leak_nightmare', NIGHTMARE_CONFIG.leakName, {
      baseAttributes: {
        ...DEFAULT_BASE_ATTRIBUTES,
        attack: NIGHTMARE_CONFIG.leakAttack,
        defense: NIGHTMARE_CONFIG.leakDefense,
        maxHp: nightmareHp
      },
      primaryAttributes: { ...DEFAULT_PRIMARY_ATTRIBUTES },
      specialAttributes: { ...DEFAULT_SPECIAL_ATTRIBUTES },
      permanentModifiers: []
    });
    battle = simulateBattle(
      party.map(id => heroToCombatant(id, state.heroes[id], aggregateBonus(party), state.equipment?.[id] || null)),
      [nightmare]
    );
  }

  const victory = nightmareHp <= 0 || (battle !== null && battle.victory);
  const partyWiped = !victory && !!battle?.partyWiped;
  const logText = victory
    ? `防御成功！小队击退了${NIGHTMARE_CONFIG.leakName}，获得虚空核心 ×1，梦境污染已净化。`
    : partyWiped
      ? `防御失败！小队全员重伤，梦境入口被封锁 ${getDreamLockdownMinutes()} 分钟，请用纳米修复剂治愈后再次迎战。`
      : `${NIGHTMARE_CONFIG.leakName}与小队僵持至回合上限，退回阴影深处，可稍后再次迎战。`;

  if (victory) {
    // 战后修整回满血（与自动战斗一致：战斗为独立"场景"）
    party.forEach(id => {
      nextHeroes[id] = { ...nextHeroes[id], hp: nextHeroes[id].maxHp };
    });
    nextInventory.void_core = (nextInventory.void_core || 0) + (NIGHTMARE_CONFIG.turretReward.void_core || 0);
  } else if (partyWiped) {
    party.forEach(id => {
      nextHeroes[id] = { ...nextHeroes[id], hp: 0, wounded: true };
    });
  }

  const nextState: GameState = {
    ...state,
    heroes: nextHeroes,
    inventory: nextInventory,
    // 非胜利时写回炮塔削减后的血量：炮塔伤害跨次防御累积，避免每轮重复满血
    activeAlert: victory
      ? { type: null, hp: 0 }
      : { type: 'dream_leak', hp: Math.max(1, nightmareHp) },
    exploration: {
      ...state.exploration,
      dreamPollution: victory ? 0 : state.exploration.dreamPollution,
      // 防御成功解除封锁；防御失败（全灭）触发封锁；平局保持原状
      dreamLockdownUntil: victory
        ? null
        : partyWiped
          ? Date.now() + NIGHTMARE_CONFIG.dreamLockdownDuration * 1000
          : state.exploration.dreamLockdownUntil
    }
  };

  return {
    state: addLogUpdate(nextState, logText, 'combat'),
    result: { victory, partyWiped, battle }
  };
};
