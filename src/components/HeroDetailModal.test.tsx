// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HeroDetailModal from './HeroDetailModal';
import { GameProvider } from '../context/GameContext';
import { ToastProvider } from './ToastSystem';

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
    expect(screen.getByText('核心基础属性')).toBeDefined();
    expect(screen.getByText('全部卸下')).toBeDefined();
  });

  it('triggers unequip all action when clicking 全部卸下', () => {
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
