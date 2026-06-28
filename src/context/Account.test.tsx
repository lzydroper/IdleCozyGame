import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { GameProvider, useGame } from './GameContext';

// 测试辅助组件
const TestComponent = () => {
  const { state, switchAccount, createAccount, deleteAccount, setState } = useGame();
  
  return (
    <div>
      <div data-testid="current-user">{localStorage.getItem('aether_garden_save_current_user') || 'Guest'}</div>
      <div data-testid="hp">{state.player.hp}</div>
      <div data-testid="last-tick">{state.lastTick}</div>
      <button data-testid="damage-btn" onClick={() => setState(prev => ({
        ...prev,
        player: { ...prev.player, hp: prev.player.hp - 20 }
      }))}>Damage</button>
      <button data-testid="create-alice" onClick={() => createAccount('Alice')}>Create Alice</button>
      <button data-testid="switch-alice" onClick={() => switchAccount('Alice')}>Switch Alice</button>
      <button data-testid="switch-guest" onClick={() => switchAccount('Guest')}>Switch Guest</button>
      <button data-testid="delete-alice" onClick={() => deleteAccount('Alice')}>Delete Alice</button>
    </div>
  );
};

describe('Player Account and Multi-Character Save Management System', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should default to Guest and save guest initial data to localStorage', () => {
    render(
      <GameProvider>
        <TestComponent />
      </GameProvider>
    );

    // 默认当前玩家应该是 "Guest"
    expect(screen.getByTestId('current-user').textContent).toBe('Guest');
    expect(localStorage.getItem('aether_garden_save_current_user')).toBe('Guest');

    // 默认 Guest 存档存在于 localStorage 并且生命值为 100
    const guestSave = localStorage.getItem('aether_garden_save_Guest');
    expect(guestSave).toBeDefined();
    if (guestSave) {
      const parsed = JSON.parse(guestSave);
      expect(parsed.player.hp).toBe(100);
    }
  });

  it('should isolate states between different accounts', () => {
    render(
      <GameProvider>
        <TestComponent />
      </GameProvider>
    );

    // 1. 在 Guest 账号下扣除 20 点生命值
    act(() => {
      screen.getByTestId('damage-btn').click();
    });
    expect(screen.getByTestId('hp').textContent).toBe('80');

    // 检查 Guest 存档中生命值确实被更新为 80
    const guestSave = JSON.parse(localStorage.getItem('aether_garden_save_Guest') || '{}');
    expect(guestSave.player.hp).toBe(80);

    // 2. 创建 Alice 并切换到 Alice
    act(() => {
      screen.getByTestId('create-alice').click();
    });
    act(() => {
      screen.getByTestId('switch-alice').click();
    });

    // 切换后当前玩家应该为 "Alice"
    expect(screen.getByTestId('current-user').textContent).toBe('Alice');
    // Alice 生命值应该为初始的 100，不影响 Guest 的数据
    expect(screen.getByTestId('hp').textContent).toBe('100');

    // 3. 在 Alice 账号下也扣除 20 点生命值
    act(() => {
      screen.getByTestId('damage-btn').click();
    });
    expect(screen.getByTestId('hp').textContent).toBe('80');

    // 再扣 20，让 Alice 的生命值到 60
    act(() => {
      screen.getByTestId('damage-btn').click();
    });
    expect(screen.getByTestId('hp').textContent).toBe('60');

    // 4. 切换回 Guest 账号
    act(() => {
      screen.getByTestId('switch-guest').click();
    });
    expect(screen.getByTestId('current-user').textContent).toBe('Guest');
    // Guest 生命值应当仍是之前的 80
    expect(screen.getByTestId('hp').textContent).toBe('80');

    // 5. 再次切换到 Alice
    act(() => {
      screen.getByTestId('switch-alice').click();
    });
    // Alice 生命值仍然应当是 60
    expect(screen.getByTestId('hp').textContent).toBe('60');
  });

  it('should reset lastTick to current time when switching/creating accounts to prevent wrong offline progress', () => {
    const baseTime = Date.now();
    vi.setSystemTime(baseTime);

    render(
      <GameProvider>
        <TestComponent />
      </GameProvider>
    );

    // 此时 Guest 激活，初始 lastTick 应当是 baseTime
    const initialTick = Number(screen.getByTestId('last-tick').textContent);
    expect(initialTick).toBe(baseTime);

    // 模拟时间流逝了 1 个小时 (3600 秒)
    vi.advanceTimersByTime(3600 * 1000);

    // 切换到 Alice 账号 (创建并切换)
    act(() => {
      screen.getByTestId('create-alice').click();
    });
    
    const timeBeforeSwitch = Date.now(); // 应当是 baseTime + 1小时
    
    act(() => {
      screen.getByTestId('switch-alice').click();
    });

    // 此时 Alice 激活，其 lastTick 应当是切换时的当前时间，而非上一次存档的 tick 或者累加了离线时间
    const newTick = Number(screen.getByTestId('last-tick').textContent);
    expect(newTick).toBe(timeBeforeSwitch);
    expect(newTick).not.toBe(initialTick);
  });

  it('should successfully delete account save files', () => {
    render(
      <GameProvider>
        <TestComponent />
      </GameProvider>
    );

    // 创建 Alice 账户
    act(() => {
      screen.getByTestId('create-alice').click();
    });
    
    expect(localStorage.getItem('aether_garden_save_Alice')).toBeDefined();

    // 删除 Alice 账户
    act(() => {
      screen.getByTestId('delete-alice').click();
    });

    // Alice 存档应当已经被移除
    expect(localStorage.getItem('aether_garden_save_Alice')).toBeNull();
  });
});
