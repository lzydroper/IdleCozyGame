// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameProvider } from '../context/GameContext';
import { ToastProvider } from './ToastSystem';
import ShelterTab from './ShelterTab';

describe('FacilityCard 配方队列 UI（ticket 13）', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('aether_garden_save_current_user', 'Guest');
  });

  it('renders queue controls and has no survivor-assignment interaction (纯自动)', () => {
    render(
      <GameProvider>
        <ToastProvider>
          <ShelterTab />
        </ToastProvider>
      </GameProvider>
    );

    // 两个设施都渲染出"加入配方队列"与"执行队列（FIFO）"面板
    expect(screen.getAllByText(/加入配方队列/).length).toBe(2);
    expect(screen.getAllByText(/执行队列（FIFO）/).length).toBe(2);
    // 产线纯自动：设施面板没有任何"指派人员"交互
    expect(screen.queryByText(/指派.*产线|派遣.*设施|指派.*加工/)).toBeNull();
  });

  it('enqueues a recipe and shows it in the FIFO queue list', () => {
    render(
      <GameProvider>
        <ToastProvider>
          <ShelterTab />
        </ToastProvider>
      </GameProvider>
    );

    // 找到冶炼炉的配方下拉框（含"提炼合金金属板"选项）
    const smelterSelect = screen
      .getAllByRole('combobox')
      .find(s => Array.from(s.querySelectorAll('option')).some(o => o.textContent?.includes('提炼合金金属板')));
    expect(smelterSelect).toBeDefined();

    fireEvent.change(smelterSelect!, { target: { value: 'smelt_alloy' } });
    fireEvent.click(screen.getAllByText('入队')[0]);

    // 队列中出现该配方条目（选项文本带耗时后缀，此处精确匹配到的即队列条目），且处于"等待启动"
    expect(screen.getByText('提炼合金金属板')).toBeDefined();
    expect(screen.getByText('等待启动')).toBeDefined();
  });
});
