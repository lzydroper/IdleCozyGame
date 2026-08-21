// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { GameProvider } from '../context/GameContext';
import { ToastProvider } from './ToastSystem';
import ExpLevelUpModal from './ExpLevelUpModal';
import { INITIAL_STATE, createInitialHero } from '../data/initialState';

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <ToastProvider>
      <GameProvider>{ui}</GameProvider>
    </ToastProvider>
  );
};

describe('ExpLevelUpModal (批量升级 · 经验手册，15 号)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('aether_garden_save_current_user', 'Guest');
  });

  it('renders slider up to held tomes and shows level-up preview', () => {
    const save = {
      ...INITIAL_STATE,
      inventory: { ...INITIAL_STATE.inventory, exp_tome: 3 },
      heroes: { nova: createInitialHero('nova') } // Lv.1
    };
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(save));

    renderWithProviders(<ExpLevelUpModal isOpen={true} heroId="nova" onClose={() => {}} />);

    expect(screen.getByText('批量升级 · 经验手册')).toBeDefined();
    const slider = screen.getByTestId('exp-levelup-slider') as HTMLInputElement;
    expect(slider.max).toBe('3');

    // 滑到 2 本 → 预览 Lv.1 → Lv.2（100 经验升 1 级，剩 100）
    fireEvent.change(slider, { target: { value: '2' } });
    expect(screen.getByText(/Lv\.1 → Lv\.2/)).toBeDefined();
    expect(screen.getByText(/升级 ×1 · 天赋点 \+1/)).toBeDefined();
  });

  it('confirms and consumes tomes, upgrading the hero in the save', () => {
    const save = {
      ...INITIAL_STATE,
      inventory: { ...INITIAL_STATE.inventory, exp_tome: 2 },
      heroes: { nova: createInitialHero('nova') }
    };
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(save));

    renderWithProviders(<ExpLevelUpModal isOpen={true} heroId="nova" onClose={() => {}} />);

    const slider = screen.getByTestId('exp-levelup-slider') as HTMLInputElement;
    fireEvent.change(slider, { target: { value: '1' } });
    fireEvent.click(screen.getByTestId('exp-levelup-confirm'));

    const saved = JSON.parse(localStorage.getItem('aether_garden_save_Guest') || '{}');
    expect(saved.inventory.exp_tome).toBe(1);
    expect(saved.heroes.nova.level).toBe(2);
    expect(saved.heroes.nova.talentPoints).toBe(1);
  });

  it('disables confirm when no tomes held', () => {
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(INITIAL_STATE));
    renderWithProviders(<ExpLevelUpModal isOpen={true} heroId="nova" onClose={() => {}} />);

    const confirm = screen.getByTestId('exp-levelup-confirm') as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    expect(screen.getByText('背包中没有经验手册')).toBeDefined();
  });
});
