// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { GameProvider, useGame } from '../context/GameContext';
import { ToastProvider } from './ToastSystem';
import SummonTab from './SummonTab';
import HeroTab from './HeroTab';
import { INITIAL_STATE } from '../data/initialState';

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <ToastProvider>
      <GameProvider>{ui}</GameProvider>
    </ToastProvider>
  );
};

describe('SummonTab Component (ticket 20)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('aether_garden_save_current_user', 'Guest');
  });

  it('renders the SummonTab view with pity progress and currency', () => {
    const testSave = {
      ...INITIAL_STATE,
      inventory: { ...INITIAL_STATE.inventory, soul_echo: 500 },
      summon: { pityCount: 25 }
    };
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(testSave));

    renderWithProviders(<SummonTab isOpen={true} onClose={() => {}} />);

    // 保底进度条 25/100
    expect(screen.getByText('25/100')).toBeDefined();
    expect(screen.getByText('100抽必出')).toBeDefined();

    // 灵魂残响 500
    expect(screen.getByText('500')).toBeDefined();

    // 招募按钮
    expect(screen.getByText('招募 1 次')).toBeDefined();
    expect(screen.getByText('招募 10 次')).toBeDefined();
  });

  it('opens and closes the rules modal when clicking the ? / Info button', () => {
    const testSave = {
      ...INITIAL_STATE,
      inventory: { ...INITIAL_STATE.inventory, soul_echo: 500 },
      summon: { pityCount: 0 }
    };
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(testSave));

    renderWithProviders(<SummonTab isOpen={true} onClose={() => {}} />);

    // 点击 Info 按钮
    const infoBtn = screen.getByTitle('招募概率与规则');
    fireEvent.click(infoBtn);

    expect(screen.getByText('招募规则与保底机制')).toBeDefined();
    expect(screen.getByText(/100 抽未拥有英雄硬保底/)).toBeDefined();

    // 点击“了解”关闭
    const closeBtn = screen.getByText('了解');
    fireEvent.click(closeBtn);

    expect(screen.queryByText('招募规则与保底机制')).toBeNull();
  });

  it('executes a 1x pull, deducts 100 soul echoes, and shows result modal', () => {
    const testSave = {
      ...INITIAL_STATE,
      inventory: { ...INITIAL_STATE.inventory, soul_echo: 300 },
      summon: { pityCount: 10 }
    };
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(testSave));

    renderWithProviders(<SummonTab isOpen={true} onClose={() => {}} />);

    const pullBtn = screen.getByText('招募 1 次');
    fireEvent.click(pullBtn);

    // 出现招募获得 Modal
    expect(screen.getByText('招募获得')).toBeDefined();

    // 点击收下
    const confirmBtn = screen.getByText('收下');
    fireEvent.click(confirmBtn);

    expect(screen.queryByText('招募获得')).toBeNull();
    // 灵魂残响剩余 200
    expect(screen.getByText('200')).toBeDefined();
  });

  it('executes a 10x pull, deducts 1000 soul echoes, and shows 10 results', () => {
    const testSave = {
      ...INITIAL_STATE,
      inventory: { ...INITIAL_STATE.inventory, soul_echo: 1500 },
      summon: { pityCount: 0 }
    };
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(testSave));

    renderWithProviders(<SummonTab isOpen={true} onClose={() => {}} />);

    const pull10Btn = screen.getByText('招募 10 次');
    fireEvent.click(pull10Btn);

    expect(screen.getByText('10 连招募获得')).toBeDefined();

    const confirmBtn = screen.getByText('收下');
    fireEvent.click(confirmBtn);

    // 灵魂残响剩余 500
    expect(screen.getByText('500')).toBeDefined();
  });

  it('opens SummonTab from HeroTab when clicking recruit button', () => {
    const testSave = {
      ...INITIAL_STATE,
      inventory: { ...INITIAL_STATE.inventory, soul_echo: 500 }
    };
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(testSave));

    const TestContainer = () => {
      const { isSummonOpen, closeSummonModal } = useGame();
      return (
        <div>
          <HeroTab />
          <SummonTab isOpen={isSummonOpen} onClose={closeSummonModal} />
        </div>
      );
    };

    renderWithProviders(<TestContainer />);

    // 点击 HeroTab 里的【招募】按钮
    const recruitBtn = screen.getByText('招募');
    fireEvent.click(recruitBtn);

    // SummonTab 全屏 Modal 打开
    expect(screen.getByText('100抽必出')).toBeDefined();
    expect(screen.getByText('英雄招募')).toBeDefined();
  });
});
