import { describe, it, expect } from 'vitest';
import { createSaveThrottle, AUTO_SAVE_INTERVAL_MS, sanitizeStateForCloud, mergeSavedState } from './persistence';
import { INITIAL_STATE, createInitialHero } from '../data/initialState';
import { EMPTY_IDLE_STATE } from './levelCombat';
import type { GameState } from '../types/game';

const makeState = (overrides?: Partial<GameState>): GameState => ({
  ...INITIAL_STATE,
  ...overrides
});

// 04 号 04a：自动存盘节流 —— saveState 不再每次 state 变化都全量序列化+写盘，
// 改为节流（窗口内最多一次）；显式 saveState（切换/创建/删除账号）不受影响。
describe('createSaveThrottle（04 号 04a：自动存盘节流）', () => {
  it('首次调用立即放行，窗口内拦截，窗口到期后放行', () => {
    const throttle = createSaveThrottle(AUTO_SAVE_INTERVAL_MS);
    expect(throttle(1000)).toBe(true); // 首次（lastSave 为 null）
    expect(throttle(1000 + AUTO_SAVE_INTERVAL_MS - 1)).toBe(false); // 窗口内拦截
    expect(throttle(1000 + AUTO_SAVE_INTERVAL_MS)).toBe(true); // 窗口到期放行
    expect(throttle(1000 + AUTO_SAVE_INTERVAL_MS + 1)).toBe(false); // 新窗口内拦截
  });

  it('不同实例各自独立计窗口', () => {
    const a = createSaveThrottle(5000);
    const b = createSaveThrottle(5000);
    expect(a(0)).toBe(true);
    expect(b(0)).toBe(true);
    expect(a(1000)).toBe(false);
    expect(b(1000)).toBe(false);
  });
});

describe('persistence & cloud sync isolation (combat-offline ticket 04)', () => {
  it('sanitizeStateForCloud clears combat.idle to EMPTY_IDLE_STATE while preserving all other state', () => {
    const state = makeState({
      player: { ...INITIAL_STATE.player, days: 5 },
      inventory: { scrap_metal: 99 },
      heroes: { nova: createInitialHero('nova') },
      combat: {
        ...INITIAL_STATE.combat,
        regionId: 'wasteland_entrance',
        levelId: 'wasteland_entrance_1',
        idle: {
          regionId: 'wasteland_entrance',
          levelId: 'wasteland_entrance_1',
          startTime: 12345,
          accumulatedSeconds: 100,
          totalBattles: 10,
          totalVictories: 9,
          totalDefeats: 1,
          totalDraws: 0,
          totalDrops: { scrap_metal: 50 },
          totalSoulEchoes: 20
        }
      }
    });

    const sanitized = sanitizeStateForCloud(state);

    expect(sanitized.combat.idle).toEqual(EMPTY_IDLE_STATE);
    expect(sanitized.player.days).toBe(5);
    expect(sanitized.inventory.scrap_metal).toBe(99);
    expect(sanitized.heroes.nova).toBeDefined();
    expect(sanitized.combat.regionId).toBe('wasteland_entrance');
  });

  it('mergeSavedState preserves valid combat.idle data from local save', () => {
    const savedIdle = {
      regionId: 'wasteland_entrance',
      levelId: 'wasteland_entrance_1',
      startTime: 1000,
      accumulatedSeconds: 50,
      totalBattles: 5,
      totalVictories: 4,
      totalDefeats: 1,
      totalDraws: 0,
      totalDrops: { scrap_metal: 10 },
      totalSoulEchoes: 6
    };

    const saved = makeState({
      combat: {
        ...INITIAL_STATE.combat,
        idle: savedIdle
      }
    });

    const merged = mergeSavedState(saved, INITIAL_STATE);
    expect(merged.combat.idle).toEqual(savedIdle);
  });

  it('mergeSavedState safely falls back to EMPTY_IDLE_STATE when combat.idle is corrupted or incomplete', () => {
    const corruptedSaved = makeState({
      combat: {
        ...INITIAL_STATE.combat,
        idle: {
          regionId: null,
          levelId: 'wasteland_entrance_1',
          accumulatedSeconds: -10
        } as any
      }
    });

    const merged = mergeSavedState(corruptedSaved, INITIAL_STATE);
    expect(merged.combat.idle).toEqual(EMPTY_IDLE_STATE);
  });
});
