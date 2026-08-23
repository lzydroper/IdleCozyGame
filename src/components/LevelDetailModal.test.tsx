// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameProvider } from '../context/GameContext';
import { ToastProvider } from './ToastSystem';
import { LevelDetailModal } from './LevelDetailModal';
import { REGION_CONFIGS } from '../configs/loaders/regions.loader';
import type { GameState } from '../types/game';
import { INITIAL_STATE, createInitialHero } from '../configs/seed/initialState';

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
  return state;
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <ToastProvider>
      <GameProvider>{ui}</GameProvider>
    </ToastProvider>
  );
};

describe('LevelDetailModal Component', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('aether_garden_save_current_user', 'Guest');
  });

  it('renders level info, stamina cost, enemies, and drops properly', () => {
    const state = makeTestState();
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(state));

    const level = REGION_CONFIGS.wasteland_entrance.levels[0];
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    renderWithProviders(
      <LevelDetailModal
        isOpen={true}
        regionId="wasteland_entrance"
        level={level}
        mode="active"
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByText(`废土边缘 · ${level.name}`)).toBeDefined(); // 全称由 UI 派生（U#3 方案 A）
    expect(screen.getByText(`消耗体力: ${level.staminaCost} 点`)).toBeDefined();
    expect(screen.getByText('敌方阵容')).toBeDefined();
    expect(screen.getByText('战利品掉落')).toBeDefined();

    const confirmBtn = screen.getByTestId('level-detail-confirm-btn');
    expect(confirmBtn.textContent).toContain('确认');
    expect(confirmBtn.hasAttribute('disabled')).toBe(false);

    fireEvent.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalledWith('wasteland_entrance', level.id);
    expect(onClose).toHaveBeenCalled();
  });

  it('disables confirm button and shows warning if level is not cleared in idle mode', () => {
    const state = makeTestState();
    state.combat.clearedLevels = { wasteland_entrance: [] }; // un-cleared
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(state));

    const level = REGION_CONFIGS.wasteland_entrance.levels[0];
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    renderWithProviders(
      <LevelDetailModal
        isOpen={true}
        regionId="wasteland_entrance"
        level={level}
        mode="idle"
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    const alertBox = screen.getByTestId('level-lock-alert');
    expect(alertBox.textContent).toContain('未通关此关卡，无法开启挂机');

    const confirmBtn = screen.getByTestId('level-detail-confirm-btn');
    expect(confirmBtn.textContent).toContain('确认');
    expect(confirmBtn.hasAttribute('disabled')).toBe(true);

    fireEvent.click(confirmBtn);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('disables confirm button when region is locked', () => {
    const state = makeTestState();
    state.exploration.regionProgress = { wasteland_entrance: 0 }; // old_town_ruins locked
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(state));

    const level = REGION_CONFIGS.old_town_ruins.levels[0];
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    renderWithProviders(
      <LevelDetailModal
        isOpen={true}
        regionId="old_town_ruins"
        level={level}
        mode="active"
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    const alertBox = screen.getByTestId('level-lock-alert');
    expect(alertBox.textContent).toContain('区域待解锁，本关卡信息处于封锁状态');

    const confirmBtn = screen.getByTestId('level-detail-confirm-btn');
    expect(confirmBtn.textContent).toContain('确认');
    expect(confirmBtn.hasAttribute('disabled')).toBe(true);
  });

  it('disables confirm button when party has wounded hero', () => {
    const state = makeTestState();
    state.heroes.nova.wounded = true;
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(state));

    const level = REGION_CONFIGS.wasteland_entrance.levels[0];
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    renderWithProviders(
      <LevelDetailModal
        isOpen={true}
        regionId="wasteland_entrance"
        level={level}
        mode="active"
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    const alertBox = screen.getByTestId('level-lock-alert');
    expect(alertBox.textContent).toContain('小队有重伤英雄');

    const confirmBtn = screen.getByTestId('level-detail-confirm-btn');
    expect(confirmBtn.hasAttribute('disabled')).toBe(true);
  });
});
