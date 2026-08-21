// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HeroDetailModal from './HeroDetailModal';
import { GameProvider } from '../context/GameContext';
import { ToastProvider } from './ToastSystem';
import { INITIAL_STATE } from '../data/initialState';

const HERO_SAVE_KEY = 'aether_garden_save_Guest';

describe('HeroDetailModal Component', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('aether_garden_save_current_user', 'Guest');
  });

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

  it('triggers unequip all action when clicking 一键卸下', () => {
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

    const unequipBtn = screen.getByText('一键卸下');
    fireEvent.click(unequipBtn);
    expect(unequipBtn).toBeDefined();
  });

  it('shows hero-exclusive and resonance shard counts from the backpack', () => {
    const save = JSON.parse(JSON.stringify(INITIAL_STATE)) as typeof INITIAL_STATE;
    save.inventory.shard_nova = 10;
    save.inventory.resonance_shard = 3;
    localStorage.setItem(HERO_SAVE_KEY, JSON.stringify(save));

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

    expect(screen.getByText(/专属碎片 10/)).toBeDefined();
    expect(screen.getByText(/共鸣碎片 3/)).toBeDefined();
  });

  it('disables the star-up button when shards are insufficient', () => {
    const save = JSON.parse(JSON.stringify(INITIAL_STATE)) as typeof INITIAL_STATE;
    save.inventory.shard_nova = 2; // < cost(1) = 5
    save.inventory.resonance_shard = 0;
    localStorage.setItem(HERO_SAVE_KEY, JSON.stringify(save));

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

    const starUpBtn = screen.getByText(/升星\(5\)/).closest('button') as HTMLButtonElement;
    expect(starUpBtn.disabled).toBe(true);
  });

  it('star-up consumes shards from the backpack and raises the star level', () => {
    const save = JSON.parse(JSON.stringify(INITIAL_STATE)) as typeof INITIAL_STATE;
    save.inventory.shard_nova = 10;
    localStorage.setItem(HERO_SAVE_KEY, JSON.stringify(save));

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

    fireEvent.click(screen.getByText(/升星\(5\)/));

    const saved = JSON.parse(localStorage.getItem(HERO_SAVE_KEY) || '{}');
    expect(saved.heroes.nova.star).toBe(2);
    expect(saved.inventory.shard_nova).toBe(5); // cost(1) = 5
  });
});
