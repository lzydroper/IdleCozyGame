// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameProvider } from '../context/GameContext';
import { ToastProvider } from './ToastSystem';
import ItemDetailModal from './ItemDetailModal';
import { INITIAL_STATE } from '../data/initialState';
import type { PlayerStats } from '../types/game';

describe('ItemDetailModal Component', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('aether_garden_save_current_user', 'Guest');
  });

  const renderModal = (
    itemId: string,
    onClose = () => {},
    overrides?: { player?: Partial<PlayerStats>; inventory?: Record<string, number>; dreamPollution?: number }
  ) => {
    const save = structuredClone(INITIAL_STATE) as typeof INITIAL_STATE;
    save.inventory = { ...save.inventory, ration: 5, ...overrides?.inventory };
    if (overrides?.player) save.player = { ...save.player, ...overrides.player };
    if (overrides?.dreamPollution !== undefined) save.exploration.dreamPollution = overrides.dreamPollution;
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(save));
    render(
      <GameProvider>
        <ToastProvider>
          <ItemDetailModal itemId={itemId} onClose={onClose} />
        </ToastProvider>
      </GameProvider>
    );
  };

  it('renders item name, held quantity and description', () => {
    renderModal('ration');

    expect(screen.getByText('压缩口粮')).toBeDefined();
    expect(screen.getByText('持有 ×5')).toBeDefined();
    expect(screen.getByText('高热量压缩食物')).toBeDefined();
  });

  it('calls onClose when clicking the close button', () => {
    const onClose = vi.fn();
    renderModal('ration', onClose);

    fireEvent.click(screen.getByLabelText('关闭详情'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when clicking the backdrop', () => {
    const onClose = vi.fn();
    renderModal('ration', onClose);

    fireEvent.click(screen.getByTestId('item-detail-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when clicking inside the modal container', () => {
    const onClose = vi.fn();
    renderModal('ration', onClose);

    fireEvent.click(screen.getByTestId('item-detail-container'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('falls back to the raw id when the item has no config', () => {
    const save = structuredClone(INITIAL_STATE) as typeof INITIAL_STATE;
    save.inventory = { ...save.inventory, unknown_gadget: 1 };
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(save));
    render(
      <GameProvider>
        <ToastProvider>
          <ItemDetailModal itemId="unknown_gadget" onClose={() => {}} />
        </ToastProvider>
      </GameProvider>
    );

    expect(screen.getByText('unknown_gadget')).toBeDefined();
    expect(screen.getByText('持有 ×1')).toBeDefined();
  });

  // === 使用区（ticket 03：恢复类道具批量使用） ===

  it('shows use slider for restorative items with capacity-capped max (ticket 03)', () => {
    // 饱食度 81/100、口粮 +30、拥有 20 → 容量 = ceil(19/30) = 1（最后一个部分生效 +19 到满）
    // 上限 = min(20, 1) = 1（用户原例）
    renderModal('ration', () => {}, { player: { food: 81 }, inventory: { ration: 20 } });
    const slider = screen.getByTestId('use-count-slider') as HTMLInputElement;
    expect(slider).toBeDefined();
    expect(slider.max).toBe('1');
  });

  it('caps slider max by owned qty when capacity allows more (ticket 03)', () => {
    // 饱食度 10/100、口粮 +30、拥有 2 → 容量 floor(90/30)=3 → 上限 = min(2, 3) = 2
    renderModal('ration', () => {}, { player: { food: 10 }, inventory: { ration: 2 } });
    const slider = screen.getByTestId('use-count-slider') as HTMLInputElement;
    expect(slider.max).toBe('2');
  });

  it('shows actual effective value with cap instead of nominal (ticket 03)', () => {
    // 81/100 + 30 → 实际 +19（已满 100）
    renderModal('ration', () => {}, { player: { food: 81 }, inventory: { ration: 20 } });
    const text = screen.getByTestId('use-effect-text').textContent ?? '';
    expect(text).toContain('+19');
    expect(text).toContain('已满');
    expect(text).not.toContain('+30');
  });

  it('uses batch qty, stays open and updates slider in real time (ticket 03)', () => {
    // 10/100 + 口粮×2 = 70；拥有 3 → 用 2 剩 1
    renderModal('ration', () => {}, { player: { food: 10 }, inventory: { ration: 3 } });
    fireEvent.change(screen.getByTestId('use-count-slider'), { target: { value: '2' } });
    // 滑到 2 时预览：+60（10+60=70 未满）
    expect(screen.getByTestId('use-effect-text').textContent).toContain('+60');

    fireEvent.click(screen.getByTestId('use-item-button'));

    // 弹窗停留、持有数量实时更新为 1（3-2）
    expect(screen.getByText('持有 ×1')).toBeDefined();
    // 滑条上限实时更新为 min(1, ceil(30/30)=1) = 1，预览变为剩余 1 个的效果 +30（70→100）
    expect((screen.getByTestId('use-count-slider') as HTMLInputElement).max).toBe('1');
    expect(screen.getByTestId('use-effect-text').textContent).toContain('+30');
  });

  it('disables use button when qty runs out (ticket 03)', () => {
    // 拥有 1，用完 → qty 0 → 按钮禁用
    renderModal('ration', () => {}, { player: { food: 10 }, inventory: { ration: 1 } });
    fireEvent.click(screen.getByTestId('use-item-button'));

    expect(screen.getByText('持有 ×0')).toBeDefined();
    expect((screen.getByTestId('use-item-button') as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows combined effect text for multi-effect items (ticket 03)', () => {
    // 血清：理智 +30、污染 -30（dreamPollution 50）
    renderModal('purifying_serum', () => {}, { player: { sanity: 40 }, inventory: { purifying_serum: 2 }, dreamPollution: 50 });
    const text = screen.getByTestId('use-effect-text').textContent ?? '';
    expect(text).toContain('理智 +30');
    expect(text).toContain('污染 -30');
  });

  it('hides use area for non-restorative items (ticket 03)', () => {
    renderModal('scrap_metal');
    expect(screen.queryByTestId('use-count-slider')).toBeNull();
    expect(screen.queryByTestId('use-item-button')).toBeNull();
  });

  // === 胶囊充能（ticket 04） ===

  it('shows capsule charge slider capped by owned qty without stat cap (ticket 04)', () => {
    renderModal('sanity_capsule', () => {}, { inventory: { sanity_capsule: 5 } });

    const slider = screen.getByTestId('use-count-slider') as HTMLInputElement;
    expect(slider.max).toBe('5');
    // 效果文本：梦境充能 +1 次（无属性封顶）
    expect(screen.getByTestId('use-effect-text').textContent).toContain('梦境充能 +1 次');
  });

  it('uses capsules in batch and updates held qty in real time (ticket 04)', () => {
    renderModal('sanity_capsule', () => {}, { inventory: { sanity_capsule: 3 } });
    fireEvent.change(screen.getByTestId('use-count-slider'), { target: { value: '2' } });

    // 滑到 2：预览「梦境充能 +2 次」
    expect(screen.getByTestId('use-effect-text').textContent).toContain('梦境充能 +2 次');

    fireEvent.click(screen.getByTestId('use-item-button'));

    // 弹窗停留、持有数量实时更新为 1（3-2）、滑条上限收窄为 1
    expect(screen.getByText('持有 ×1')).toBeDefined();
    expect((screen.getByTestId('use-count-slider') as HTMLInputElement).max).toBe('1');
  });
});
