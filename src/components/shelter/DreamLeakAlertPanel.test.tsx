// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameProvider } from '../../context/GameContext';
import { ToastProvider } from '../ToastSystem';
import DreamLeakAlertPanel from './DreamLeakAlertPanel';
import { INITIAL_STATE } from '../../data/initialState';
import { NIGHTMARE_CONFIG } from '../../data/nightmareConfig';

// 水合存档：注入梦魇入侵警报（ticket 05）
const hydrate = (activeAlert: { type: 'dream_leak' | null; hp: number }) => {
  localStorage.clear();
  localStorage.setItem('aether_garden_save_current_user', 'Guest');
  localStorage.setItem('aether_garden_save_Guest', JSON.stringify({ ...structuredClone(INITIAL_STATE), activeAlert }));
};

const renderPanel = () =>
  render(
    <GameProvider>
      <ToastProvider>
        <DreamLeakAlertPanel />
      </ToastProvider>
    </GameProvider>
  );

describe('DreamLeakAlertPanel（ticket 05 警报迁出工坊 → 避难所运营页）', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('无入侵时不渲染', () => {
    hydrate({ type: null, hp: 0 });
    renderPanel();
    expect(screen.queryByText(/心灵梦魇入侵/)).toBeNull();
  });

  it('入侵时渲染控制台（警告/HP/出战小队/防御按钮）', () => {
    hydrate({ type: 'dream_leak', hp: NIGHTMARE_CONFIG.dreamLeakDamage });
    renderPanel();

    expect(screen.getByText(/警告：心灵梦魇入侵/)).toBeDefined();
    expect(screen.getByText(`HP: ${NIGHTMARE_CONFIG.dreamLeakDamage}`)).toBeDefined();
    expect(screen.getByText(/当前出战小队/)).toBeDefined();
    expect(screen.getByText(/直接出战防御/)).toBeDefined();
    expect(screen.getByText(/部署炮塔 \+ 出战/)).toBeDefined();
  });

  it('直接出战防御成功 → 警报清除、虚空核心入账', () => {
    hydrate({ type: 'dream_leak', hp: NIGHTMARE_CONFIG.dreamLeakDamage });
    renderPanel();

    fireEvent.click(screen.getByText(/直接出战防御/));

    const saved = JSON.parse(localStorage.getItem('aether_garden_save_Guest') || '{}');
    expect(saved.activeAlert.type).toBeNull();
    expect(saved.inventory.void_core).toBe(1);
  });
});
