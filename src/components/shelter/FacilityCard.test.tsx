// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameProvider } from '../../context/GameContext';
import { ToastProvider } from '../ToastSystem';
import ShelterTab from './ShelterTab';
import { INITIAL_STATE } from '../../data/initialState';
import type { GameState } from '../../types/game';

describe('FacilityCard 单任务状态摘要 UI（issue 06）', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('aether_garden_save_current_user', 'Guest');
  });

  // 辅助：切换到产线 tab
  const switchToFacility = () => {
    fireEvent.click(screen.getByText('产线'));
  };

  it('渲染待机态状态摘要：每台设备显示「待机 · 空闲」与驻守入口，无队列 UI', () => {
    render(
      <GameProvider>
        <ToastProvider>
          <ShelterTab />
        </ToastProvider>
      </GameProvider>
    );

    switchToFacility();

    // 两个设施（冶炼炉/组装台）都渲染待机态摘要与驻守按钮
    expect(screen.getAllByText('待机 · 空闲').length).toBe(2);
    expect(screen.getAllByText('未驻守英雄').length).toBe(2);
    expect(screen.getAllByText('驻守').length).toBe(2);
    // 队列 UI 已移除
    expect(screen.queryByText(/加入配方队列/)).toBeNull();
    expect(screen.queryByText(/执行队列（FIFO）/)).toBeNull();
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('渲染生产中任务状态摘要：配方名、已产/目标、进度条与剩余时间', () => {
    const save = structuredClone(INITIAL_STATE) as GameState;
    save.shelter.facilities.smelter[0] = {
      id: 'smelter',
      name: '魔导冶炼炉',
      level: 2,
      recipeId: 'smelt_alloy',
      targetCount: 3,
      completedCount: 1,
      timeLeft: 10, // 当前批剩余（Lv2 单批 25s）
      currentProgress: 60
    };
    // 避免模块级 lastTick 时间戳导致渲染触发离线结算推进任务
    save.lastTick = Date.now();
    save.dayStartTime = Date.now();
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(save));

    render(
      <GameProvider>
        <ToastProvider>
          <ShelterTab />
        </ToastProvider>
      </GameProvider>
    );

    switchToFacility();

    // 生产中摘要：配方名（ticket 01 文案推导）+ 已产/目标 + 剩余时间（嵌套节点分片，宽松匹配）
    expect(screen.getByText('合成 合金金属板 ×1')).toBeDefined();
    expect(screen.getByText(/已产/)).toBeDefined();
    expect(screen.getByText(/\/ 3 批/)).toBeDefined();
    expect(screen.getByText(/当前批剩余 10s/)).toBeDefined();
    // 组装台仍为待机
    expect(screen.getAllByText('待机 · 空闲').length).toBe(1);
  });
});
