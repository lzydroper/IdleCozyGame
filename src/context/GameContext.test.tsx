import { describe, it, expect } from 'vitest';
import { calculateOfflineProgress } from './GameContext';
import { GreenhouseSlot } from '../types/game';

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
