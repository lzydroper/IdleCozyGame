// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameProvider } from '../context/GameContext';
import { ToastProvider } from './ToastSystem';
import DreamscapeTab from './DreamscapeTab';
import { INITIAL_STATE } from '../data/initialState';

describe('DreamscapeTab Component', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('aether_garden_save_current_user', 'Guest');
  });

  it('should render the dream entry page initially', () => {
    render(
      <GameProvider>
        <ToastProvider>
          <DreamscapeTab />
        </ToastProvider>
      </GameProvider>
    );

    expect(screen.getByText(/同步潜入心灵梦境/i)).toBeDefined();
  });

  it('should transition to dreamscape view when entering dream', () => {
    render(
      <GameProvider>
        <ToastProvider>
          <DreamscapeTab />
        </ToastProvider>
      </GameProvider>
    );

    const enterButton = screen.getByText(/开始共鸣入梦/i);
    fireEvent.click(enterButton);

    expect(screen.getByText(/当前精神污染/i)).toBeDefined();
  });

  it('shows capsule charge counts from state in dreamscape entry view (ticket 04)', () => {
    render(
      <GameProvider>
        <ToastProvider>
          <DreamscapeTab />
        </ToastProvider>
      </GameProvider>
    );

    // 未入梦时的「心灵药剂与胶囊储备」区直接读 state（INITIAL_STATE：稳定胶囊 3 次、跃迁 0 次）；
    // 该显示由 state.exploration.capsulesCharge 驱动，背包使用胶囊（supplyItem）更新该字段后此处自动同步
    expect(screen.getByText(/稳定胶囊 \[拥有: 3次\]/)).toBeDefined();
    expect(screen.getByText(/折跃胶囊 \[拥有: 0次\]/)).toBeDefined();
  });

  it('梦境封锁期间无法进入梦境（ticket 14）', () => {
    const save = structuredClone(INITIAL_STATE) as typeof INITIAL_STATE;
    save.exploration.dreamLockdownUntil = Date.now() + 600_000; // 封锁 10 分钟
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(save));

    render(
      <GameProvider>
        <ToastProvider>
          <DreamscapeTab />
        </ToastProvider>
      </GameProvider>
    );

    // 封锁横幅 + 按钮禁用 + 文案变化
    expect(screen.getByText(/泄露防御失败后心灵通道被梦魇撕裂/)).toBeDefined();
    expect(screen.getByText(/剩余 10 分/)).toBeDefined();
    const button = screen.getByText('梦境封锁中 · 无法入梦');
    expect((button as HTMLButtonElement).disabled).toBe(true);

    // 点击不会进入梦境
    fireEvent.click(button);
    expect(screen.queryByText(/当前精神污染/i)).toBeNull();
  });
});
