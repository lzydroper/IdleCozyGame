// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { calculateOfflineProgress, calculateDetailedOfflineProgress, GameProvider, useGame } from './GameContext';
import { CROPS_CONFIG } from '../data/crops';
import type { GreenhouseSlot, GameState } from '../types/game';

// 模拟作物配置表
const MOCK_CROPS_CONFIG: Record<string, { growthTime: number }> = {
  glow_grass: { growthTime: 100 },
  aether_berry: { growthTime: 300 }
};

describe('Game State Tick & Offline Calculation', () => {
  it('should correctly advance plant growth based on elapsed seconds', () => {
    const initialSlots: GreenhouseSlot[] = [
      { id: 1, cropId: 'glow_grass', growthProgress: 0, growthTimeLeft: 100, isWatered: false }
    ];
    
    // 模拟过去 50 秒
    const updatedSlots = calculateOfflineProgress(initialSlots, 50, MOCK_CROPS_CONFIG);
    
    expect(updatedSlots[0].growthTimeLeft).toBe(50);
    expect(updatedSlots[0].growthProgress).toBe(50);
  });

  it('should double growth speed if slot is watered', () => {
    const initialSlots: GreenhouseSlot[] = [
      { id: 1, cropId: 'glow_grass', growthProgress: 0, growthTimeLeft: 100, isWatered: true }
    ];
    
    // 模拟过去 20 秒，浇水时 1 秒扣 2 秒
    const updatedSlots = calculateOfflineProgress(initialSlots, 20, MOCK_CROPS_CONFIG);
    
    expect(updatedSlots[0].growthTimeLeft).toBe(60);
    expect(updatedSlots[0].growthProgress).toBe(40);
  });

  it('should cap growth progress at 100 and growthTimeLeft at 0', () => {
    const initialSlots: GreenhouseSlot[] = [
      { id: 1, cropId: 'glow_grass', growthProgress: 80, growthTimeLeft: 20, isWatered: false }
    ];
    
    // 模拟过去 30 秒，超出生长所需剩余时间
    const updatedSlots = calculateOfflineProgress(initialSlots, 30, MOCK_CROPS_CONFIG);
    
    expect(updatedSlots[0].growthTimeLeft).toBe(0);
    expect(updatedSlots[0].growthProgress).toBe(100);
  });
});

// 临时消费组件用于测试 Context 状态
const TestConsumer = ({
  actionRef,
  onState
}: {
  actionRef: React.MutableRefObject<any>;
  onState: (state: any) => void;
}) => {
  const { state, setState } = useGame();
  
  React.useEffect(() => {
    onState(state);
  }, [state, onState]);

  actionRef.current = {
    addNova: () => {
      setState(prev => ({
        ...prev,
        survivors: {
          ...prev.survivors,
          nova: {
            id: 'nova',
            name: '诺娃',
            role: 'engineer',
            bonus: 0.3,
            isAssigned: false
          }
        }
      }));
    },
    removeNova: () => {
      setState(prev => {
        const nextSurvivors = { ...prev.survivors };
        delete nextSurvivors.nova;
        return {
          ...prev,
          survivors: nextSurvivors
        };
      });
    }
  };

  return <div>Test</div>;
};

describe('GameContext Integration & Survivor Passive Bonuses', () => {
  it('should toggle maxEnergy between 100 and 130 depending on nova companion presence', () => {
    const actionRef = { current: null as any };
    let capturedState: any = null;

    render(
      <GameProvider>
        <TestConsumer actionRef={actionRef} onState={(s) => { capturedState = s; }} />
      </GameProvider>
    );

    // 初始没有 nova，应该为 100 且 hasNova 为 false
    expect(capturedState.player.maxEnergy).toBe(100);
    expect(capturedState.hasNova).toBe(false);

    // 触发添加 nova
    React.act(() => {
      actionRef.current.addNova();
    });

    // 应该更新为 130 且 hasNova 为 true
    expect(capturedState.player.maxEnergy).toBe(130);
    expect(capturedState.hasNova).toBe(true);

    // 触发移除 nova
    React.act(() => {
      actionRef.current.removeNova();
    });

    // 应该恢复为 100 且 hasNova 为 false
    expect(capturedState.player.maxEnergy).toBe(100);
    expect(capturedState.hasNova).toBe(false);
  });

  it('should have new crops correctly configured in CROPS_CONFIG', () => {
    // 熔岩椒
    expect(CROPS_CONFIG).toHaveProperty('magma_pepper');
    expect(CROPS_CONFIG.magma_pepper.id).toBe('magma_pepper');
    expect(CROPS_CONFIG.magma_pepper.growthTime).toBe(240);

    // 霜冻风铃草
    expect(CROPS_CONFIG).toHaveProperty('frost_bell');
    expect(CROPS_CONFIG.frost_bell.id).toBe('frost_bell');
    expect(CROPS_CONFIG.frost_bell.growthTime).toBe(480);

    // 等离子南瓜
    expect(CROPS_CONFIG).toHaveProperty('plasma_pumpkin');
    expect(CROPS_CONFIG.plasma_pumpkin.id).toBe('plasma_pumpkin');
    expect(CROPS_CONFIG.plasma_pumpkin.growthTime).toBe(720);

    // 虚空魔莲
    expect(CROPS_CONFIG).toHaveProperty('void_lotus');
    expect(CROPS_CONFIG.void_lotus.id).toBe('void_lotus');
    expect(CROPS_CONFIG.void_lotus.growthTime).toBe(1200);
  });

  describe('calculateDetailedOfflineProgress - Generator & Recycler', () => {
    it('should calculate correct offline gains for generator and recycler', () => {
      const mockState: GameState = {
        player: {
          hp: 100, maxHp: 100, food: 100, maxFood: 100,
          energy: 10, maxEnergy: 100, sanity: 100, maxSanity: 100, days: 1
        },
        inventory: { scrap_metal: 5 },
        greenhouse: { slots: [], unlockedSlotsCount: 0 },
        survivors: {},
        exploration: {
          inRealityExploration: false, realitySteps: 0, realityLocationId: null, realityBag: {},
          inDreamExploration: false, dreamSteps: 0, dreamPollution: 0, dreamBag: {},
          capsulesCharge: {}, survivorResonance: {}
        },
        discoveredBlueprints: [],
        activeAlert: { type: null, hp: 0 },
        lastTick: Date.now(),
        dayStartTime: Date.now(),
        logs: [],
        shelter: {
          maxOfflineDuration: 14400,
          batteryLevel: 1,
          generatorLevel: 2,
          recyclerLevel: 3,
          facilities: {},
          assignedWatererId: null,
          assignedExplorerId: null,
          expedition: { locationId: null, startTime: null, lastScavengeTime: null }
        }
      };

      const { updatedState, report } = calculateDetailedOfflineProgress(mockState, 1000);

      expect(updatedState.player.energy).toBe(20);
      expect(updatedState.inventory.scrap_metal).toBe(11);
      expect(report.recoveredEnergy).toBe(10);
      expect(report.recoveredItems.scrap_metal).toBe(6);
    });
  });

  describe('calculateDetailedOfflineProgress - Factory Automation Pipelines', () => {
    it('should process factory smelt_alloy recipe with enough raw materials', () => {
      const mockState: GameState = {
        player: {
          hp: 100, maxHp: 100, food: 100, maxFood: 100,
          energy: 100, maxEnergy: 100, sanity: 100, maxSanity: 100, days: 1
        },
        inventory: { scrap_metal: 10 },
        greenhouse: { slots: [], unlockedSlotsCount: 0 },
        survivors: {},
        exploration: {
          inRealityExploration: false, realitySteps: 0, realityLocationId: null, realityBag: {},
          inDreamExploration: false, dreamSteps: 0, dreamPollution: 0, dreamBag: {},
          capsulesCharge: {}, survivorResonance: {}
        },
        discoveredBlueprints: [],
        activeAlert: { type: null, hp: 0 },
        lastTick: Date.now(),
        dayStartTime: Date.now(),
        logs: [],
        shelter: {
          maxOfflineDuration: 14400,
          batteryLevel: 1,
          generatorLevel: 0,
          recyclerLevel: 0,
          facilities: {
            smelter: {
              id: 'smelter',
              name: '魔导冶炼炉',
              level: 1,
              activeRecipeId: 'smelt_alloy',
              currentProgress: 0,
              timeLeft: 0,
              assignedSurvivorId: null,
              active: true
            }
          },
          assignedWatererId: null,
          assignedExplorerId: null,
          expedition: { locationId: null, startTime: null, lastScavengeTime: null }
        }
      };

      const { updatedState, report } = calculateDetailedOfflineProgress(mockState, 100);

      expect(updatedState.inventory.scrap_metal).toBe(2);
      expect(updatedState.inventory.alloy_plate).toBe(3);
      expect(report.recoveredItems.alloy_plate).toBe(3);
      
      const smelter = updatedState.shelter.facilities.smelter;
      expect(smelter.timeLeft).toBe(20);
      expect(smelter.currentProgress).toBe(33);
    });

    it('should stop factory processing early when raw materials run out', () => {
      const mockState: GameState = {
        player: {
          hp: 100, maxHp: 100, food: 100, maxFood: 100,
          energy: 100, maxEnergy: 100, sanity: 100, maxSanity: 100, days: 1
        },
        inventory: { scrap_metal: 2 },
        greenhouse: { slots: [], unlockedSlotsCount: 0 },
        survivors: {},
        exploration: {
          inRealityExploration: false, realitySteps: 0, realityLocationId: null, realityBag: {},
          inDreamExploration: false, dreamSteps: 0, dreamPollution: 0, dreamBag: {},
          capsulesCharge: {}, survivorResonance: {}
        },
        discoveredBlueprints: [],
        activeAlert: { type: null, hp: 0 },
        lastTick: Date.now(),
        dayStartTime: Date.now(),
        logs: [],
        shelter: {
          maxOfflineDuration: 14400,
          batteryLevel: 1,
          generatorLevel: 0,
          recyclerLevel: 0,
          facilities: {
            smelter: {
              id: 'smelter',
              name: '魔导冶炼炉',
              level: 1,
              activeRecipeId: 'smelt_alloy',
              currentProgress: 0,
              timeLeft: 0,
              assignedSurvivorId: null,
              active: true
            }
          },
          assignedWatererId: null,
          assignedExplorerId: null,
          expedition: { locationId: null, startTime: null, lastScavengeTime: null }
        }
      };

      const { updatedState, report } = calculateDetailedOfflineProgress(mockState, 100);

      expect(updatedState.inventory.scrap_metal).toBe(0);
      expect(updatedState.inventory.alloy_plate).toBe(1);
      expect(report.recoveredItems.alloy_plate).toBe(1);

      const smelter = updatedState.shelter.facilities.smelter;
      expect(smelter.timeLeft).toBe(0);
      expect(smelter.currentProgress).toBe(0);
    });
  });

  describe('calculateDetailedOfflineProgress - Greenhouse Watering and Crop Growth', () => {
    it('should double growth speed and maintain watering status when a waterer is assigned', () => {
      const mockState: GameState = {
        player: {
          hp: 100, maxHp: 100, food: 100, maxFood: 100,
          energy: 100, maxEnergy: 100, sanity: 100, maxSanity: 100, days: 1
        },
        inventory: {},
        greenhouse: {
          slots: [
            { id: 1, cropId: 'glow_grass', growthProgress: 0, growthTimeLeft: 30, isWatered: false }
          ],
          unlockedSlotsCount: 4
        },
        survivors: {},
        exploration: {
          inRealityExploration: false, realitySteps: 0, realityLocationId: null, realityBag: {},
          inDreamExploration: false, dreamSteps: 0, dreamPollution: 0, dreamBag: {},
          capsulesCharge: {}, survivorResonance: {}
        },
        discoveredBlueprints: [],
        activeAlert: { type: null, hp: 0 },
        lastTick: Date.now(),
        dayStartTime: Date.now(),
        logs: [],
        shelter: {
          maxOfflineDuration: 14400,
          batteryLevel: 1,
          generatorLevel: 0,
          recyclerLevel: 0,
          facilities: {},
          assignedWatererId: 'survivor_waterer',
          assignedExplorerId: null,
          expedition: { locationId: null, startTime: null, lastScavengeTime: null }
        }
      };

      const { updatedState } = calculateDetailedOfflineProgress(mockState, 10);
      const slot = updatedState.greenhouse.slots[0];
      
      expect(slot.growthTimeLeft).toBe(10);
      expect(slot.growthProgress).toBe(67);
      expect(slot.isWatered).toBe(true);
    });
  });
});

