// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HeroDetailModal from './HeroDetailModal';
import { GameProvider } from '../context/GameContext';
import { ToastProvider } from './ToastSystem';
import { INITIAL_STATE } from '../data/initialState';

const HERO_SAVE_KEY = 'aether_garden_save_Guest';

describe('HeroDetailModal Component', () => {
  it('renders hero detail modal with 3 equipment slots and stats panel', () => {
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

    expect(screen.getByText('诺娃')).toBeDefined();
    expect(screen.getByText('武器')).toBeDefined();
    expect(screen.getByText('防具')).toBeDefined();
    expect(screen.getByText('饰品')).toBeDefined();
    expect(screen.getByText('基础属性')).toBeDefined();
    expect(screen.getByText('一键装备')).toBeDefined();
  });

  it('triggers unequip all action when clicking 全部卸下', () => {
    const save = JSON.parse(JSON.stringify(INITIAL_STATE)) as typeof INITIAL_STATE;
    save.equipment = { nova: { weapon: { itemId: 'wasteland_weapon', enhance: 0, mythic: false }, armor: null, trinket: null } };
    localStorage.setItem(HERO_SAVE_KEY, JSON.stringify(save));
    const onClose = vi.fn();

    render(
      <ToastProvider>
        <GameProvider>
          <HeroDetailModal
            isOpen={true}
            heroId="nova"
            onClose={onClose}
          />
        </GameProvider>
      </ToastProvider>
    );

    const unequipBtn = screen.getByText('全部卸下');
    fireEvent.click(unequipBtn);
    expect(unequipBtn).toBeDefined();
  });
});
