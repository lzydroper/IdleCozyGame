import { describe, it, expect } from 'vitest';
import type { GameState } from '../types/game';
import { INITIAL_STATE, createInitialHero } from '../data/initialState';
import { COMBAT_ZONES, COMBAT_ZONE_LIST } from '../data/combatZones';
import { COMBAT_CONFIG } from '../data/combatConfig';
import { startIdleUpdate, stopIdleUpdate, settleIdleUpdate } from './combat';
import { calculateDetailedOfflineProgress } from './offline';

const makeState = (overrides?: Partial<GameState>): GameState => ({
  ...INITIAL_STATE,
  ...overrides
});

const armed = (zoneId: string, startTime = 1000): Partial<GameState> => ({
  combat: { ...INITIAL_STATE.combat, idle: { zoneId, startTime } }
});

// 可编程 RNG：按序列循环返回（每场战斗的掉落判定/数量/残响调用顺序一致）
const sequenceRng = (values: number[]): (() => number) => {
  let i = 0;
  return () => values[i++ % values.length];
};

// 强队（诺娃 + 铁卫）打首区 → 必胜；每次胜利战后修整满血
const WINNING_STATE = makeState({
  party: ['nova', 'soldier'],
  heroes: {
    nova: createInitialHero('nova'),
    soldier: createInitialHero('soldier')
  },
  inventory: { scrap_metal: 0, glow_fiber: 0 },
  soulEchoes: 0
});

describe('startIdleUpdate / stopIdleUpdate (挂机开关)', () => {
  it('arms idle in an unlocked zone with a startTime', () => {
    const { state: next, result } = startIdleUpdate(makeState(), 'wasteland_entrance', 5000);
    expect(result.ok).toBe(true);
    expect(result.failure).toBeUndefined();
    expect(next.combat.idle).toEqual({ zoneId: 'wasteland_entrance', startTime: 5000 });
    // 仅开启开关：不立即战斗、不消耗体力
    expect(next.stamina).toBe(INITIAL_STATE.stamina);
    expect(next.combat.lastSettlement).toBeNull();
  });

  it('rejects unknown zone / locked zone without state change', () => {
    const state = makeState();
    const unknown = startIdleUpdate(state, 'unknown_zone');
    expect(unknown.result.failure).toBe('unknown_zone');
    expect(unknown.state).toBe(state);

    const lockedState = makeState();
    const locked = startIdleUpdate(lockedState, COMBAT_ZONE_LIST[1].id);
    expect(locked.result.failure).toBe('locked');
    expect(locked.state).toBe(lockedState);
  });

  it('rejects empty party / wounded hero / insufficient stamina', () => {
    const noParty = startIdleUpdate(makeState({ party: [] }), 'wasteland_entrance');
    expect(noParty.result.failure).toBe('no_party');

    const wounded = startIdleUpdate(makeState({
      heroes: { nova: { ...createInitialHero('nova'), wounded: true } }
    }), 'wasteland_entrance');
    expect(wounded.result.failure).toBe('wounded');

    const noStamina = startIdleUpdate(makeState({
      stamina: COMBAT_ZONES.wasteland_entrance.staminaCost - 1
    }), 'wasteland_entrance');
    expect(noStamina.result.failure).toBe('no_stamina');
  });

  it('rejects arming a second zone while already idling', () => {
    const state = makeState(armed('wasteland_entrance'));
    const { state: next, result } = startIdleUpdate(state, 'old_town_ruins');
    expect(result.failure).toBe('already_idling');
    expect(next.combat.idle.zoneId).toBe('wasteland_entrance'); // 原挂机不受影响
  });

  it('stops idle and preserves remaining stamina', () => {
    const state = makeState({ ...armed('wasteland_entrance'), stamina: 37 });
    const { state: next, result } = stopIdleUpdate(state);
    expect(result).toBe(true);
    expect(next.combat.idle.zoneId).toBeNull();
    expect(next.stamina).toBe(37); // 手动停止后体力保留
  });

  it('stopping when not idling is a no-op', () => {
    const state = makeState();
    const { state: next, result } = stopIdleUpdate(state);
    expect(result).toBe(false);
    expect(next).toBe(state);
  });
});

describe('settleIdleUpdate (离线挂机结算)', () => {
  it('does nothing when idle is not armed (未开启时离线不产生任何战斗结算)', () => {
    const { state: next, result } = settleIdleUpdate(WINNING_STATE, 10000);
    expect(result.battlesFought).toBe(0);
    expect(next).toBe(WINNING_STATE);
    expect(next.stamina).toBe(WINNING_STATE.stamina);
  });

  it('does nothing when elapsed time is zero', () => {
    const state = makeState({ ...armed('wasteland_entrance'), stamina: 100 });
    const { state: next, result } = settleIdleUpdate(state, 0);
    expect(result.battlesFought).toBe(0);
    expect(next).toBe(state);
    expect(next.combat.idle.zoneId).toBe('wasteland_entrance'); // 挂机开关保留
  });

  it('fights battles limited by stamina, accumulates drops/exp, auto-stops on exhaustion', () => {
    const state = makeState({
      ...WINNING_STATE,
      ...armed('wasteland_entrance'),
      stamina: 100,
      inventory: { scrap_metal: 0, glow_fiber: 0 },
      soulEchoes: 0
    });
    // 每场：scrap 命中取 max(2) + glow_fiber 命中取 max(2) + 灵魂残响取 max(4)
    const rng = sequenceRng([0.1, 0.99, 0.1, 0.99, 0.99]);
    // 1000s / 20s = 50 场（时间允许），但体力 100 / 10 = 10 场 → 体力受限
    const { state: next, result } = settleIdleUpdate(state, 1000, rng);

    expect(result.battlesFought).toBe(10);
    expect(result.victories).toBe(10);
    expect(result.defeats).toBe(0);
    expect(result.staminaConsumed).toBe(100);
    expect(next.stamina).toBe(0);
    // 自动停止：体力耗尽
    expect(result.autoStopped).toBe(true);
    expect(result.stopReason).toBe('stamina');
    expect(next.combat.idle.zoneId).toBeNull();
    // 掉落累计入账（10 场 × scrap 2 / glow_fiber 2）
    expect(result.drops.scrap_metal).toBe(20);
    expect(result.drops.glow_fiber).toBe(20);
    expect(next.inventory.scrap_metal).toBe(20);
    expect(next.inventory.glow_fiber).toBe(20);
    // 灵魂残响与经验累计
    expect(result.soulEchoesGained).toBe(40);
    expect(next.soulEchoes).toBe(40);
    expect(result.expPerHero).toBe(10 * COMBAT_ZONES.wasteland_entrance.expReward);
    // 200 总经验/英雄：升 2 级消耗 100（level 1 * expPerLevel），余 100
    expect(next.heroes.nova.exp).toBe(100);
    expect(next.heroes.nova.level).toBe(2);
    // 战后修整：每次胜利后满血
    expect(next.heroes.nova.hp).toBe(next.heroes.nova.maxHp);
    expect(next.heroes.nova.wounded).toBe(false);
  });

  it('stops automatically when the party is defeated mid-idle (战败重伤)', () => {
    // 单诺娃强开挂机于第三区（辐射车间）→ 第一场即战败
    const state = makeState({
      ...armed('radiated_workshop'),
      party: ['nova'],
      heroes: { nova: createInitialHero('nova') },
      stamina: 100,
      inventory: { scrap_metal: 5 },
      soulEchoes: 5
    });
    const { state: next, result } = settleIdleUpdate(state, 10000);

    expect(result.battlesFought).toBe(1);
    expect(result.defeats).toBe(1);
    expect(result.victories).toBe(0);
    expect(result.autoStopped).toBe(true);
    expect(result.stopReason).toBe('defeat');
    expect(next.combat.idle.zoneId).toBeNull();
    expect(next.heroes.nova.wounded).toBe(true);
    expect(next.heroes.nova.hp).toBe(0);
    expect(next.inventory.scrap_metal).toBe(5); // 战败无掉落
    expect(next.soulEchoes).toBe(5);            // 战败无灵魂残响
    expect(next.stamina).toBe(100 - COMBAT_ZONES.radiated_workshop.staminaCost); // 体力照常消耗
  });

  it('caps settlement time by maxIdleSettlementSeconds (挂机结算时间上限配置)', () => {
    const state = makeState({
      ...WINNING_STATE,
      ...armed('wasteland_entrance'),
      stamina: 100000,
      soulEchoes: 0
    });
    // 100 小时离线 → 上限 maxIdleSettlementSeconds = 8h → 28800/20 = 1440 场
    const { state: next, result } = settleIdleUpdate(state, 100 * 3600, () => 0.99);

    expect(result.battlesFought).toBe(COMBAT_CONFIG.maxIdleSettlementSeconds / COMBAT_CONFIG.battleDurationSeconds);
    expect(result.autoStopped).toBe(false);            // 体力未耗尽
    expect(next.combat.idle.zoneId).toBe('wasteland_entrance'); // 挂机开关保留
    expect(next.stamina).toBe(100000 - result.staminaConsumed);
  });

  it('keeps the idle armed when elapsed time is shorter than one battle', () => {
    const state = makeState({ ...WINNING_STATE, ...armed('wasteland_entrance'), stamina: 100 });
    const { state: next, result } = settleIdleUpdate(state, 10);
    expect(result.battlesFought).toBe(0);
    expect(next.combat.idle.zoneId).toBe('wasteland_entrance');
    expect(next.stamina).toBe(100);
  });

  it('auto-stops with stamina exhausted when stamina is already below one battle (在线耗尽后离线)', () => {
    // 挂机开启后玩家在线把体力打到不足一场再离线 → 无法结算任何战斗，视为体力耗尽自动停止
    const state = makeState({ ...WINNING_STATE, ...armed('wasteland_entrance'), stamina: 5 });
    const { state: next, result } = settleIdleUpdate(state, 10000);
    expect(result.battlesFought).toBe(0);
    expect(result.autoStopped).toBe(true);
    expect(result.stopReason).toBe('stamina');
    expect(next.combat.idle.zoneId).toBeNull();
    expect(next.stamina).toBe(5); // 剩余体力保留
  });

  it('defensively stops idle when the zone is unknown (数据防御)', () => {
    const state = makeState({ ...armed('ghost_zone'), stamina: 100 });
    const { state: next, result } = settleIdleUpdate(state, 1000);
    expect(result.battlesFought).toBe(0);
    expect(next.combat.idle.zoneId).toBeNull();
  });
});

describe('calculateDetailedOfflineProgress + 挂机 (重连结算)', () => {
  it('settles idle battles and reports drops/exp in the offline report', () => {
    const state = makeState({
      ...armed('wasteland_entrance'),
      party: ['nova', 'soldier'],
      heroes: {
        nova: createInitialHero('nova'),
        soldier: createInitialHero('soldier')
      },
      stamina: 100,
      inventory: { scrap_metal: 0, glow_fiber: 0 },
      soulEchoes: 0
    });
    const rng = sequenceRng([0.1, 0.99, 0.1, 0.99, 0.99]);
    const { updatedState, report } = calculateDetailedOfflineProgress(state, 1000, rng);

    expect(report.idleCombat).not.toBeNull();
    expect(report.idleCombat!.zoneId).toBe('wasteland_entrance');
    expect(report.idleCombat!.zoneName).toBe('废土边缘');
    expect(report.idleCombat!.battlesFought).toBe(10);
    expect(report.idleCombat!.victories).toBe(10);
    expect(report.idleCombat!.drops.scrap_metal).toBe(20);
    expect(report.idleCombat!.soulEchoesGained).toBe(40);
    expect(report.idleCombat!.expPerHero).toBe(200);
    expect(report.idleCombat!.autoStopped).toBe(true);
    expect(report.idleCombat!.stopReason).toBe('stamina');
    expect(report.logs.some(l => l.includes('挂机战斗'))).toBe(true);

    // 状态同步：体力耗尽、挂机自动停止、掉落与经验入账
    expect(updatedState.stamina).toBe(0);
    expect(updatedState.combat.idle.zoneId).toBeNull();
    expect(updatedState.inventory.scrap_metal).toBe(20);
    // 200 总经验/英雄：升 2 级消耗 100，余 100
    expect(updatedState.heroes.nova.exp).toBe(100);
    expect(updatedState.heroes.nova.level).toBe(2);
  });

  it('produces no combat settlement when idle is not armed', () => {
    const state = makeState({
      party: ['nova', 'soldier'],
      heroes: {
        nova: createInitialHero('nova'),
        soldier: createInitialHero('soldier')
      },
      stamina: 100
    });
    const { updatedState, report } = calculateDetailedOfflineProgress(state, 1000);
    expect(report.idleCombat).toBeNull();
    expect(updatedState.combat.idle.zoneId).toBeNull();
    expect(updatedState.heroes.nova.exp).toBe(0);
  });

  it('keeps idle armed and reports nothing when offline time is shorter than one battle', () => {
    const state = makeState({
      ...WINNING_STATE,
      ...armed('wasteland_entrance'),
      stamina: 100
    });
    const { updatedState, report } = calculateDetailedOfflineProgress(state, 10);
    expect(report.idleCombat).toBeNull();
    expect(updatedState.combat.idle.zoneId).toBe('wasteland_entrance');
  });

  it('reports an auto-stop with zero battles when stamina was already below one battle', () => {
    const state = makeState({
      ...WINNING_STATE,
      ...armed('wasteland_entrance'),
      stamina: 5
    });
    // 离线 12s：体力仅恢复 4 点（9 < 10），仍不足一场 → 自动停止、零结算
    const { updatedState, report } = calculateDetailedOfflineProgress(state, 12);
    expect(report.idleCombat).not.toBeNull();
    expect(report.idleCombat!.battlesFought).toBe(0);
    expect(report.idleCombat!.autoStopped).toBe(true);
    expect(report.idleCombat!.stopReason).toBe('stamina');
    expect(report.logs.some(l => l.includes('挂机已自动停止'))).toBe(true);
    expect(updatedState.combat.idle.zoneId).toBeNull();
    expect(updatedState.stamina).toBe(9); // 恢复后保留，未消耗
  });

  it('logs a defensive stop when the party became invalid while armed', () => {
    const state = makeState({
      ...armed('wasteland_entrance'),
      party: [], // 挂机开启后队伍被清空 → 无法结算
      stamina: 100
    });
    const { updatedState, report } = calculateDetailedOfflineProgress(state, 10000);
    expect(report.idleCombat).toBeNull();
    expect(report.logs.some(l => l.includes('队伍状态异常'))).toBe(true);
    expect(updatedState.combat.idle.zoneId).toBeNull();
  });
});
