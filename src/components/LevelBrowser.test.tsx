// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameProvider } from '../context/GameContext';
import { ToastProvider } from './ToastSystem';
import { LevelBrowser } from './LevelBrowser';
import { REGION_CONFIGS } from '../configs/loaders/regions.loader';
import type { GameState } from '../types/game';
import { INITIAL_STATE, createInitialHero } from '../data/initialState';

const makeTestState = (): GameState => {
  const state: GameState = JSON.parse(JSON.stringify(INITIAL_STATE));
  state.party = ['nova'];
  state.heroes.nova = {
    ...createInitialHero('nova'),
    level: 5,
    wounded: false
  };
  state.stamina = 50;
  state.exploration.regionProgress = { wasteland_entrance: 10 };
  state.combat.clearedLevels = {
    wasteland_entrance: ['wasteland_entrance_1']
  };
  return state;
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <ToastProvider>
      <GameProvider>{ui}</GameProvider>
    </ToastProvider>
  );
};

describe('LevelBrowser Component', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('aether_garden_save_current_user', 'Guest');
  });

  it('renders all level square cards with proper status badges in challenge (active) mode', () => {
    const state = makeTestState();
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(state));

    const onSelectLevel = vi.fn();

    renderWithProviders(
      <LevelBrowser
        regionId="wasteland_entrance"
        mode="active"
        onSelectLevel={onSelectLevel}
      />
    );

    const grid = screen.getByTestId('level-browser-grid');
    expect(grid).toBeDefined();

    // First level is cleared -> 已通关
    const card1 = screen.getByTestId('level-card-wasteland_entrance_1');
    expect(card1.textContent).toContain('已通关');
    expect(card1.textContent).toContain('01');

    // Second level is next unlockable -> 可挑战
    const card2 = screen.getByTestId('level-card-wasteland_entrance_2');
    expect(card2.textContent).toContain('可挑战');
    expect(card2.textContent).toContain('02');

    fireEvent.click(card1);
    expect(onSelectLevel).toHaveBeenCalledWith(REGION_CONFIGS.wasteland_entrance.levels[0]);
  });

  it('renders all level square cards with 可挂机 vs 未解锁 badges in idle mode', () => {
    const state = makeTestState();
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(state));

    const onSelectLevel = vi.fn();

    renderWithProviders(
      <LevelBrowser
        regionId="wasteland_entrance"
        mode="idle"
        onSelectLevel={onSelectLevel}
      />
    );

    // Cleared level -> 可挂机
    const card1 = screen.getByTestId('level-card-wasteland_entrance_1');
    expect(card1.textContent).toContain('可挂机');

    // Un-cleared level -> 未解锁
    const card2 = screen.getByTestId('level-card-wasteland_entrance_2');
    expect(card2.textContent).toContain('未解锁');
  });

  it('renders all levels as 未解锁 when region itself is locked', () => {
    const state = makeTestState();
    state.exploration.regionProgress = { wasteland_entrance: 0 }; // old_town_ruins locked
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(state));

    const onSelectLevel = vi.fn();

    renderWithProviders(
      <LevelBrowser
        regionId="old_town_ruins"
        mode="active"
        onSelectLevel={onSelectLevel}
      />
    );

    const card1 = screen.getByTestId('level-card-old_town_ruins_1');
    expect(card1.textContent).toContain('未解锁');

    const card2 = screen.getByTestId('level-card-old_town_ruins_2');
    expect(card2.textContent).toContain('未解锁');
  });
});
