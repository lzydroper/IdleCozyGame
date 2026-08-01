import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GameProvider } from '../context/GameContext';
import { ToastProvider } from './ToastSystem';
import WorkshopTab from './WorkshopTab';

describe('WorkshopTab Component', () => {
  it('should render the craft recipes list', () => {
    render(
      <GameProvider>
        <ToastProvider>
          <WorkshopTab />
        </ToastProvider>
      </GameProvider>
    );

    expect(screen.getByText(/防化口粮包/i)).toBeDefined();
    expect(screen.getAllByText(/魔能过滤罐/i).length).toBeGreaterThan(0);
  });

  it('locks blueprint-gated equipment recipes until the blueprint is obtained (ticket 10)', () => {
    // 默认存档没有余烬军械图纸 → 余烬配方锁定
    render(
      <GameProvider>
        <ToastProvider>
          <WorkshopTab />
        </ToastProvider>
      </GameProvider>
    );

    expect(screen.getAllByText(/🔒 未解锁/).length).toBeGreaterThanOrEqual(3); // 余烬三件套
    expect(screen.getAllByText(/需要图纸：余烬军械图纸/).length).toBeGreaterThanOrEqual(3);
    // 废土系列无图纸门槛，可直接合成
    expect(screen.getByText(/废土利刃锻造/)).toBeDefined();
  });
});
