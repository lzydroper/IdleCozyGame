import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GameProvider } from '../context/GameContext';
import { ToastProvider } from './ToastSystem';
import ShelterTab from './ShelterTab';
import { INITIAL_STATE } from '../data/initialState';

describe('ShelterTab Component UI - Integrated Greenhouse', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('aether_garden_save_current_user', 'Guest');
  });

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

  it('renders planted crops with a Lucide placeholder and no img element (single images removed)', () => {
    const save = structuredClone(INITIAL_STATE) as typeof INITIAL_STATE;
    save.greenhouse.slots[0] = { id: 1, cropId: 'glow_grass', growthProgress: 30, growthTimeLeft: 21, isWatered: true };
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(save));

    render(
      <GameProvider>
        <ToastProvider>
          <ShelterTab />
        </ToastProvider>
      </GameProvider>
    );

    // 作物名可见（来自 CROPS_CONFIG）
    expect(screen.getByText('辐射荧光草')).toBeDefined();
    // 无任何 <img>（作物单图已删除，统一 Lucide 占位）
    expect(screen.queryAllByRole('img').length).toBe(0);
  });
});
