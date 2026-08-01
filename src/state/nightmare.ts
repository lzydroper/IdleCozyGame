import type { BattleResult, GameState } from '../types/game';
import type { CombatantState } from './combat';
import { NIGHTMARE_CONFIG } from '../data/nightmareConfig';
import { simulateBattle, heroToCombatant } from './combat';
import { aggregateBonus } from './bonds';
import type { UpdateResult } from './types';

// === 梦魇泄露防御（ticket 14）：出战当前小队，炮塔开战前辅助输出一轮 ===

export type DreamLeakDefenseMethod = 'turret' | 'direct';
export type DreamLeakDefenseFailure = 'no_alert' | 'no_party' | 'wounded' | 'no_turret';

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
    const nightmare: CombatantState = {
      id: 'dream_leak_nightmare',
      name: '梦魇侵入体',
      emoji: '👹',
      hp: nightmareHp,
      maxHp: nightmareHp,
      attack: NIGHTMARE_CONFIG.leakAttack,
      defense: NIGHTMARE_CONFIG.leakDefense
    };
    battle = simulateBattle(
      party.map(id => heroToCombatant(id, state.heroes[id], aggregateBonus(party), state.equipment?.[id] || null)),
      [nightmare]
    );
  }

  const victory = nightmareHp <= 0 || (battle !== null && battle.victory);
  const partyWiped = !victory && !!battle?.partyWiped;
  const logText = victory
    ? `🛡️ 防御成功！小队击退了梦魇侵入体，获得虚空核心 ×1，梦境污染已净化。`
    : partyWiped
      ? `💥 防御失败！小队全员重伤，梦境入口被封锁 ${Math.round(NIGHTMARE_CONFIG.dreamLockdownDuration / 60)} 分钟，请用纳米修复剂治愈后再次迎战。`
      : `⚔️ 梦魇与小队僵持至回合上限，退回阴影深处，可稍后再次迎战。`;

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

  return {
    state: {
      ...state,
      heroes: nextHeroes,
      inventory: nextInventory,
      activeAlert: victory ? { type: null, hp: 0 } : state.activeAlert,
      exploration: {
        ...state.exploration,
        dreamPollution: victory ? 0 : state.exploration.dreamPollution,
        dreamLockdownUntil: partyWiped
          ? Date.now() + NIGHTMARE_CONFIG.dreamLockdownDuration * 1000
          : state.exploration.dreamLockdownUntil
      },
      logs: [
        { id: `${Date.now()}_${Math.random()}`, text: logText, timestamp: Date.now(), type: 'combat' as const },
        ...state.logs
      ].slice(0, 100)
    },
    result: { victory, partyWiped, battle }
  };
};
