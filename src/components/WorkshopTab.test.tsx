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
});
