// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameProvider } from '../context/GameContext';
import { ToastProvider } from './ToastSystem';
import ItemDetailModal from './ItemDetailModal';
import { INITIAL_STATE } from '../data/initialState';

describe('ItemDetailModal Component', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('aether_garden_save_current_user', 'Guest');
  });

  const renderModal = (itemId: string, onClose = () => {}) => {
    const save = structuredClone(INITIAL_STATE) as typeof INITIAL_STATE;
    save.inventory = { ...save.inventory, ration: 5 };
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
});
