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

  const renderWithSave = (inventory: Record<string, number>, equipmentInventory?: Record<string, import('../types/game').EquippedItem[]>) => {
    const save = structuredClone(INITIAL_STATE) as typeof INITIAL_STATE;
    // 背包以传入 inventory 为准：初始默认物品清零（避免 mergeSavedState 的默认值补齐干扰分类断言）
    save.inventory = Object.fromEntries(Object.keys(INITIAL_STATE.inventory).map(k => [k, 0]));
    Object.assign(save.inventory, inventory);
    if (equipmentInventory) save.equipmentInventory = equipmentInventory;
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

    // 装备 tab 为空：可点击查看空状态（不再禁用）
    fireEvent.click(screen.getByText('装备'));
    expect(screen.getByText('该分类暂无物资')).toBeDefined();
  });

  it('files scene devices (turret/battery/counter/lens) under 资源, not 道具 (ADR-0016)', () => {
    renderWithSave({
      defensive_turret: 1,
      shield_battery: 1,
      geiger_counter: 1,
      deflective_lens: 1,
      ration: 1,
    });

    // 默认选中第一个非空分类（道具）：只显示口粮，装置不可见
    expect(screen.getAllByText('压缩口粮').length).toBeGreaterThan(0);
    expect(screen.queryByText('防御炮塔')).toBeNull();

    // 切到资源 tab：4 个装置全部可见
    fireEvent.click(screen.getByText('资源'));
    expect(screen.getAllByText('防御炮塔').length).toBeGreaterThan(0);
    expect(screen.getAllByText('重载护盾电池').length).toBeGreaterThan(0);
    expect(screen.getAllByText('盖革探测仪').length).toBeGreaterThan(0);
    expect(screen.getAllByText('偏光魔导镜片').length).toBeGreaterThan(0);
    expect(screen.queryByText('压缩口粮')).toBeNull();
  });

  it('opens item detail modal on item click and closes via backdrop (ticket 02)', () => {
    renderWithSave({ ration: 3 });

    // 点击物品格 → 详情弹窗出现（描述文本仅在弹窗内）
    fireEvent.click(screen.getByText('压缩口粮'));
    expect(screen.getByText('高热量压缩食物')).toBeDefined();

    // 点击遮罩 → 弹窗关闭
    fireEvent.click(screen.getByTestId('item-detail-backdrop'));
    expect(screen.queryByText('高热量压缩食物')).toBeNull();
  });

  it('removes hover tooltip (native title and bubble) from item tiles (ticket 02)', () => {
    renderWithSave({ ration: 3 });

    // 气泡移除：物品名只渲染一次（格子），不再有 tooltip 副本
    expect(screen.getAllByText('压缩口粮')).toHaveLength(1);
    // 原生 title 移除
    const tile = screen.getByText('压缩口粮').closest('div') as HTMLElement;
    expect(tile.hasAttribute('title')).toBe(false);
  });

  it('shows equipment as non-stackable instances - one tile per instance with enhance badge (ADR-0017 修订)', () => {
    renderWithSave(
      { scrap_metal: 5 },
      {
        wasteland_weapon: [
          { itemId: 'wasteland_weapon', enhance: 0, mythic: false },
          { itemId: 'wasteland_weapon', enhance: 10, mythic: false }
        ]
      }
    );

    // 默认资源分类：装备不在其中
    expect(screen.queryByText('废土利刃')).toBeNull();

    // 装备分类：两件实例 → 两个独立格子（不可堆叠，无 xN 数量），+10 强化徽章可见
    fireEvent.click(screen.getByText('装备'));
    expect(screen.getAllByText('废土利刃').length).toBe(2);
    expect(screen.getByText('+10')).toBeDefined();
    expect(screen.queryByText('x2')).toBeNull();
  });

  it('empty category tabs are clickable and show the empty state (no disabled tabs)', () => {
    renderWithSave({ scrap_metal: 5 });

    // 默认选中第一个非空分类（资源），物品可见
    expect(screen.getAllByText('废旧金属').length).toBeGreaterThan(0);

    // 空分类（碎片/道具）可点击查看空状态
    fireEvent.click(screen.getByText('碎片'));
    expect(screen.getByText('该分类暂无物资')).toBeDefined();

    fireEvent.click(screen.getByText('道具'));
    expect(screen.getByText('该分类暂无物资')).toBeDefined();

    // 切回资源：物品仍可见
    fireEvent.click(screen.getByText('资源'));
    expect(screen.getAllByText('废旧金属').length).toBeGreaterThan(0);

    // 无任何 tab 被禁用
    for (const label of ['道具', '资源', '碎片', '装备']) {
      const btn = screen.getByText(label).closest('button') as HTMLButtonElement;
      expect(btn.disabled, label).toBe(false);
    }
  });
});
