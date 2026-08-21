// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameProvider } from '../context/GameContext';
import { ToastProvider } from './ToastSystem';
import EquipSelectorModal from './EquipSelectorModal';
import { INITIAL_STATE, createInitialHero } from '../data/initialState';

describe('EquipSelectorModal Component (背包装备实例选择, ADR-0014 修订)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('aether_garden_save_current_user', 'Guest');
  });

  const renderModal = (
    equipmentInventory: Record<string, { itemId: string; enhance: number; mythic: boolean }[]>
  ) => {
    const save = structuredClone(INITIAL_STATE) as typeof INITIAL_STATE;
    save.heroes = { nova: { ...createInitialHero('nova'), hp: 100, wounded: false } };
    save.equipmentInventory = equipmentInventory as typeof INITIAL_STATE.equipmentInventory;
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(save));
    render(
      <GameProvider>
        <ToastProvider>
          <EquipSelectorModal isOpen heroId="nova" slot="weapon" onClose={() => {}} />
        </ToastProvider>
      </GameProvider>
    );
  };

  it('lists every instance with enhance badge and equips the selected one', () => {
    renderModal({
      wasteland_weapon: [
        { itemId: 'wasteland_weapon', enhance: 0, mythic: false },
        { itemId: 'wasteland_weapon', enhance: 10, mythic: false }
      ]
    });

    // 两个实例各一张卡：名称出现两次，+10 徽章可见
    expect(screen.getAllByText('废土利刃').length).toBe(2);
    expect(screen.getAllByText('+10').length).toBeGreaterThan(0);

    // 点击含 +10 徽章卡片上的「装备」按钮 → 穿戴 +10 实例
    const target = screen
      .getAllByText('装备')
      .find(b => b.closest('div')?.textContent?.includes('+10')) as HTMLButtonElement;
    fireEvent.click(target);

    const saved = JSON.parse(localStorage.getItem('aether_garden_save_Guest') || '{}');
    expect(saved.equipment.nova.weapon).toEqual({ itemId: 'wasteland_weapon', enhance: 10, mythic: false });
    // 背包仅剩 +0 实例
    expect(saved.equipmentInventory.wasteland_weapon).toEqual([{ itemId: 'wasteland_weapon', enhance: 0, mythic: false }]);
  });

  it('shows empty state when no instance of the slot exists', () => {
    renderModal({});
    expect(screen.getByText(/背包中暂无可用的【武器】/)).toBeDefined();
  });
});
