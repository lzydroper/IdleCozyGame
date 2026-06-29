import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameProvider } from '../context/GameContext';
import { ToastProvider } from './ToastSystem';
import DreamscapeTab from './DreamscapeTab';

describe('DreamscapeTab Component', () => {
  it('should render the dream entry page initially', () => {
    render(
      <GameProvider>
        <ToastProvider>
          <DreamscapeTab />
        </ToastProvider>
      </GameProvider>
    );

    expect(screen.getByText(/同步潜入心灵梦境/i)).toBeDefined();
  });

  it('should transition to dreamscape view when entering dream', () => {
    render(
      <GameProvider>
        <ToastProvider>
          <DreamscapeTab />
        </ToastProvider>
      </GameProvider>
    );

    const enterButton = screen.getByText(/开始共鸣入梦/i);
    fireEvent.click(enterButton);

    expect(screen.getByText(/当前精神污染/i)).toBeDefined();
  });
});
