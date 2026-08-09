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
    // 初始 Lv1 效率 = 100%（bugfix：非 110%）
    expect(screen.getAllByText('100%').length).toBe(2);
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

describe('生产/取消弹窗（issue 08 变体 B）', () => {
  // 渲染带指定存档的产线 tab 并切到产线
  const renderFacilityTab = (save: GameState) => {
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
    fireEvent.click(screen.getByText('产线'));
  };

  it('待机态点「生产」打开生产弹窗：配方下拉 + 滑条上限（材料上限）+ 开始按钮', () => {
    const save = structuredClone(INITIAL_STATE) as GameState;
    renderFacilityTab(save);

    // 点冶炼炉 0 号台的「生产」按钮
    fireEvent.click(screen.getByTestId('start-task-btn-smelter-0'));
    expect(screen.getByTestId('start-task-container')).toBeDefined();

    // 配方下拉（combobox）
    expect(screen.getByRole('combobox')).toBeDefined();
    // 每批耗时与预计总耗时（bugfix：选生产时显示预期时间）
    expect(screen.getByText(/每批耗时/)).toBeDefined();
    expect(screen.getByText(/预计总耗时/)).toBeDefined();
    // 滑条上限 = floor(材料 / 每批折扣成本) = 10 废铁 / 2 = 5 批
    const slider = screen.getByTestId('start-task-slider') as HTMLInputElement;
    expect(slider.max).toBe('5');
    expect(slider.disabled).toBe(false);
    expect(screen.getByText('开始生产（扣除全部材料）')).toBeDefined();
  });

  it('材料不足时滑条禁用、开始按钮禁用并提示', () => {
    const save = structuredClone(INITIAL_STATE) as GameState;
    save.inventory = { ...save.inventory, scrap_metal: 1 }; // smelt_alloy 每批需 2
    renderFacilityTab(save);

    fireEvent.click(screen.getByTestId('start-task-btn-smelter-0'));
    const slider = screen.getByTestId('start-task-slider') as HTMLInputElement;
    expect(slider.disabled).toBe(true);
    expect((screen.getByTestId('start-task-button') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('材料不足，无法开始生产')).toBeDefined();
  });

  it('滑条定批次 → 消耗/产出 ×N 预览 → 开始生产扣全部材料并进入生产中', () => {
    const save = structuredClone(INITIAL_STATE) as GameState;
    save.inventory = { ...save.inventory, scrap_metal: 10 };
    renderFacilityTab(save);

    fireEvent.click(screen.getByTestId('start-task-btn-smelter-0'));
    // 滑到 3 批：消耗废旧金属 ×6（2×3），产出合金金属板 ×3（1×3）
    fireEvent.change(screen.getByTestId('start-task-slider'), { target: { value: '3' } });
    expect(screen.getByText('废旧金属 ×6')).toBeDefined();
    expect(screen.getByText('合金金属板 ×3')).toBeDefined();

    // 开始生产：弹窗关闭，卡片进入生产中（已产 0 / 3 批）
    fireEvent.click(screen.getByTestId('start-task-button'));
    expect(screen.queryByTestId('start-task-container')).toBeNull();
    expect(screen.getByText(/已产/)).toBeDefined();
    expect(screen.getByText(/\/ 3 批/)).toBeDefined();
    expect(screen.getByText('取消任务')).toBeDefined();
  });

  it('生产中点「取消任务」打开确认弹窗：退款预览 + 确认取消回待机', () => {
    const save = structuredClone(INITIAL_STATE) as GameState;
    save.shelter.facilities.smelter[0] = {
      id: 'smelter',
      name: '魔导冶炼炉',
      level: 2,
      recipeId: 'smelt_alloy',
      targetCount: 3,
      completedCount: 1,
      timeLeft: 10,
      currentProgress: 60
    };
    renderFacilityTab(save);

    fireEvent.click(screen.getByTestId('cancel-task-btn-smelter-0'));
    expect(screen.getByTestId('cancel-task-container')).toBeDefined();
    // 退款预览：已产 1 批保留，剩 2 批 × 每批 2 废铁 = 废旧金属 ×4
    expect(screen.getByText(/已产出的 1 批将保留/)).toBeDefined();
    expect(screen.getByText('废旧金属 ×4')).toBeDefined();

    fireEvent.click(screen.getByTestId('cancel-task-confirm'));
    expect(screen.queryByTestId('cancel-task-container')).toBeNull();
    // 卡片回到待机
    expect(screen.getAllByText('待机 · 空闲').length).toBe(2);
    // 生产中态消失（无取消任务按钮）
    expect(screen.queryByText('取消任务')).toBeNull();
  });
});
