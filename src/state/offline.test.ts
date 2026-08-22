import { describe, it, expect } from 'vitest';
import type { GameState } from '../types/game';
import { INITIAL_STATE } from '../data/initialState';
import { calculateDetailedOfflineProgress } from './offline';

const makeTestState = (overrides?: Partial<GameState>): GameState => ({
  ...INITIAL_STATE,
  ...overrides
});

describe('offline progress engine (combat-offline ticket 02)', () => {
  it('pauses idle combat during offline period and preserves combat.idle state intact', () => {
    const idleState = {
      regionId: 'zone1',
      levelId: 'zone1_1',
      startTime: 1000,
      accumulatedSeconds: 50,
      totalBattles: 10,
      totalVictories: 9,
      totalDefeats: 1,
      totalDraws: 0,
      totalDrops: { scrap: 20 },
      totalSoulEchoes: 15
    };

    const state = makeTestState({
      stamina: 30,
      maxStamina: 100,
      inventory: { scrap: 10 },
      combat: {
        ...INITIAL_STATE.combat,
        idle: idleState
      }
    });

    // 1000 seconds offline
    const { updatedState, report } = calculateDetailedOfflineProgress(state, 1000);

    // 1. combat.idle is preserved exactly as it was before offline
    expect(updatedState.combat.idle).toEqual(idleState);

    // 2. Inventory is not modified by any offline battles (only scrap: 10)
    expect(updatedState.inventory.scrap).toBe(10);

    // 3. Stamina is not consumed by combat; it recovered naturally
    // 1000s / 3s = +333.33 -> capped at maxStamina (100)
    expect(updatedState.stamina).toBe(100);
    expect(report.recoveredStamina).toBe(70);

    // 4. Report does not contain idleCombat
    expect((report as unknown as Record<string, unknown>).idleCombat).toBeUndefined();
  });

  it('keeps greenhouse and shelter facility progression working offline while combat is paused', () => {
    const state = makeTestState({
      stamina: 50,
      maxStamina: 100,
      shelter: {
        ...INITIAL_STATE.shelter,
        generatorLevel: 1, // Lv.1 generator produces energy
        maxOfflineDuration: 3600
      },
      player: {
        ...INITIAL_STATE.player,
        energy: 0,
        maxEnergy: 100
      },
      combat: {
        ...INITIAL_STATE.combat,
        idle: {
          regionId: 'zone1',
          levelId: 'zone1_1',
          startTime: 1000,
          accumulatedSeconds: 10
        }
      }
    });

    const { updatedState, report } = calculateDetailedOfflineProgress(state, 1000);

    // Combat remains paused & preserved
    expect(updatedState.combat.idle?.regionId).toBe('zone1');
    expect(updatedState.combat.idle?.accumulatedSeconds).toBe(10);

    // Generator produced energy offline (1000s * 0.005 = 5 energy)
    expect(updatedState.player.energy).toBe(5);
    expect(report.recoveredEnergy).toBe(5);

    // Stamina recovered naturally up to max (100)
    expect(updatedState.stamina).toBe(100);
    expect(report.recoveredStamina).toBe(50);
  });
});
