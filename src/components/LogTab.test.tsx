// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { GameProvider } from '../context/GameContext';
import { ToastProvider } from './ToastSystem';
import LogTab from './LogTab';
import { INITIAL_STATE } from '../data/initialState';

describe('LogTab Component (物品四分类：道具/资源/碎片/装备)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('aether_garden_save_current_user', 'Guest');
  });

  const renderWithSave = (inventory: Record<string, number>) => {
    const save = structuredClone(INITIAL_STATE) as typeof INITIAL_STATE;
    // 背包以传入 inventory 为准：初始默认物品清零（避免 mergeSavedState 的默认值补齐干扰分类断言）
    save.inventory = Object.fromEntries(Object.keys(INITIAL_STATE.inventory).map(k => [k, 0]));
    Object.assign(save.inventory, inventory);
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

  it('renders 4 category tabs (道具/资源/碎片/装备) without an All tab', () => {
    renderWithSave({ ration: 3 });

    expect(screen.getByText('道具')).toBeDefined();
    expect(screen.getByText('资源')).toBeDefined();
    expect(screen.getByText('碎片')).toBeDefined();
    expect(screen.getByText('装备')).toBeDefined();
    // 背包分类区无「全部」tab（页面其他区域的日志筛选「全部」按钮不受影响）
    const backpackSection = screen.getByText('避难所物资背囊').closest('div') as HTMLElement;
    expect(within(backpackSection).queryByText('全部')).toBeNull();
  });

  it('defaults to the first non-empty category and shows only its items', () => {
    // 无「全部」分类：背包同时有 4 类物品 → 默认选中第一个非空分类（道具）
    renderWithSave({
      ration: 3,
      wasteland_weapon: 1,
      scrap_metal: 5,
      seed_glow_grass: 2,
      arcane_orb: 4,
    });

    expect(screen.getAllByText('压缩口粮').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('废土利刃').length).toBe(0);
    expect(screen.queryAllByText('废旧金属').length).toBe(0);
    expect(screen.queryAllByText('奥术星体').length).toBe(0);
  });

  it('switches category on tab click and filters the grid', () => {
    renderWithSave({
      ration: 3,
      wasteland_weapon: 1,
      scrap_metal: 5,
      arcane_orb: 4,
    });

    fireEvent.click(screen.getByText('装备'));
    expect(screen.getAllByText('废土利刃').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('压缩口粮').length).toBe(0);

    fireEvent.click(screen.getByText('资源'));
    expect(screen.getAllByText('废旧金属').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('废土利刃').length).toBe(0);

    fireEvent.click(screen.getByText('碎片'));
    expect(screen.getAllByText('奥术星体').length).toBeGreaterThan(0);
  });

  it('files seeds and dream shards under the resource category (资源)', () => {
    renderWithSave({ seed_glow_grass: 2, dream_shard: 1, ration: 0 });

    // 只有资源类物品 → 默认选中第一个非空分类（资源）
    const backpackSection = screen.getByText('避难所物资背囊').closest('div') as HTMLElement;
    const resourceBtn = within(backpackSection).getByText('资源').closest('button') as HTMLButtonElement;
    expect(resourceBtn.className).toContain('bg-emerald-500/15'); // 选中态
    expect(screen.getAllByText('荧光草种子').length).toBeGreaterThan(0);
    expect(screen.getAllByText('梦境碎片').length).toBeGreaterThan(0);
  });

  it('files consumables like energy refills under 道具, not 装备', () => {
    renderWithSave({ energy_refill: 1, stimpack: 1 });

    // 默认道具 tab：能量补充剂可见
    expect(screen.getAllByText('能量补充剂').length).toBeGreaterThan(0);
    expect(screen.getAllByText('废土肾上腺素').length).toBeGreaterThan(0);

    // 装备 tab 为空禁用
    const equipmentBtn = screen.getByText('装备').closest('button') as HTMLButtonElement;
    expect(equipmentBtn.disabled).toBe(true);
  });

  it('disables empty category tabs', () => {
    renderWithSave({ scrap_metal: 5 });

    const itemBtn = screen.getByText('道具').closest('button') as HTMLButtonElement;
    const equipmentBtn = screen.getByText('装备').closest('button') as HTMLButtonElement;
    const shardBtn = screen.getByText('碎片').closest('button') as HTMLButtonElement;
    const resourceBtn = screen.getByText('资源').closest('button') as HTMLButtonElement;

    expect(itemBtn.disabled).toBe(true);
    expect(equipmentBtn.disabled).toBe(true);
    expect(shardBtn.disabled).toBe(true);
    expect(resourceBtn.disabled).toBe(false);
    expect(screen.getAllByText('废旧金属').length).toBeGreaterThan(0);
  });
});
