// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HeroDetailModal from './HeroDetailModal';
import EquipmentDetailModal from './EquipmentDetailModal';
import EquipSelectorModal from './EquipSelectorModal';
import { GameProvider } from '../context/GameContext';
import { ToastProvider } from './ToastSystem';
import { INITIAL_STATE } from '../data/initialState';

const HERO_SAVE_KEY = 'aether_garden_save_Guest';

describe('EquipmentDetailModal and EquipSelectorModal (issue 19)', () => {
  it('renders EquipmentDetailModal with faction tag, set info, stats, and milestone rewards', () => {
    const save = JSON.parse(JSON.stringify(INITIAL_STATE)) as typeof INITIAL_STATE;
    save.heroes.nova = { level: 1, exp: 0, hp: 100, maxHp: 100, star: 1, wounded: false, talentPoints: 0, talents: {}, awakened: false, logisticsFacilityId: null };
    save.equipment = {
      nova: {
        weapon: { itemId: 'wasteland_weapon', enhance: 20, mythic: false },
        armor: null,
        trinket: null
      }
    };
    save.inventory.enhance_stone = 50;
    localStorage.setItem(HERO_SAVE_KEY, JSON.stringify(save));
    localStorage.setItem('aether_garden_save_current_user', 'Guest');

    const onClose = vi.fn();

    render(
      <ToastProvider>
        <GameProvider>
          <EquipmentDetailModal
            isOpen={true}
            heroId="nova"
            slot="weapon"
            onClose={onClose}
          />
        </GameProvider>
      </ToastProvider>
    );

    expect(screen.getByText('装备详情')).toBeDefined();
    expect(screen.getByText('废土利刃')).toBeDefined();
    expect(screen.getByText('+20')).toBeDefined();
    expect(screen.getByText(/【机械】英雄穿戴后，装备属性增加30%/)).toBeDefined();
    expect(screen.getByText(/废土系列/)).toBeDefined();
    expect(screen.getByText('装备属性')).toBeDefined();
    expect(screen.getByText('强化等级奖励')).toBeDefined();
    expect(screen.getByText('卸下')).toBeDefined();
    expect(screen.getByText('强化')).toBeDefined();
    expect(screen.getByText('替换')).toBeDefined();
  });

  it('performs 100% enhance operation when clicking 强化 button', () => {
    const save = JSON.parse(JSON.stringify(INITIAL_STATE)) as typeof INITIAL_STATE;
    save.heroes.nova = { level: 1, exp: 0, hp: 100, maxHp: 100, star: 1, wounded: false, talentPoints: 0, talents: {}, awakened: false, logisticsFacilityId: null };
    save.equipment = {
      nova: {
        weapon: { itemId: 'wasteland_weapon', enhance: 5, mythic: false },
        armor: null,
        trinket: null
      }
    };
    save.inventory.enhance_stone = 100;
    localStorage.setItem(HERO_SAVE_KEY, JSON.stringify(save));
    localStorage.setItem('aether_garden_save_current_user', 'Guest');

    render(
      <ToastProvider>
        <GameProvider>
          <EquipmentDetailModal
            isOpen={true}
            heroId="nova"
            slot="weapon"
            onClose={vi.fn()}
          />
        </GameProvider>
      </ToastProvider>
    );

    const enhanceBtn = screen.getByRole('button', { name: '强化' });
    fireEvent.click(enhanceBtn);
    expect(screen.getByText('+6')).toBeDefined();
  });

  it('renders EquipSelectorModal and equips item when selected', () => {
    const save = JSON.parse(JSON.stringify(INITIAL_STATE)) as typeof INITIAL_STATE;
    save.heroes.nova = { level: 1, exp: 0, hp: 100, maxHp: 100, star: 1, wounded: false, talentPoints: 0, talents: {}, awakened: false, logisticsFacilityId: null };
    save.inventory.wasteland_weapon = 1;
    localStorage.setItem(HERO_SAVE_KEY, JSON.stringify(save));
    localStorage.setItem('aether_garden_save_current_user', 'Guest');

    const onClose = vi.fn();

    render(
      <ToastProvider>
        <GameProvider>
          <EquipSelectorModal
            isOpen={true}
            heroId="nova"
            slot="weapon"
            onClose={onClose}
          />
        </GameProvider>
      </ToastProvider>
    );

    expect(screen.getByText('选择武器')).toBeDefined();
    expect(screen.getByText('废土利刃')).toBeDefined();

    const equipBtn = screen.getByRole('button', { name: '装备' });
    fireEvent.click(equipBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it('opens EquipSelectorModal when clicking empty equipment slot in HeroDetailModal', () => {
    const save = JSON.parse(JSON.stringify(INITIAL_STATE)) as typeof INITIAL_STATE;
    save.heroes.nova = { level: 1, exp: 0, hp: 100, maxHp: 100, star: 1, wounded: false, talentPoints: 0, talents: {}, awakened: false, logisticsFacilityId: null };
    save.inventory.wasteland_weapon = 1;
    localStorage.setItem(HERO_SAVE_KEY, JSON.stringify(save));
    localStorage.setItem('aether_garden_save_current_user', 'Guest');

    render(
      <ToastProvider>
        <GameProvider>
          <HeroDetailModal
            isOpen={true}
            heroId="nova"
            onClose={vi.fn()}
          />
        </GameProvider>
      </ToastProvider>
    );

    const weaponSlot = screen.getByTitle('选择【武器】装备');
    fireEvent.click(weaponSlot);

    expect(screen.getByText('选择武器')).toBeDefined();
    expect(screen.getByText('废土利刃')).toBeDefined();
  });
});
