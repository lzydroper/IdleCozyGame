// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { GameProvider } from '../context/GameContext';
import { ToastProvider } from './ToastSystem';
import LogTab from './LogTab';
import { INITIAL_STATE } from '../data/initialState';

describe('LogTab Component (ticket 22 背包分类切页)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('aether_garden_save_current_user', 'Guest');
  });

  const renderWithSave = (inventory: Record<string, number>) => {
    const save = structuredClone(INITIAL_STATE) as typeof INITIAL_STATE;
    save.inventory = inventory;
    save.logs = [];
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(save));
    render(
      <GameProvider>
        <ToastProvider>
          <LogTab />
        </ToastProvider>
      </GameProvider>
    );
  };

  it('renders 4 category tabs without an All tab', () => {
    renderWithSave({ ration: 3 });

    expect(screen.getByText('消耗品')).toBeDefined();
    expect(screen.getByText('装备')).toBeDefined();
    expect(screen.getByText('材料')).toBeDefined();
    expect(screen.getByText('碎片')).toBeDefined();
    // 背包分类区无「全部」tab（页面其他区域的日志筛选「全部」按钮不受影响）
    const backpackSection = screen.getByText('避难所物资背囊').closest('div') as HTMLElement;
    expect(within(backpackSection).queryByText('全部')).toBeNull();
  });

  it('defaults to the first non-empty category and shows only its items', () => {
    // 无「全部」分类：背包同时有 4 类物品 → 默认选中第一个非空分类（消耗品）
    renderWithSave({
      ration: 3,
      wasteland_weapon: 1,
      scrap_metal: 5,
      seed_glow_grass: 2,
      dream_shard: 4,
    });

    expect(screen.getAllByText('压缩口粮').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('废土利刃').length).toBe(0);
    expect(screen.queryAllByText('废旧金属').length).toBe(0);
    expect(screen.queryAllByText('梦境碎片').length).toBe(0);
  });

  it('switches category on tab click and filters the grid', () => {
    renderWithSave({
      ration: 3,
      wasteland_weapon: 1,
      scrap_metal: 5,
      dream_shard: 4,
    });

    fireEvent.click(screen.getByText('装备'));
    expect(screen.getAllByText('废土利刃').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('压缩口粮').length).toBe(0);

    fireEvent.click(screen.getByText('材料'));
    expect(screen.getAllByText('废旧金属').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('废土利刃').length).toBe(0);

    fireEvent.click(screen.getByText('碎片'));
    expect(screen.getAllByText('梦境碎片').length).toBeGreaterThan(0);
  });

  it('maps seeds to the material category (材料=material+seed)', () => {
    renderWithSave({ seed_glow_grass: 2, ration: 0 });

    // 只有种子 → 默认选中第一个非空分类（材料）
    expect(screen.getAllByText('荧光草种子').length).toBeGreaterThan(0);
  });

  it('disables empty category tabs', () => {
    renderWithSave({ scrap_metal: 5 });

    const consumableBtn = screen.getByText('消耗品').closest('button') as HTMLButtonElement;
    const equipmentBtn = screen.getByText('装备').closest('button') as HTMLButtonElement;
    const shardBtn = screen.getByText('碎片').closest('button') as HTMLButtonElement;
    const materialBtn = screen.getByText('材料').closest('button') as HTMLButtonElement;

    expect(consumableBtn.disabled).toBe(true);
    expect(equipmentBtn.disabled).toBe(true);
    expect(shardBtn.disabled).toBe(true);
    expect(materialBtn.disabled).toBe(false);
    expect(screen.getAllByText('废旧金属').length).toBeGreaterThan(0);
  });
});
