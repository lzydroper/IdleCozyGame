import { describe, it, expect } from 'vitest';
import type { GameState } from '../types/game';
import { INITIAL_STATE } from '../data/initialState';
import { NIGHTMARE_CONFIG } from '../data/nightmareConfig';
import {
  defendDreamLeakUpdate,
  isDreamLockdownActive,
  getDreamLockdownRemaining
} from './nightmare';
import { mergeSavedState } from './persistence';

const baseState = (): GameState => structuredClone(INITIAL_STATE);

// 触发泄露警报
const withLeak = (state: GameState, hp: number = NIGHTMARE_CONFIG.dreamLeakDamage): GameState => ({
  ...state,
  activeAlert: { type: 'dream_leak', hp },
  exploration: { ...state.exploration, dreamPollution: 100 }
});

describe('梦魇泄露防御（ticket 14）', () => {
  it('直接出战：胜利 → 警报清除、虚空核心入账、污染归零、小队战后回满血', () => {
    const state = withLeak(baseState()); // 诺娃 Lv1：攻击 35 / 防御 8，60 HP 的梦魇必败于诺娃
    const r = defendDreamLeakUpdate(state, 'direct');

    expect(r.result.failure).toBeUndefined();
    expect(r.result.victory).toBe(true);
    expect(r.result.partyWiped).toBe(false);
    expect(r.state.activeAlert.type).toBeNull();
    expect(r.state.inventory.void_core).toBe(1);
    expect(r.state.exploration.dreamPollution).toBe(0);
    expect(r.state.heroes.nova.hp).toBe(r.state.heroes.nova.maxHp);
    expect(r.state.exploration.dreamLockdownUntil).toBeNull();
  });

  it('炮塔辅助：消耗 1 台并先输出一轮；梦魇 HP 较低时直接击杀（无战斗）', () => {
    let state = withLeak(baseState(), 30); // 炮塔 35 伤害 ≥ 30 → 直接击杀
    state.inventory.defensive_turret = 1;

    const r = defendDreamLeakUpdate(state, 'turret');

    expect(r.result.victory).toBe(true);
    expect(r.result.battle).toBeNull(); // 未进入战斗
    expect(r.state.inventory.defensive_turret).toBe(0); // 已消耗
    expect(r.state.inventory.void_core).toBe(1);
    expect(r.state.activeAlert.type).toBeNull();
  });

  it('炮塔辅助：HP 较高时先扣血再进入战斗', () => {
    let state = withLeak(baseState(), NIGHTMARE_CONFIG.dreamLeakDamage); // 60
    state.inventory.defensive_turret = 1;

    const r = defendDreamLeakUpdate(state, 'turret');

    expect(r.result.victory).toBe(true);
    expect(r.result.battle).not.toBeNull();
    expect(r.state.inventory.defensive_turret).toBe(0);
  });

  it('防御失败（小队全灭）→ 全员重伤 + 梦境封锁，警报保留可再战', () => {
    let state = withLeak(baseState());
    state.heroes.nova = { ...state.heroes.nova, hp: 2 }; // 残血进场（战斗 hp ≈ 3），梦魇一轮 3 伤害 → 阵亡

    const before = Date.now();
    const r = defendDreamLeakUpdate(state, 'direct');

    expect(r.result.victory).toBe(false);
    expect(r.result.partyWiped).toBe(true);
    expect(r.state.heroes.nova.wounded).toBe(true);
    expect(r.state.heroes.nova.hp).toBe(0);
    expect(r.state.activeAlert.type).toBe('dream_leak'); // 警报保留
    expect(r.state.inventory.void_core).toBeUndefined();
    // 梦境封锁：现在 + 配置时长
    expect(r.state.exploration.dreamLockdownUntil).toBeGreaterThanOrEqual(before + NIGHTMARE_CONFIG.dreamLockdownDuration * 1000);
    expect(isDreamLockdownActive(r.state, before + NIGHTMARE_CONFIG.dreamLockdownDuration * 1000 - 1)).toBe(true);
  });

  it('非胜利时炮塔削减的血量跨次防御累积（不重复满血）', () => {
    let state = withLeak(baseState(), 200); // 高血量梦魇，诺娃一轮打不死
    state.heroes.nova = { ...state.heroes.nova, hp: 6 }; // 梦魇一轮 6 伤害 → 阵亡
    state.inventory.defensive_turret = 2;

    const r = defendDreamLeakUpdate(state, 'turret');

    expect(r.result.partyWiped).toBe(true);
    expect(r.state.activeAlert.type).toBe('dream_leak');
    expect(r.state.activeAlert.hp).toBe(200 - NIGHTMARE_CONFIG.turretDamage); // 165
    expect(r.state.inventory.defensive_turret).toBe(1);
  });

  it('防御胜利解除尚未到期的梦境封锁', () => {
    let state = withLeak(baseState());
    state.exploration.dreamLockdownUntil = Date.now() + 600_000;

    const r = defendDreamLeakUpdate(state, 'direct');

    expect(r.result.victory).toBe(true);
    expect(r.state.exploration.dreamLockdownUntil).toBeNull();
  });

  it('封锁到期后自动解除，剩余秒数计算正确', () => {
    const now = 1_000_000;
    const state = {
      ...baseState(),
      exploration: { ...baseState().exploration, dreamLockdownUntil: now + 600_000 }
    };
    expect(isDreamLockdownActive(state, now)).toBe(true);
    expect(getDreamLockdownRemaining(state, now)).toBe(600);
    expect(isDreamLockdownActive(state, now + 600_001)).toBe(false);
  });

  it('无警报 / 无小队 / 小队重伤 / 无炮塔 均拒绝防御', () => {
    expect(defendDreamLeakUpdate(baseState(), 'direct').result.failure).toBe('no_alert');

    const leakNoParty = withLeak({ ...baseState(), party: [] });
    expect(defendDreamLeakUpdate(leakNoParty, 'direct').result.failure).toBe('no_party');

    let leakWounded = withLeak(baseState());
    leakWounded.heroes.nova = { ...leakWounded.heroes.nova, wounded: true };
    expect(defendDreamLeakUpdate(leakWounded, 'direct').result.failure).toBe('wounded');

    const leakNoTurret = withLeak(baseState()); // 无炮塔库存
    const r = defendDreamLeakUpdate(leakNoTurret, 'turret');
    expect(r.result.failure).toBe('no_turret');
    expect(r.state.inventory.defensive_turret).toBeUndefined(); // 未消耗
  });
});

describe('存档迁移（ticket 14）', () => {
  it('旧存档剥离玩家 hp/maxHp，梦境封锁字段回退未封锁', () => {
    const saved = {
      ...baseState(),
      player: { ...baseState().player, hp: 55, maxHp: 100 },
      exploration: { ...baseState().exploration }
    } as unknown as GameState;

    const merged = mergeSavedState(saved, INITIAL_STATE);

    expect('hp' in merged.player).toBe(false);
    expect('maxHp' in merged.player).toBe(false);
    expect(merged.player.food).toBe(100); // 其余属性保留
    expect(merged.exploration.dreamLockdownUntil).toBeNull();
  });

  it('封锁中的存档保留截止时间戳', () => {
    const until = Date.now() + 60_000;
    const saved = {
      ...baseState(),
      exploration: { ...baseState().exploration, dreamLockdownUntil: until }
    };
    const merged = mergeSavedState(saved, INITIAL_STATE);
    expect(merged.exploration.dreamLockdownUntil).toBe(until);
  });
});
