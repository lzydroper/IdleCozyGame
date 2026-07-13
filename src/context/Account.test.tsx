import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { GameProvider, useGame } from './GameContext';

// 测试辅助组件
const TestComponent = () => {
  const { state, switchAccount, createAccount, deleteAccount, setState, currentUser, accounts } = useGame();
  
  const getUsername = (id: string | null) => {
    if (!id) return 'None';
    const saved = localStorage.getItem(`aether_garden_save_${id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.username || 'None';
      } catch {
        return 'None';
      }
    }
    return 'None';
  };

  const findIdByUsername = (name: string) => {
    for (const id of accounts) {
      const saved = localStorage.getItem(`aether_garden_save_${id}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.username === name) return id;
        } catch {}
      }
    }
    return null;
  };

  return (
    <div>
      <div data-testid="current-user">{getUsername(currentUser)}</div>
      <div data-testid="hp">{state.player.hp}</div>
      <div data-testid="last-tick">{state.lastTick}</div>
      <button data-testid="damage-btn" onClick={() => setState(prev => ({
        ...prev,
        player: { ...prev.player, hp: prev.player.hp - 20 }
      }))}>Damage</button>
      <button data-testid="create-alice" onClick={async () => { await createAccount('Alice'); }}>Create Alice</button>
      <button data-testid="create-bob" onClick={async () => { await createAccount('Bob'); }}>Create Bob</button>
      <button data-testid="switch-alice" onClick={() => {
        const id = findIdByUsername('Alice');
        if (id) switchAccount(id);
      }}>Switch Alice</button>
      <button data-testid="switch-bob" onClick={() => {
        const id = findIdByUsername('Bob');
        if (id) switchAccount(id);
      }}>Switch Bob</button>
      <button data-testid="delete-alice" onClick={async () => {
        const id = findIdByUsername('Alice');
        if (id) await deleteAccount(id, false);
      }}>Delete Alice</button>
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

  it('should support creating a character and saving it to localStorage', async () => {
    render(
      <GameProvider>
        <TestComponent />
      </GameProvider>
    );

    // 默认列表为空，角色为 None
    expect(screen.getByTestId('current-user').textContent).toBe('None');

    // 创建 Alice 角色
    await act(async () => {
      screen.getByTestId('create-alice').click();
    });

    // 创建后当前玩家应该为 "Alice"
    expect(screen.getByTestId('current-user').textContent).toBe('Alice');
    
    // 应当已在 localStorage 中记录
    const currentUserSavedId = localStorage.getItem('aether_garden_save_current_user');
    expect(currentUserSavedId).not.toBeNull();

    const aliceSave = localStorage.getItem(`aether_garden_save_${currentUserSavedId}`);
    expect(aliceSave).not.toBeNull();
    if (aliceSave) {
      const parsed = JSON.parse(aliceSave);
      expect(parsed.username).toBe('Alice');
      expect(parsed.player.hp).toBe(100);
    }
  });

  it('should isolate states between different accounts', async () => {
    render(
      <GameProvider>
        <TestComponent />
      </GameProvider>
    );

    // 1. 创建 Alice 并扣除 20 点生命值
    await act(async () => {
      screen.getByTestId('create-alice').click();
    });
    
    act(() => {
      screen.getByTestId('damage-btn').click();
    });
    expect(screen.getByTestId('hp').textContent).toBe('80');

    // 检查 Alice 存档中生命值确实被更新为 80
    const aliceSavedId = localStorage.getItem('aether_garden_save_current_user');
    const aliceSave = JSON.parse(localStorage.getItem(`aether_garden_save_${aliceSavedId}`) || '{}');
    expect(aliceSave.player.hp).toBe(80);

    // 2. 创建 Bob 并自动切换到 Bob
    await act(async () => {
      screen.getByTestId('create-bob').click();
    });

    // 切换后当前玩家应该为 "Bob"
    expect(screen.getByTestId('current-user').textContent).toBe('Bob');
    // Bob 生命值应该为初始的 100，不影响 Alice 的数据
    expect(screen.getByTestId('hp').textContent).toBe('100');

    // 3. 在 Bob 账号下也扣除 20 点生命值，再扣 20 让生命值到 60
    act(() => {
      screen.getByTestId('damage-btn').click();
    });
    act(() => {
      screen.getByTestId('damage-btn').click();
    });
    expect(screen.getByTestId('hp').textContent).toBe('60');

    // 4. 切换回 Alice 账号
    act(() => {
      screen.getByTestId('switch-alice').click();
    });
    expect(screen.getByTestId('current-user').textContent).toBe('Alice');
    // Alice 生命值应当仍是之前的 80
    expect(screen.getByTestId('hp').textContent).toBe('80');

    // 5. 再次切换到 Bob
    act(() => {
      screen.getByTestId('switch-bob').click();
    });
    // Bob 生命值仍然应当是 60
    expect(screen.getByTestId('hp').textContent).toBe('60');
  });

  it('should reset lastTick to current time when switching/creating accounts to prevent wrong offline progress', async () => {
    const baseTime = Date.now();
    vi.setSystemTime(baseTime);

    render(
      <GameProvider>
        <TestComponent />
      </GameProvider>
    );

    // 1. 创建 Alice 角色
    await act(async () => {
      screen.getByTestId('create-alice').click();
    });

    // 此时 Alice 激活，初始 lastTick 应当是 baseTime
    const initialTick = Number(screen.getByTestId('last-tick').textContent);
    expect(initialTick).toBe(baseTime);

    // 模拟时间流逝了 1 个小时 (3600 秒)
    vi.advanceTimersByTime(3600 * 1000);

    // 切换/创建 Bob 账号
    const timeBeforeSwitch = Date.now(); // 应当是 baseTime + 1小时
    await act(async () => {
      screen.getByTestId('create-bob').click();
    });

    // 此时 Bob 激活，其 lastTick 应当是创建时的当前时间，而非上一次存档的 tick 或者累加了离线时间
    const newTick = Number(screen.getByTestId('last-tick').textContent);
    expect(newTick).toBe(timeBeforeSwitch);
    expect(newTick).not.toBe(initialTick);
  });

  it('should successfully delete account save files', async () => {
    render(
      <GameProvider>
        <TestComponent />
      </GameProvider>
    );

    // 创建 Alice 账户
    await act(async () => {
      screen.getByTestId('create-alice').click();
    });
    
    const aliceSavedId = localStorage.getItem('aether_garden_save_current_user');
    expect(aliceSavedId).not.toBeNull();
    expect(localStorage.getItem(`aether_garden_save_${aliceSavedId}`)).not.toBeNull();

    // 删除 Alice 账户
    await act(async () => {
      screen.getByTestId('delete-alice').click();
    });

    // Alice 存档应当已经被移除
    expect(localStorage.getItem(`aether_garden_save_${aliceSavedId}`)).toBeNull();
  });
});
