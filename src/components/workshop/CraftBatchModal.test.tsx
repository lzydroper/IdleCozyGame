// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameProvider } from '../../context/GameContext';
import { ToastProvider } from '../ToastSystem';
import CraftBatchModal from './CraftBatchModal';
import { RECIPES_CONFIG } from '../../data/recipes';
import { INITIAL_STATE } from '../../data/initialState';

// 水合存档：材料充足（ticket 04 批量弹窗）
const hydrate = (inventory: Record<string, number>) => {
  localStorage.clear();
  localStorage.setItem('aether_garden_save_current_user', 'Guest');
  localStorage.setItem('aether_garden_save_Guest', JSON.stringify({ ...structuredClone(INITIAL_STATE), inventory }));
};

const renderModal = (recipeId: string) =>
  render(
    <GameProvider>
      <ToastProvider>
        <CraftBatchModal recipe={RECIPES_CONFIG[recipeId]} onClose={() => {}} />
      </ToastProvider>
    </GameProvider>
  );

describe('CraftBatchModal（ticket 04 批量合成弹窗）', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('滑条上限 = maxBatch（材料上限），消耗/产出预览随滑条更新', () => {
    hydrate({ glow_fiber: 10, aether_pulp: 3 });
    renderModal('ration_pack');

    const slider = screen.getByTestId('batch-count-slider') as HTMLInputElement;
    expect(slider.max).toBe('3'); // min(⌊10/3⌋, ⌊3/1⌋)

    fireEvent.change(slider, { target: { value: '3' } });
    expect(screen.getByTestId('batch-effect-text').textContent).toContain('压缩口粮 ×3');
  });

  it('批量合成一次原子完成：产出写入存档', () => {
    hydrate({ glow_fiber: 10, aether_pulp: 3 });
    renderModal('ration_pack');

    fireEvent.change(screen.getByTestId('batch-count-slider'), { target: { value: '3' } });
    fireEvent.click(screen.getByTestId('batch-craft-button'));

    const saved = JSON.parse(localStorage.getItem('aether_garden_save_Guest') || '{}');
    expect(saved.inventory.ration).toBe(3);
    expect(saved.inventory.glow_fiber).toBe(1); // 10 - 9
  });

  it('充能配方预览显示充能次数，批量后充能 +capsuleAmount ×N', () => {
    hydrate({ dream_shard: 10, scrap_metal: 10 });
    renderModal('sanity_capsule');

    fireEvent.change(screen.getByTestId('batch-count-slider'), { target: { value: '2' } });
    expect(screen.getByTestId('batch-effect-text').textContent).toContain('梦境充能 +6 次');

    fireEvent.click(screen.getByTestId('batch-craft-button'));
    const saved = JSON.parse(localStorage.getItem('aether_garden_save_Guest') || '{}');
    expect(saved.exploration.capsulesCharge.sanity_capsule).toBe(9); // 初始 3 + 3×2
  });

  it('材料不足时滑条禁用、合成不可用', () => {
    hydrate({ glow_fiber: 2, aether_pulp: 0 });
    renderModal('ration_pack');

    const slider = screen.getByTestId('batch-count-slider') as HTMLInputElement;
    expect(slider.disabled).toBe(true); // maxBatch=0 → 滑条禁用
    expect(screen.getByText(/材料不足，无法批量合成/)).toBeDefined();
    expect((screen.getByTestId('batch-craft-button') as HTMLButtonElement).disabled).toBe(true);
  });
});
