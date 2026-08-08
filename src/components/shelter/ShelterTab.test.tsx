import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameProvider } from '../../context/GameContext';
import { ToastProvider } from '../ToastSystem';
import ShelterTab from './ShelterTab';
import { INITIAL_STATE } from '../../data/initialState';
import type { GameState } from '../../types/game';

describe('ShelterTab Component UI - Integrated Greenhouse', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('aether_garden_save_current_user', 'Guest');
  });

  // 辅助：切换到温室 tab
  const switchToGreenhouse = () => {
    const greenhouseTab = screen.getByText('温室');
    fireEvent.click(greenhouseTab);
  };

  const renderGreenhouse = (save: GameState) => {
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(save));
    render(
      <GameProvider>
        <ToastProvider>
          <ShelterTab />
        </ToastProvider>
      </GameProvider>
    );
    switchToGreenhouse();
  };

  it('should render the integrated greenhouse grid slots', () => {
    render(
      <GameProvider>
        <ToastProvider>
          <ShelterTab />
        </ToastProvider>
      </GameProvider>
    );

    switchToGreenhouse();

    // 应该能找到 4 个培养槽（控制台温室面板中槽位编号为 "槽位 #1"）
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

    switchToGreenhouse();

    // 闲置中的槽位会显示"点击播种"（智能点击版 UI）
    const idleSlots = screen.getAllByText(/点击播种/i);
    expect(idleSlots.length).toBeGreaterThan(0);
  });

  it('renders planted crops with output item icon (GameIcon) and no img element', () => {
    const save = structuredClone(INITIAL_STATE) as GameState;
    save.greenhouse.slots[0] = { id: 1, cropId: 'glow_grass', growthProgress: 30, growthTimeLeft: 21, isWatered: true };
    renderGreenhouse(save);

    // 作物名可见（来自 CROPS_CONFIG）
    expect(screen.getByText('辐射荧光草')).toBeDefined();
    // 湿润标记（10）
    expect(screen.getAllByText('湿润').length).toBe(1);
    // 无任何 <img>（作物单图已删除，产出物品 icon 走 GameIcon sprite）
    expect(screen.queryAllByRole('img').length).toBe(0);
  });

  it('renders 4 tab buttons and switches between them', () => {
    render(
      <GameProvider>
        <ToastProvider>
          <ShelterTab />
        </ToastProvider>
      </GameProvider>
    );

    // 4 个 tab 按钮可见
    expect(screen.getByText('基建')).toBeDefined();
    expect(screen.getByText('温室')).toBeDefined();
    expect(screen.getByText('产线')).toBeDefined();
    expect(screen.getByText('远征')).toBeDefined();

    // 默认在基建 tab，资源指示器已移除
    expect(screen.queryByText('废旧金属')).toBeNull();

    // 切换到温室 tab
    fireEvent.click(screen.getByText('温室'));
    expect(screen.getAllByText(/槽位 #/i).length).toBe(4);

    // 切换到产线 tab
    fireEvent.click(screen.getByText('产线'));
    expect(screen.getAllByText(/加入配方队列/).length).toBe(2);

    // 切换到远征 tab
    fireEvent.click(screen.getByText('远征'));
    expect(screen.getByText(/挂机探索远征/)).toBeDefined();
  });

  it('渲染批量浇水/批量收割按钮与挂机区域（10）', () => {
    renderGreenhouse(structuredClone(INITIAL_STATE) as GameState);

    expect(screen.getByText('批量浇水')).toBeDefined();
    expect(screen.getByText('批量收割')).toBeDefined();
    expect(screen.getByText('温室挂机')).toBeDefined();
    // 未驻守：启用按钮禁用 + 提示
    expect(screen.getByText(/需先指派驻守英雄/)).toBeDefined();
    expect(screen.getByText('启用').closest('button')?.hasAttribute('disabled')).toBe(true);
  });

  it('指派驻守后显示特殊加成徽章（10）', () => {
    const save = structuredClone(INITIAL_STATE) as GameState;
    save.party = []; // 诺娃先离队才能指派驻守（上阵/后勤互斥）
    renderGreenhouse(save);

    // 打开驻守弹窗并指派诺娃（+25% 生长速度）
    fireEvent.click(screen.getByText('驻守'));
    fireEvent.click(screen.getByText('诺娃'));

    expect(screen.getByText('生长速度 +25%')).toBeDefined();
    expect(screen.getByText(/自动浇水 \/ 自动收割并播种/)).toBeDefined();
  });

  it('未湿润作物显示缺水警示，湿润作物显示湿润（10）', () => {
    const save = structuredClone(INITIAL_STATE) as GameState;
    save.greenhouse.slots[0] = { id: 1, cropId: 'glow_grass', growthProgress: 30, growthTimeLeft: 21, isWatered: false };
    save.greenhouse.slots[1] = { id: 2, cropId: 'glow_grass', growthProgress: 30, growthTimeLeft: 21, isWatered: true };
    renderGreenhouse(save);

    expect(screen.getAllByText('浇水').length).toBe(1); // 未湿润 → 浇水标签（智能点击版 UI）
    expect(screen.getAllByText('湿润').length).toBe(1);
  });

  it('挂机流程：指派驻守 → 选种 → 启用后空槽显示托管中（08）', () => {
    const save = structuredClone(INITIAL_STATE) as GameState;
    save.party = []; // 诺娃先离队才能指派驻守（上阵/后勤互斥）
    renderGreenhouse(save);

    // 1. 指派驻守
    fireEvent.click(screen.getByText('驻守'));
    fireEvent.click(screen.getByText('诺娃'));
    // 2. 挂机选种（SeedSelectModal）
    fireEvent.click(screen.getByText('挂机作物'));
    fireEvent.click(screen.getByText('辐射荧光草'));
    // 3. 启用挂机
    fireEvent.click(screen.getByText('启用'));

    expect(screen.getAllByText('托管中').length).toBeGreaterThan(0);
    expect(screen.getByText('关闭')).toBeDefined();
    expect(screen.getByText(/挂机中：自动收割/)).toBeDefined();
  });
});
