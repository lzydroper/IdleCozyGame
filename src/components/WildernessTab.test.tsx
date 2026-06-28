import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameProvider } from '../context/GameContext';
import WildernessTab from './WildernessTab';

describe('WildernessTab Component', () => {
  it('should render the start exploration view initially', () => {
    render(
      <GameProvider>
        <WildernessTab />
      </GameProvider>
    );

    expect(screen.getByText(/踏入废土荒野/i)).toBeDefined();
    expect(screen.getByText(/探险需要消耗/i)).toBeDefined();
  });

  it('should transition into exploration mode when clicking start', () => {
    render(
      <GameProvider>
        <WildernessTab />
      </GameProvider>
    );

    const startButton = screen.getByText(/开始探索/i);
    fireEvent.click(startButton);

    // 应该能看到当前卡牌面板或步数面板
    expect(screen.getByText(/废土前行步数/i)).toBeDefined();
    expect(screen.getByText(/安全撤退/i)).toBeDefined();
  });
});
