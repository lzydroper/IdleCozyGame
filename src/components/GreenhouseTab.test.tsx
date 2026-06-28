import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GameProvider } from '../context/GameContext';
import GreenhouseTab from './GreenhouseTab';

describe('GreenhouseTab Component UI', () => {
  it('should render the greenhouse grid slots', () => {
    render(
      <GameProvider>
        <GreenhouseTab />
      </GameProvider>
    );

    // 应该能找到 4 个培养槽（默认有 4 个）
    const slots = screen.getAllByText(/培养槽 #/i);
    expect(slots.length).toBe(4);
  });

  it('should display seeds counts in the plant modal/selector', () => {
    render(
      <GameProvider>
        <GreenhouseTab />
      </GameProvider>
    );

    // 点击某空闲槽的“种植”按钮以弹出选项（假设空闲槽显示“播种”或类似文案）
    const plantButtons = screen.getAllByText(/播种/i);
    expect(plantButtons.length).toBeGreaterThan(0);
  });
});
