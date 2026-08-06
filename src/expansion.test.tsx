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
    rescueProgress: {},
    dreamLockdownUntil: null
  },
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
  itemId: 'ration' | 'energy_refill' | 'hot_stew' | 'purifying_serum' | 'sanity_capsule';
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
        food: 20
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
  });

  it('nanite_injector 不再是生存补给（仅用于治愈重伤，ticket 14）', async () => {
    const initialSave = {
      ...BASE_SAVE,
      player: {
        ...BASE_SAVE.player,
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
          itemId="purifying_serum"
          onState={(s) => {
            currentState = s;
          }}
        />
      </GameProvider>
    );

    // 直接调用底层 useSupplyItem 也无法消耗纳米修复剂（已无 useEffect 补给效果）
    await act(async () => {
      fireEvent.click(screen.getByTestId('use-purifying_serum'));
    });

    expect(currentState!.inventory.nanite_injector).toBe(1);
    expect(currentState!.player.food).toBe(80);
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

  it('should not silently consume capsules whose charge effect is not wired yet (ADR-0016)', async () => {
    const initialSave = {
      ...BASE_SAVE,
      inventory: { sanity_capsule: 2 }
    };
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(initialSave));

    let currentState: GameState | null = null;

    render(
      <GameProvider>
        <TestUsageComponent
          itemId="sanity_capsule"
          onState={(s) => {
            currentState = s;
          }}
        />
      </GameProvider>
    );

    const button = screen.getByTestId('use-sanity_capsule');
    await act(async () => {
      fireEvent.click(button);
    });

    expect(currentState).not.toBeNull();
    // 充能效果尚未接线：胶囊不消耗、充能次数不变化（防静默吞没）
    expect(currentState!.inventory.sanity_capsule).toBe(2);
    expect(currentState!.exploration.capsulesCharge.sanity_capsule).toBe(3);
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
        food: 20
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

    // 先展开面板
    const header = screen.getByText('避难所生存补给发放');
    fireEvent.click(header);

    // 找到 "食用 (饱食+60)" 按钮并点击
    const button = screen.getByText('食用 (饱食+60)');
    await act(async () => {
      fireEvent.click(button);
    });

    // 从 localStorage 中读取更新后的状态
    const savedState = JSON.parse(localStorage.getItem('aether_garden_save_Guest') || '{}');
    expect(savedState.inventory.hot_stew).toBe(1);
    expect(savedState.player.food).toBe(80);
  });

  it('纳米修复剂不再出现在补给面板（仅用于治愈重伤，ticket 14）', async () => {
    const initialSave = {
      ...BASE_SAVE,
      player: {
        ...BASE_SAVE.player,
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

    // 先展开面板
    const header = screen.getByText('避难所生存补给发放');
    fireEvent.click(header);

    // 原 "注射 (生命+60, 饱食+10)" 入口已移除
    expect(screen.queryByText(/注射 \(生命/)).toBeNull();

    const savedState = JSON.parse(localStorage.getItem('aether_garden_save_Guest') || '{}');
    expect(savedState.inventory.nanite_injector).toBe(1); // 未被消耗
    expect(savedState.player.food).toBe(80);
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

    // 先展开面板
    const header = screen.getByText('避难所生存补给发放');
    fireEvent.click(header);

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
