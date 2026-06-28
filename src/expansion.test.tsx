// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { GameProvider, useGame } from './context/GameContext';
import { ToastProvider } from './components/ToastSystem';
import WorkshopTab from './components/WorkshopTab';
import type { GameState } from './types/game';

// 基础的空存档，确保其他属性合法
const BASE_SAVE = {
  player: {
    hp: 100,
    maxHp: 100,
    food: 100,
    maxFood: 100,
    energy: 100,
    maxEnergy: 100,
    sanity: 100,
    maxSanity: 100,
    days: 1
  },
  inventory: {},
  greenhouse: {
    slots: [],
    unlockedSlotsCount: 4
  },
  survivors: {},
  exploration: {
    inRealityExploration: false,
    realitySteps: 0,
    realityLocationId: null,
    realityBag: {},
    inDreamExploration: false,
    dreamSteps: 0,
    dreamPollution: 0,
    dreamBag: {},
    capsulesCharge: {
      sanity_capsule: 3,
      warp_capsule: 0
    },
    survivorResonance: {}
  },
  discoveredBlueprints: [],
  activeAlert: {
    type: null,
    hp: 0
  },
  lastTick: Date.now(),
  dayStartTime: Date.now(),
  logs: []
};

// 辅助组件，调用真实 useSupplyItem (单元测试)
const TestUsageComponent: React.FC<{
  itemId: 'ration' | 'energy_refill' | 'hot_stew' | 'nanite_injector' | 'purifying_serum';
  onState: (state: GameState) => void;
}> = ({ itemId, onState }) => {
  const { state, useSupplyItem } = useGame();

  const handleUseItem = () => {
    useSupplyItem(itemId);
  };

  React.useEffect(() => {
    onState(state);
  }, [state, onState]);

  return (
    <button data-testid={`use-${itemId}`} onClick={handleUseItem}>
      Use {itemId}
    </button>
  );
};

describe('Survival Supplies - Unit Tests via TestUsageComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    localStorage.setItem('aether_garden_save_current_user', 'Guest');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should correctly update stats when using hot_stew (Unit)', async () => {
    const initialSave = {
      ...BASE_SAVE,
      player: {
        ...BASE_SAVE.player,
        food: 20,
        hp: 50
      },
      inventory: {
        hot_stew: 2
      }
    };
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(initialSave));

    let currentState: GameState | null = null;

    render(
      <GameProvider>
        <TestUsageComponent
          itemId="hot_stew"
          onState={(s) => {
            currentState = s;
          }}
        />
      </GameProvider>
    );

    const button = screen.getByTestId('use-hot_stew');
    await act(async () => {
      fireEvent.click(button);
    });

    expect(currentState).not.toBeNull();
    expect(currentState!.inventory.hot_stew).toBe(1);
    expect(currentState!.player.food).toBe(80);
    expect(currentState!.player.hp).toBe(70);
  });

  it('should correctly update stats when using nanite_injector (Unit)', async () => {
    const initialSave = {
      ...BASE_SAVE,
      player: {
        ...BASE_SAVE.player,
        hp: 30,
        food: 80
      },
      inventory: {
        nanite_injector: 1
      }
    };
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(initialSave));

    let currentState: GameState | null = null;

    render(
      <GameProvider>
        <TestUsageComponent
          itemId="nanite_injector"
          onState={(s) => {
            currentState = s;
          }}
        />
      </GameProvider>
    );

    const button = screen.getByTestId('use-nanite_injector');
    await act(async () => {
      fireEvent.click(button);
    });

    expect(currentState).not.toBeNull();
    expect(currentState!.inventory.nanite_injector).toBe(0);
    expect(currentState!.player.hp).toBe(90);
    expect(currentState!.player.food).toBe(90);
  });

  it('should correctly update stats when using purifying_serum (Unit)', async () => {
    const initialSave = {
      ...BASE_SAVE,
      player: {
        ...BASE_SAVE.player,
        sanity: 40
      },
      exploration: {
        ...BASE_SAVE.exploration,
        dreamPollution: 50
      },
      inventory: {
        purifying_serum: 1
      }
    };
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(initialSave));

    let currentState: GameState | null = null;

    render(
      <GameProvider>
        <TestUsageComponent
          itemId="purifying_serum"
          onState={(s) => {
            currentState = s;
          }}
        />
      </GameProvider>
    );

    const button = screen.getByTestId('use-purifying_serum');
    await act(async () => {
      fireEvent.click(button);
    });

    expect(currentState).not.toBeNull();
    expect(currentState!.inventory.purifying_serum).toBe(0);
    expect(currentState!.player.sanity).toBe(70);
    expect(currentState!.exploration.dreamPollution).toBe(20);
  });
});

describe('Survival Supplies - Integration Tests via WorkshopTab', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    localStorage.setItem('aether_garden_save_current_user', 'Guest');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should process hot_stew usage correctly from WorkshopTab UI', async () => {
    const initialSave = {
      ...BASE_SAVE,
      player: {
        ...BASE_SAVE.player,
        food: 20,
        hp: 50
      },
      inventory: {
        hot_stew: 2
      }
    };
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(initialSave));

    render(
      <GameProvider>
        <ToastProvider>
          <WorkshopTab />
        </ToastProvider>
      </GameProvider>
    );

    // 找到 "食用 (饱食+60, 生命+20)" 按钮并点击
    const button = screen.getByText('食用 (饱食+60, 生命+20)');
    await act(async () => {
      fireEvent.click(button);
    });

    // 从 localStorage 中读取更新后的状态
    const savedState = JSON.parse(localStorage.getItem('aether_garden_save_Guest') || '{}');
    expect(savedState.inventory.hot_stew).toBe(1);
    expect(savedState.player.food).toBe(80);
    expect(savedState.player.hp).toBe(70);
  });

  it('should process nanite_injector usage correctly from WorkshopTab UI', async () => {
    const initialSave = {
      ...BASE_SAVE,
      player: {
        ...BASE_SAVE.player,
        hp: 30,
        food: 80
      },
      inventory: {
        nanite_injector: 1
      }
    };
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(initialSave));

    render(
      <GameProvider>
        <ToastProvider>
          <WorkshopTab />
        </ToastProvider>
      </GameProvider>
    );

    // 找到 "注射 (生命+60, 饱食+10)" 按钮并点击
    const button = screen.getByText('注射 (生命+60, 饱食+10)');
    await act(async () => {
      fireEvent.click(button);
    });

    // 从 localStorage 中读取更新后的状态
    const savedState = JSON.parse(localStorage.getItem('aether_garden_save_Guest') || '{}');
    expect(savedState.inventory.nanite_injector).toBe(0);
    expect(savedState.player.hp).toBe(90);
    expect(savedState.player.food).toBe(90);
  });

  it('should process purifying_serum usage correctly from WorkshopTab UI', async () => {
    const initialSave = {
      ...BASE_SAVE,
      player: {
        ...BASE_SAVE.player,
        sanity: 40
      },
      exploration: {
        ...BASE_SAVE.exploration,
        dreamPollution: 50
      },
      inventory: {
        purifying_serum: 1
      }
    };
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(initialSave));

    render(
      <GameProvider>
        <ToastProvider>
          <WorkshopTab />
        </ToastProvider>
      </GameProvider>
    );

    // 找到 "净化 (污染-30, 理智+30)" 按钮并点击
    const button = screen.getByText('净化 (污染-30, 理智+30)');
    await act(async () => {
      fireEvent.click(button);
    });

    // 从 localStorage 中读取更新后的状态
    const savedState = JSON.parse(localStorage.getItem('aether_garden_save_Guest') || '{}');
    expect(savedState.inventory.purifying_serum).toBe(0);
    expect(savedState.player.sanity).toBe(70);
    expect(savedState.exploration.dreamPollution).toBe(20);
  });
});
