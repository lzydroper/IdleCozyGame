// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { calculateOfflineProgress, GameProvider, useGame, CROPS_CONFIG } from './GameContext';
import type { GreenhouseSlot } from '../types/game';

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
});
