// @vitest-environment jsdom
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { GameProvider } from '../context/GameContext';
import { ToastProvider } from './ToastSystem';
import HeroDossierModal from './HeroDossierModal';
import { INITIAL_STATE } from '../data/initialState';
import { HERO_CLASS_LORE, HERO_FACTION_LORE } from '../data/heroLore';

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <ToastProvider>
      <GameProvider>{ui}</GameProvider>
    </ToastProvider>
  );
};

describe('HeroDossierModal (英雄档案，10 号)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('aether_garden_save_current_user', 'Guest');
  });

  it('renders dossier with class/faction lore, backstory and duty meta', () => {
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(INITIAL_STATE));

    renderWithProviders(<HeroDossierModal isOpen={true} heroId="nova" onClose={() => {}} />);

    expect(screen.getByText('英雄档案')).toBeDefined();
    // 头部档案卡：名称 + 职阶/阵营标签
    expect(screen.getByText('诺娃')).toBeDefined();
    expect(screen.getByText('进攻者')).toBeDefined();
    expect(screen.getByText('机械')).toBeDefined();
    // 设定文案（数据配置展示）
    expect(screen.getByText(HERO_CLASS_LORE.attacker)).toBeDefined();
    expect(screen.getByText(HERO_FACTION_LORE.mechanical)).toBeDefined();
    // 背景故事
    expect(screen.getByText('前联合防卫军魔导机甲的备用驾驶员，擅长让魔导设施过载运转。')).toBeDefined();
    // 后台驻守特长：诺娃 = +25% 生产速度
    expect(screen.getByText('后台驻守特长')).toBeDefined();
    expect(screen.getByText(/生产速度 \+25%/)).toBeDefined();
  });

  it('closes when clicking the X button', () => {
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(INITIAL_STATE));
    let closed = false;

    renderWithProviders(
      <HeroDossierModal isOpen={true} heroId="nova" onClose={() => { closed = true; }} />
    );

    fireEvent.click(screen.getByTitle('关闭'));
    expect(closed).toBe(true);
  });

  it('returns null when closed or unknown hero', () => {
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(INITIAL_STATE));

    const { container } = renderWithProviders(
      <HeroDossierModal isOpen={false} heroId="nova" onClose={() => {}} />
    );
    expect(container.textContent).not.toContain('英雄档案');
    expect(container.querySelector('[title="关闭"]')).toBeNull();
  });
});
