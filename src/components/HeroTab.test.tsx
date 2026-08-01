// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameProvider } from '../context/GameContext';
import { ToastProvider } from './ToastSystem';
import HeroTab from './HeroTab';
import { INITIAL_STATE, createInitialHero } from '../data/initialState';

const HERO_SAVE_KEY = 'aether_garden_save_Guest';

describe('HeroTab Component', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('aether_garden_save_current_user', 'Guest');
  });

  it('renders the starter hero Nova with class, faction and level', () => {
    render(
      <GameProvider>
        <ToastProvider>
          <HeroTab />
        </ToastProvider>
      </GameProvider>
    );

    // 诺娃同时出现在上阵队伍槽位与英雄列表中
    expect(screen.getAllByText(/诺娃/).length).toBeGreaterThan(0);
    expect(screen.getByText(/进攻者/)).toBeDefined();
    expect(screen.getByText(/机械/)).toBeDefined();
    expect(screen.getByText(/Lv\.1/)).toBeDefined();
    expect(screen.getByText(/已解锁 1 位英雄/)).toBeDefined();
  });

  it('shows the default party slot with the starter hero and a 下阵 button', () => {
    render(
      <GameProvider>
        <ToastProvider>
          <HeroTab />
        </ToastProvider>
      </GameProvider>
    );

    expect(screen.getByText(/上阵队伍/)).toBeDefined();
    expect(screen.getByText(/⬇ 下阵/)).toBeDefined();
  });

  it('shows the active bond for the party in the 上阵队伍 section (羁绊生效可见)', () => {
    const save = JSON.parse(JSON.stringify(INITIAL_STATE)) as typeof INITIAL_STATE;
    save.heroes.roy = createInitialHero('roy');
    save.party = ['nova', 'roy'];
    localStorage.setItem(HERO_SAVE_KEY, JSON.stringify(save));

    render(
      <GameProvider>
        <ToastProvider>
          <HeroTab />
        </ToastProvider>
      </GameProvider>
    );

    // 机械搭档（诺娃 + 罗伊）：攻击 +10%
    expect(screen.getByText(/机械搭档/)).toBeDefined();
    expect(screen.getByText(/攻击 \+10%/)).toBeDefined();
  });

  it('hints that no bond is triggered for a non-matching party', () => {
    render(
      <GameProvider>
        <ToastProvider>
          <HeroTab />
        </ToastProvider>
      </GameProvider>
    );

    // 默认队伍仅诺娃 → 未触发任何羁绊
    expect(screen.getByText(/未触发羁绊/)).toBeDefined();
  });

  it('heals a wounded hero by consuming one nanite_injector', () => {
    // 预置：诺娃重伤 + 背包 1 支纳米修复剂
    const save = JSON.parse(JSON.stringify(INITIAL_STATE)) as typeof INITIAL_STATE;
    save.inventory.nanite_injector = 1;
    save.heroes.nova = { ...createInitialHero('nova'), hp: 0, wounded: true };
    localStorage.setItem(HERO_SAVE_KEY, JSON.stringify(save));

    render(
      <GameProvider>
        <ToastProvider>
          <HeroTab />
        </ToastProvider>
      </GameProvider>
    );

    const healButton = screen.getByText(/💉 治愈重伤/);
    expect(healButton).toBeDefined();
    fireEvent.click(healButton);

    const saved = JSON.parse(localStorage.getItem(HERO_SAVE_KEY) || '{}');
    expect(saved.inventory.nanite_injector).toBe(0);
    expect(saved.heroes.nova.wounded).toBe(false);
    expect(saved.heroes.nova.hp).toBe(saved.heroes.nova.maxHp);
  });

  it('disables the heal button without a nanite_injector', () => {
    const save = JSON.parse(JSON.stringify(INITIAL_STATE)) as typeof INITIAL_STATE;
    save.inventory.nanite_injector = 0;
    save.heroes.nova = { ...createInitialHero('nova'), hp: 0, wounded: true };
    localStorage.setItem(HERO_SAVE_KEY, JSON.stringify(save));

    render(
      <GameProvider>
        <ToastProvider>
          <HeroTab />
        </ToastProvider>
      </GameProvider>
    );

    const healButton = screen.getByText(/💉 治愈重伤/);
    expect(healButton.hasAttribute('disabled')).toBe(true);
  });
});
