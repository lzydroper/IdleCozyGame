// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GameProvider } from '../context/GameContext';
import { ToastProvider } from './ToastSystem';
import HeroTab from './HeroTab';

describe('HeroTab Component', () => {
  it('renders the starter hero Nova with class, faction and level', () => {
    render(
      <GameProvider>
        <ToastProvider>
          <HeroTab />
        </ToastProvider>
      </GameProvider>
    );

    expect(screen.getByText(/诺娃/)).toBeDefined();
    expect(screen.getByText(/进攻者/)).toBeDefined();
    expect(screen.getByText(/机械/)).toBeDefined();
    expect(screen.getByText(/Lv\.1/)).toBeDefined();
    expect(screen.getByText(/已解锁 1 位英雄/)).toBeDefined();
  });
});
