// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameProvider } from '../context/GameContext';
import { ToastProvider } from './ToastSystem';
import RegionSelectorModal from './RegionSelectorModal';
import RegionDetailModal from './RegionDetailModal';
import { INITIAL_STATE } from '../data/initialState';
import type { GameState } from '../types/game';

describe('RegionSelectorModal and RegionDetailModal Components', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders visible regions (unlocked + 1st locked) and hides deeper locked regions', () => {
    const onConfirmSelect = vi.fn();
    const onClose = vi.fn();

    render(
      <GameProvider>
        <ToastProvider>
          <RegionSelectorModal
            isOpen={true}
            onClose={onClose}
            mode="combat"
            selectedRegionId="wasteland_entrance"
            onConfirmSelect={onConfirmSelect}
          />
        </ToastProvider>
      </GameProvider>
    );

    // Initial state: wasteland_entrance is unlocked (with "当前" badge and "已解锁")
    expect(screen.getByText('废土边缘')).toBeDefined();
    expect(screen.getByText('当前')).toBeDefined();
    expect(screen.getAllByText('已解锁').length).toBeGreaterThanOrEqual(1);

    // old_town_ruins is the 1st locked region (shows "待解锁")
    expect(screen.getByText('旧城废墟')).toBeDefined();
    expect(screen.getByText('待解锁')).toBeDefined();

    // radiated_workshop is deeper locked, should be completely hidden
    expect(screen.queryByText('辐射车间')).toBeNull();
  });

  it('opens RegionDetailModal when a region item is clicked', () => {
    const onConfirmSelect = vi.fn();
    const onClose = vi.fn();

    render(
      <GameProvider>
        <ToastProvider>
          <RegionSelectorModal
            isOpen={true}
            onClose={onClose}
            mode="combat"
            selectedRegionId="wasteland_entrance"
            onConfirmSelect={onConfirmSelect}
          />
        </ToastProvider>
      </GameProvider>
    );

    // Click on old_town_ruins (locked region)
    fireEvent.click(screen.getByTestId('region-item-old_town_ruins'));

    // RegionDetailModal should now be open
    expect(screen.getByTestId('region-detail-modal')).toBeDefined();
    expect(screen.getByTestId('lock-diagnostics-section')).toBeDefined();
    expect(screen.getByText(/区域解锁条件诊断/)).toBeDefined();
    expect(screen.getByText(/前置区域【废土边缘】全部关卡通关/)).toBeDefined();
    expect(screen.getByText('未通关')).toBeDefined();

    // Buttons strictly standardized: 确认 and 取消
    const confirmBtn = screen.getByRole('button', { name: '确认' });
    const cancelBtn = screen.getByRole('button', { name: '取消' });
    expect(confirmBtn).toBeDefined();
    expect(cancelBtn).toBeDefined();
    expect(confirmBtn.className).toContain('h-9.5');
    expect(cancelBtn.className).toContain('h-9.5');

    // Confirm button is enabled even for locked region
    fireEvent.click(confirmBtn);
    expect(onConfirmSelect).toHaveBeenCalledWith('old_town_ruins');
    expect(onClose).toHaveBeenCalled();
  });

  it('RegionDetailModal handles unlocked region confirmation properly', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    render(
      <GameProvider>
        <ToastProvider>
          <RegionDetailModal
            isOpen={true}
            regionId="wasteland_entrance"
            mode="exploration"
            onClose={onClose}
            onConfirm={onConfirm}
          />
        </ToastProvider>
      </GameProvider>
    );

    expect(screen.getByTestId('region-detail-modal')).toBeDefined();
    // Unlocked region does not show lock diagnostics
    expect(screen.queryByTestId('lock-diagnostics-section')).toBeNull();

    const confirmBtn = screen.getByRole('button', { name: '确认' });
    expect(confirmBtn.className).toContain('bg-gradient-to-r');
    expect(confirmBtn.className).toContain('h-9.5');

    fireEvent.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalledWith('wasteland_entrance');
  });

  it('RegionDetailModal closes when clicking cancel', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    render(
      <GameProvider>
        <ToastProvider>
          <RegionDetailModal
            isOpen={true}
            regionId="old_town_ruins"
            mode="combat"
            onClose={onClose}
            onConfirm={onConfirm}
          />
        </ToastProvider>
      </GameProvider>
    );

    const cancelBtn = screen.getByRole('button', { name: '取消' });
    fireEvent.click(cancelBtn);
    expect(onClose).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('reveals deeper regions when previous regions are cleared', () => {
    const save = JSON.parse(JSON.stringify(INITIAL_STATE)) as GameState;
    save.combat.clearedLevels = {
      wasteland_entrance: ['wasteland_entrance_1', 'wasteland_entrance_2']
    };
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(save));

    render(
      <GameProvider>
        <ToastProvider>
          <RegionSelectorModal
            isOpen={true}
            onClose={vi.fn()}
            mode="combat"
            selectedRegionId="old_town_ruins"
            onConfirmSelect={vi.fn()}
          />
        </ToastProvider>
      </GameProvider>
    );

    // Wasteland entrance (unlocked)
    expect(screen.getByText('废土边缘')).toBeDefined();
    // Old town ruins (now unlocked)
    expect(screen.getByText('旧城废墟')).toBeDefined();
    // Radiated workshop is now the 1st locked region visible
    expect(screen.getByText('辐射车间')).toBeDefined();
  });
});
