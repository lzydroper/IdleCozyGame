// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameProvider } from '../context/GameContext';
import { ToastProvider } from './ToastSystem';
import HeroHealModal from './HeroHealModal';
import { INITIAL_STATE, createInitialHero } from '../data/initialState';
import type { HeroState } from '../types/game';

describe('HeroHealModal Component (纳米修复剂治愈重伤, ticket 05)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('aether_garden_save_current_user', 'Guest');
  });

  const renderModal = (heroes: Record<string, HeroState>, naniteCount = 3, onClose = () => {}) => {
    const save = structuredClone(INITIAL_STATE) as typeof INITIAL_STATE;
    save.heroes = heroes;
    save.inventory = { ...save.inventory, nanite_injector: naniteCount };
    localStorage.setItem('aether_garden_save_Guest', JSON.stringify(save));
    render(
      <GameProvider>
        <ToastProvider>
          <HeroHealModal onClose={onClose} />
        </ToastProvider>
      </GameProvider>
    );
  };

  const woundedHero = (id: string): HeroState => ({
    ...createInitialHero(id),
    hp: 0,
    wounded: true
  });

  it('lists only wounded heroes', () => {
    renderModal({
      nova: woundedHero('nova'),
      buster: { ...createInitialHero('buster'), hp: 100, wounded: false }
    });

    expect(screen.getByText('诺娃')).toBeDefined();
    expect(screen.queryByText('巴斯特')).toBeNull(); // 健康英雄不列出
  });

  it('confirms with nothing selected are disabled', () => {
    renderModal({ nova: woundedHero('nova') });

    const confirm = screen.getByText(/确认治愈/).closest('button') as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
  });

  it('heals all selected heroes and consumes one injector each on confirm', () => {
    renderModal({
      nova: woundedHero('nova'),
      buster: woundedHero('buster')
    });

    // 勾选两位重伤英雄
    fireEvent.click(screen.getByText('诺娃'));
    fireEvent.click(screen.getByText('巴斯特'));

    const confirm = screen.getByText(/确认治愈/).closest('button') as HTMLButtonElement;
    expect(confirm.disabled).toBe(false);

    fireEvent.click(confirm);

    // 从 localStorage 读取更新后的状态：消耗 2 支、两位英雄治愈满血
    const savedState = JSON.parse(localStorage.getItem('aether_garden_save_Guest') || '{}');
    expect(savedState.inventory.nanite_injector).toBe(1);
    expect(savedState.heroes.nova.wounded).toBe(false);
    expect(savedState.heroes.nova.hp).toBe(savedState.heroes.nova.maxHp);
    expect(savedState.heroes.buster.wounded).toBe(false);
    expect(savedState.heroes.buster.hp).toBe(savedState.heroes.buster.maxHp);
  });
});
