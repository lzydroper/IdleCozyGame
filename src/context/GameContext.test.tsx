// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { calculateOfflineProgress, calculateDetailedOfflineProgress } from '../state/offline';
import { GameProvider, useGame } from './GameContext';
import { CROPS_CONFIG } from '../data/crops';
import { createInitialHero } from '../data/initialState';
import type { GreenhouseSlot, GameState } from '../types/game';

// 模拟作物配置表
const MOCK_CROPS_CONFIG: Record<string, { growthTime: number }> = {
  glow_grass: { growthTime: 100 },
  aether_berry: { growthTime: 300 }
};

describe('Game State Tick & Offline Calculation', () => {
  it('未湿润作物离线停滞（不扣减生长时间）', () => {
    const initialSlots: GreenhouseSlot[] = [
      { id: 1, cropId: 'glow_grass', growthProgress: 0, growthTimeLeft: 100, isWatered: false }
    ];
    // 浇水=维持生长（06）：未湿润作物停滞
    const updatedSlots = calculateOfflineProgress(initialSlots, 50, MOCK_CROPS_CONFIG);
    expect(updatedSlots[0].growthTimeLeft).toBe(100);
    expect(updatedSlots[0].growthProgress).toBe(0);
  });

  it('湿润作物离线按基础 1x 生长（不再 ×2）', () => {
    const initialSlots: GreenhouseSlot[] = [
      { id: 1, cropId: 'glow_grass', growthProgress: 0, growthTimeLeft: 100, isWatered: true }
    ];
    // 湿润 1x：20 秒扣 20
    const updatedSlots = calculateOfflineProgress(initialSlots, 20, MOCK_CROPS_CONFIG);
    expect(updatedSlots[0].growthTimeLeft).toBe(80);
    expect(updatedSlots[0].growthProgress).toBe(20);
  });

  it('生长进度封顶 100 且生长时间不为负', () => {
    const initialSlots: GreenhouseSlot[] = [
      { id: 1, cropId: 'glow_grass', growthProgress: 80, growthTimeLeft: 20, isWatered: true }
    ];
    // 湿润 30 秒超出剩余 20 秒
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
        heroes: {
          ...prev.heroes,
          nova: createInitialHero('nova')
        }
      }));
    },
    removeNova: () => {
      setState(prev => {
        const nextHeroes = { ...prev.heroes };
        delete nextHeroes.nova;
        return {
          ...prev,
          heroes: nextHeroes
        };
      });
    }
  };

  return <div>Test</div>;
};

describe('GameContext Integration', () => {
  it('should keep maxEnergy at 100 regardless of nova presence (passive system retired)', () => {
    const actionRef = { current: null as any };
    let capturedState: any = null;

    render(
      <GameProvider>
        <TestConsumer actionRef={actionRef} onState={(s) => { capturedState = s; }} />
      </GameProvider>
    );

    // ADR-0013：开局赠送诺娃，hasNova 派生状态初始为 true（英雄为唯一实体）
    expect(capturedState.player.maxEnergy).toBe(100);
    expect(capturedState.hasNova).toBe(true);

    // 触发移除 nova
    React.act(() => {
      actionRef.current.removeNova();
    });

    // 被动系统退役后 maxEnergy 不再有 +30 加成，但 hasNova 派生状态仍生效
    expect(capturedState.player.maxEnergy).toBe(100);
    expect(capturedState.hasNova).toBe(false);

    // 触发添加 nova
    React.act(() => {
      actionRef.current.addNova();
    });

    // 应重新获得 nova
    expect(capturedState.player.maxEnergy).toBe(100);
    expect(capturedState.hasNova).toBe(true);
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
          food: 100, maxFood: 100,
          energy: 10, maxEnergy: 100, sanity: 100, maxSanity: 100, days: 1
        },
        inventory: { scrap_metal: 5 },
        greenhouse: { slots: [], unlockedSlotsCount: 0 },
        heroes: {},
        equipment: {},
        equipmentInventory: {},
        summon: { pityCount: 0 },
        stamina: 100,
        maxStamina: 100,
        party: [],
        combat: { zoneId: null, lastSettlement: null, zonesCleared: [], idle: { zoneId: null, startTime: null } },
        exploration: {
          inRealityExploration: false, realitySteps: 0, realityLocationId: null, realityBag: {},
          realityEncounterId: null,
          inDreamExploration: false, dreamSteps: 0, dreamPollution: 0, dreamBag: {},
          capsulesCharge: {}, rescueProgress: {}, dreamLockdownUntil: null
        },
        activeAlert: { type: null, hp: 0 },
        lastTick: Date.now(),
        dayStartTime: Date.now(),
        logs: [],
        shelter: {
          maxOfflineDuration: 14400,
          batteryLevel: 1,
          generatorLevel: 2,
          recyclerLevel: 3,
          facilities: { smelter: [], assembler: [] },
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
    it('should execute the FIFO recipe queue during offline (one batch per entry)', () => {
      const mockState: GameState = {
        player: {
          food: 100, maxFood: 100,
          energy: 100, maxEnergy: 100, sanity: 100, maxSanity: 100, days: 1
        },
        inventory: { scrap_metal: 6 },
        greenhouse: { slots: [], unlockedSlotsCount: 0 },
        heroes: {},
        equipment: {},
        equipmentInventory: {},
        summon: { pityCount: 0 },
        stamina: 100,
        maxStamina: 100,
        party: [],
        combat: { zoneId: null, lastSettlement: null, zonesCleared: [], idle: { zoneId: null, startTime: null } },
        exploration: {
          inRealityExploration: false, realitySteps: 0, realityLocationId: null, realityBag: {},
          realityEncounterId: null,
          inDreamExploration: false, dreamSteps: 0, dreamPollution: 0, dreamBag: {},
          capsulesCharge: {}, rescueProgress: {}, dreamLockdownUntil: null
        },
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
            // Lv3 → 队列容量 3，每项配方各产一批（ticket 13）
            smelter: [
              {
                id: 'smelter',
                name: '魔导冶炼炉',
                level: 3,
                queue: ['smelt_alloy', 'smelt_alloy', 'smelt_alloy'],
                currentProgress: 0,
                timeLeft: 0,
                active: true
              }
            ],
            assembler: []
          },
          assignedWatererId: null,
          assignedExplorerId: null,
          expedition: { locationId: null, startTime: null, lastScavengeTime: null }
        }
      };

      const { updatedState, report } = calculateDetailedOfflineProgress(mockState, 100);

      // Lv3 单轮 23s（30/1.3）：3 批 × 23s = 69s 全部完成，余 31s 空转
      expect(updatedState.inventory.scrap_metal).toBe(0);
      expect(updatedState.inventory.alloy_plate).toBe(3);
      expect(report.recoveredItems.alloy_plate).toBe(3);

      const smelter = updatedState.shelter.facilities.smelter[0];
      expect(smelter.queue).toEqual([]);
      expect(smelter.timeLeft).toBe(0);
      expect(smelter.currentProgress).toBe(0);
    });

    it('should pause the queue when raw materials run out (head entry kept)', () => {
      const mockState: GameState = {
        player: {
          food: 100, maxFood: 100,
          energy: 100, maxEnergy: 100, sanity: 100, maxSanity: 100, days: 1
        },
        inventory: { scrap_metal: 2 },
        greenhouse: { slots: [], unlockedSlotsCount: 0 },
        heroes: {},
        equipment: {},
        equipmentInventory: {},
        summon: { pityCount: 0 },
        stamina: 100,
        maxStamina: 100,
        party: [],
        combat: { zoneId: null, lastSettlement: null, zonesCleared: [], idle: { zoneId: null, startTime: null } },
        exploration: {
          inRealityExploration: false, realitySteps: 0, realityLocationId: null, realityBag: {},
          realityEncounterId: null,
          inDreamExploration: false, dreamSteps: 0, dreamPollution: 0, dreamBag: {},
          capsulesCharge: {}, rescueProgress: {}, dreamLockdownUntil: null
        },
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
            smelter: [
              {
                id: 'smelter',
                name: '魔导冶炼炉',
                level: 3,
                queue: ['smelt_alloy', 'smelt_alloy'],
                currentProgress: 0,
                timeLeft: 0,
                active: true
              }
            ],
            assembler: []
          },
          assignedWatererId: null,
          assignedExplorerId: null,
          expedition: { locationId: null, startTime: null, lastScavengeTime: null }
        }
      };

      const { updatedState, report } = calculateDetailedOfflineProgress(mockState, 100);

      // 只有 2 废铁：第一批完成，第二批原料不足 → 暂停，队首保留
      expect(updatedState.inventory.scrap_metal).toBe(0);
      expect(updatedState.inventory.alloy_plate).toBe(1);
      expect(report.recoveredItems.alloy_plate).toBe(1);

      const smelter = updatedState.shelter.facilities.smelter[0];
      expect(smelter.queue).toEqual(['smelt_alloy']);
      expect(smelter.timeLeft).toBe(0);
      expect(smelter.currentProgress).toBe(0);
    });
  });

  describe('calculateDetailedOfflineProgress - Greenhouse Watering and Crop Growth', () => {
    // 06 浇水=维持生长：湿润作物 1x 生长，未湿润作物停滞
    const makeGreenhouseState = (overrides: { assignedWatererId?: string | null; isWatered?: boolean } = {}): GameState => ({
      player: {
        food: 100, maxFood: 100,
        energy: 100, maxEnergy: 100, sanity: 100, maxSanity: 100, days: 1
      },
      inventory: {},
      greenhouse: {
        slots: [
          { id: 1, cropId: 'glow_grass', growthProgress: 0, growthTimeLeft: 30, isWatered: overrides.isWatered ?? false }
        ],
        unlockedSlotsCount: 4
      },
      heroes: {},
      equipment: {},
      equipmentInventory: {},
      summon: { pityCount: 0 },
      stamina: 100,
      maxStamina: 100,
      party: [],
      combat: { zoneId: null, lastSettlement: null, zonesCleared: [], idle: { zoneId: null, startTime: null } },
      exploration: {
        inRealityExploration: false, realitySteps: 0, realityLocationId: null, realityBag: {},
        realityEncounterId: null,
        inDreamExploration: false, dreamSteps: 0, dreamPollution: 0, dreamBag: {},
        capsulesCharge: {}, rescueProgress: {}, dreamLockdownUntil: null
      },
      activeAlert: { type: null, hp: 0 },
      lastTick: Date.now(),
      dayStartTime: Date.now(),
      logs: [],
      shelter: {
        maxOfflineDuration: 14400,
        batteryLevel: 1,
        generatorLevel: 0,
        recyclerLevel: 0,
        facilities: { smelter: [], assembler: [] },
        assignedWatererId: overrides.assignedWatererId ?? null,
        assignedExplorerId: null,
        expedition: { locationId: null, startTime: null, lastScavengeTime: null }
      }
    });

    it('驻守时作物保持湿润并按基础 1x 生长', () => {
      const { updatedState } = calculateDetailedOfflineProgress(makeGreenhouseState({ assignedWatererId: 'nova' }), 10);
      const slot = updatedState.greenhouse.slots[0];

      expect(slot.growthTimeLeft).toBe(20); // 30 - 10（1x，不再 ×2）
      expect(slot.growthProgress).toBe(33); // (30-20)/30*100
      expect(slot.isWatered).toBe(true);    // 驻守强制湿润保留（07 正式化）
    });

    it('无驻守且未湿润的作物离线停滞', () => {
      const { updatedState } = calculateDetailedOfflineProgress(makeGreenhouseState({}), 10);
      const slot = updatedState.greenhouse.slots[0];

      expect(slot.growthTimeLeft).toBe(30); // 停滞不扣减
      expect(slot.growthProgress).toBe(0);
      expect(slot.isWatered).toBe(false);
    });

    it('已湿润作物无驻守时离线按 1x 生长', () => {
      const { updatedState } = calculateDetailedOfflineProgress(makeGreenhouseState({ isWatered: true }), 10);
      const slot = updatedState.greenhouse.slots[0];

      expect(slot.growthTimeLeft).toBe(20);
      expect(slot.growthProgress).toBe(33);
    });
  });
});



