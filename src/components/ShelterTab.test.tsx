import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GameProvider } from '../context/GameContext';
import { ToastProvider } from './ToastSystem';
import ShelterTab from './ShelterTab';

describe('ShelterTab Component UI - Integrated Greenhouse', () => {
  it('should render the integrated greenhouse grid slots', () => {
    render(
      <GameProvider>
        <ToastProvider>
          <ShelterTab />
        </ToastProvider>
      </GameProvider>
    );

    // 应该能找到 4 个培养槽（控制台温室面板中槽位编号为 “槽位 #1”）
    const slots = screen.getAllByText(/槽位 #/i);
    expect(slots.length).toBe(4);
  });

  it('should display plant actions for empty slots', () => {
    render(
      <GameProvider>
        <ToastProvider>
          <ShelterTab />
        </ToastProvider>
      </GameProvider>
    );

    // 闲置中的槽位会显示“点击开始播种”
    const idleSlots = screen.getAllByText(/闲置中/i);
    expect(idleSlots.length).toBeGreaterThan(0);
  });
});
