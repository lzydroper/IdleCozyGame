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

// 已通关首区的状态（修复：挂机仅允许在已通关区域开启）
const clearedEntrance = (overrides?: Partial<GameState>): GameState =>
  makeState({
    combat: { ...INITIAL_STATE.combat, zonesCleared: ['wasteland_entrance'] },
    ...overrides
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
  inventory: { scrap_metal: 0, glow_fiber: 0 }
});

describe('startIdleUpdate / stopIdleUpdate (挂机开关)', () => {
  it('arms idle in a cleared zone with a startTime and accumulatedSeconds', () => {
    const { state: next, result } = startIdleUpdate(clearedEntrance(), 'wasteland_entrance', 5000);
    expect(result.ok).toBe(true);
    expect(result.failure).toBeUndefined();
    expect(next.combat.idle).toEqual({ zoneId: 'wasteland_entrance', startTime: 5000, accumulatedSeconds: 0 });
    // 仅开启开关：不立即战斗、不消耗体力
    expect(next.stamina).toBe(INITIAL_STATE.stamina);
    expect(next.combat.lastSettlement).toBeNull();
  });

  it('rejects unknown zone / not-cleared zone without state change', () => {
    const state = makeState();
    const unknown = startIdleUpdate(state, 'unknown_zone');
    expect(unknown.result.failure).toBe('unknown_zone');
    expect(unknown.state).toBe(state);

    // 未通关（含首区）→ locked（修复：挂机必须已通关）
    const notClearedFirst = startIdleUpdate(makeState(), 'wasteland_entrance');
    expect(notClearedFirst.result.failure).toBe('locked');

    const lockedState = makeState();
    const locked = startIdleUpdate(lockedState, COMBAT_ZONE_LIST[1].id);
    expect(locked.result.failure).toBe('locked');
    expect(locked.state).toBe(lockedState);
  });

  it('rejects empty party / wounded hero / insufficient stamina', () => {
    const noParty = startIdleUpdate(clearedEntrance({ party: [] }), 'wasteland_entrance');
    expect(noParty.result.failure).toBe('no_party');

    const wounded = startIdleUpdate(clearedEntrance({
      heroes: { nova: { ...createInitialHero('nova'), wounded: true } }
    }), 'wasteland_entrance');
    expect(wounded.result.failure).toBe('wounded');

    const noStamina = startIdleUpdate(clearedEntrance({
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

  it('accumulates battle seconds across online ticks (修复 09：在线逐秒累计，够一场结算一场)', () => {
    const state = makeState({
      ...WINNING_STATE,
      combat: {
        ...INITIAL_STATE.combat,
        zonesCleared: ['wasteland_entrance'],
        idle: { zoneId: 'wasteland_entrance', startTime: 1000, accumulatedSeconds: 0 }
      },
      stamina: 100
    });
    // 15 秒：不够一场（battleDurationSeconds=20），不结算，秒数保留
    const r1 = settleIdleUpdate(state, 15, sequenceRng([0.1, 0.99, 0.1, 0.99]));
    expect(r1.result.battlesFought).toBe(0);
    expect(r1.state.combat.idle.accumulatedSeconds).toBe(15);
    expect(r1.state.combat.lastSettlement).toBeNull();
    // 再 5 秒：累计 20 → 结算 1 场，剩余 0
    const r2 = settleIdleUpdate(r1.state, 5, sequenceRng([0.1, 0.99, 0.1, 0.99]));
    expect(r2.result.battlesFought).toBe(1);
    expect(r2.result.victories).toBe(1);
    expect(r2.state.combat.idle.accumulatedSeconds).toBe(0);
    // 写最近一场回放（挂机战斗后回放区可查看）
    expect(r2.state.combat.lastSettlement).not.toBeNull();
    expect(r2.state.combat.lastSettlement?.battle.victory).toBe(true);
    // 体力已消耗（含每场 10 点），但挂机保持
    expect(r2.state.stamina).toBeLessThan(100);
    expect(r2.state.combat.idle.zoneId).toBe('wasteland_entrance');
  });

  it('keeps idling and waits for stamina recovery online (autoStopOnEmptyStamina=false)', () => {
    const state = makeState({
      ...WINNING_STATE,
      combat: {
        ...INITIAL_STATE.combat,
        zonesCleared: ['wasteland_entrance'],
        idle: { zoneId: 'wasteland_entrance', startTime: 1000, accumulatedSeconds: 0 }
      },
      stamina: COMBAT_ZONES.wasteland_entrance.staminaCost - 1 // 不足一场
    });
    // 在线（false）：体力不足 → 不自动停止，挂机保持，秒数继续累计
    const r = settleIdleUpdate(state, 30, sequenceRng([0.1]), false);
    expect(r.result.battlesFought).toBe(0);
    expect(r.result.autoStopped).toBe(false);
    expect(r.state.combat.idle.zoneId).toBe('wasteland_entrance');
    expect(r.state.combat.idle.accumulatedSeconds).toBe(30);
    // 离线默认（true）：体力不足 → 自动停止
    const rOffline = settleIdleUpdate(state, 30, sequenceRng([0.1]));
    expect(rOffline.result.autoStopped).toBe(true);
    expect(rOffline.result.stopReason).toBe('stamina');
    expect(rOffline.state.combat.idle.zoneId).toBeNull();
  });

  it('fights battles limited by stamina, accumulates drops/exp, auto-stops on exhaustion', () => {
    const state = makeState({
      ...WINNING_STATE,
      ...armed('wasteland_entrance'),
      stamina: 100,
      inventory: { scrap_metal: 0, glow_fiber: 0 }
    });
    // 每场：scrap 命中取 max(2) + glow_fiber 命中取 max(2) + enhance_stone 命中取 max(2) + exp_tome 命中取 1 + 灵魂残响取 max(4)
    const rng = sequenceRng([0.1, 0.99, 0.1, 0.99, 0.1, 0.99, 0.1, 0.99, 0.99]);
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
    // 掉落累计入账（10 场 × scrap 2 / glow_fiber 2 / enhance_stone 2 / exp_tome 1）
    expect(result.drops.scrap_metal).toBe(20);
    expect(result.drops.glow_fiber).toBe(20);
    expect(result.drops.enhance_stone).toBe(20);
    expect(result.drops.exp_tome).toBe(10);
    expect(next.inventory.scrap_metal).toBe(20);
    expect(next.inventory.glow_fiber).toBe(20);
    expect(next.inventory.enhance_stone).toBe(20);
    expect(next.inventory.exp_tome).toBe(10);
    // 灵魂残响与经验累计
    expect(result.soulEchoesGained).toBe(40);
    expect(next.inventory.soul_echo).toBe(40);
    expect(result.expPerHero).toBe(10 * COMBAT_ZONES.wasteland_entrance.expReward);
    // 200 总经验/英雄：升 2 级消耗 100（level 1 * expPerLevel），余 100
    expect(next.heroes.nova.exp).toBe(100);
    expect(next.heroes.nova.level).toBe(2);
    // 战后修整：每次胜利后满血
    expect(next.heroes.nova.hp).toBe(next.heroes.nova.maxHp);
    expect(next.heroes.nova.wounded).toBe(false);
  });

  it('stops automatically when the party is defeated mid-idle (战败重伤)', () => {
    // 单残血诺娃强开挂机于第三区（辐射车间）→ 第一场即战败
    const state = makeState({
      ...armed('radiated_workshop'),
      party: ['nova'],
      heroes: { nova: { ...createInitialHero('nova'), hp: 5 } }, // 残血进场（战斗 hp ≈ 7）必败
      stamina: 100,
      inventory: { scrap_metal: 5, soul_echo: 5 }
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
    expect(next.inventory.soul_echo).toBe(5);   // 战败无灵魂残响
    expect(next.stamina).toBe(100 - COMBAT_ZONES.radiated_workshop.staminaCost); // 体力照常消耗
  });

  it('caps settlement time by maxIdleSettlementSeconds (挂机结算时间上限配置)', () => {
    const state = makeState({
      ...WINNING_STATE,
      ...armed('wasteland_entrance'),
      stamina: 100000
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
  it('settles idle battles and reports drops/exp in the offline report', () => {    const state = makeState({
      ...armed('wasteland_entrance'),
      party: ['nova', 'soldier'],
      heroes: {
        nova: createInitialHero('nova'),
        soldier: createInitialHero('soldier')
      },
      stamina: 100,
      inventory: { scrap_metal: 0, glow_fiber: 0 }
    });
    const rng = sequenceRng([0.1, 0.99, 0.1, 0.99, 0.1, 0.99, 0.1, 0.99, 0.99]);
    const { updatedState, report } = calculateDetailedOfflineProgress(state, 1000, rng);

    expect(report.idleCombat).not.toBeNull();
    expect(report.idleCombat!.zoneId).toBe('wasteland_entrance');
    expect(report.idleCombat!.zoneName).toBe('废土边缘');
    expect(report.idleCombat!.battlesFought).toBe(10);
    expect(report.idleCombat!.victories).toBe(10);
    expect(report.idleCombat!.drops.scrap_metal).toBe(20);
    expect(report.idleCombat!.drops.enhance_stone).toBe(20);
    expect(report.idleCombat!.drops.exp_tome).toBe(10);
    expect(report.idleCombat!.soulEchoesGained).toBe(40);
    expect(report.idleCombat!.expPerHero).toBe(200);
    expect(report.idleCombat!.autoStopped).toBe(true);
    expect(report.idleCombat!.stopReason).toBe('stamina');
    expect(report.logs.some(l => l.includes('挂机战斗'))).toBe(true);

    // 状态同步：体力耗尽、挂机自动停止、掉落与经验入账
    expect(updatedState.stamina).toBe(0);
    expect(updatedState.combat.idle.zoneId).toBeNull();
    expect(updatedState.inventory.scrap_metal).toBe(20);
    expect(updatedState.inventory.enhance_stone).toBe(20);
    // 200 总经验/英雄：升 2 级消耗 100，余 100
    expect(updatedState.heroes.nova.exp).toBe(100);
    expect(updatedState.heroes.nova.level).toBe(2);
  });

  it('keeps equipmentInventory through offline settlement (ADR-0017 修订)', () => {
    const state = makeState({
      ...armed('wasteland_entrance'),
      stamina: 100,
      inventory: { scrap_metal: 0, glow_fiber: 0 },
      equipmentInventory: { wasteland_weapon: [{ itemId: 'wasteland_weapon', enhance: 0, mythic: false }] }
    });
    const rng = sequenceRng([0.1, 0.99, 0.1, 0.99, 0.1, 0.99, 0.99]);
    const { updatedState } = calculateDetailedOfflineProgress(state, 1000, rng);

    // 挂机结算后背包装备实例透传保留（离线掉落装备同样实例化入账，不落入计数背包）
    expect(updatedState.equipmentInventory.wasteland_weapon).toEqual([
      { itemId: 'wasteland_weapon', enhance: 0, mythic: false }
    ]);
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
