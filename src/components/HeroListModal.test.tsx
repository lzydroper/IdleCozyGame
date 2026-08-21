// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HeroListModal from './HeroListModal';
import { GameProvider } from '../context/GameContext';

describe('HeroListModal Component', () => {
  it('renders hero list modal with unlocked heroes without confirm/cancel buttons', () => {
    const heroes = {
      nova: { id: 'nova', level: 2, exp: 0, hp: 100, maxHp: 100, star: 1, wounded: false, talentPoints: 0, talents: {}, awakened: false, logisticsFacilityId: null },
      buster: { id: 'buster', level: 1, exp: 0, hp: 120, maxHp: 120, star: 1, wounded: false, talentPoints: 0, talents: {}, awakened: false, logisticsFacilityId: null }
    };

    const onSelectHero = vi.fn();
    const onClose = vi.fn();

    render(
      <GameProvider>
        <HeroListModal
          isOpen={true}
          heroes={heroes}
          onSelectHero={onSelectHero}
          onClose={onClose}
        />
      </GameProvider>
    );

    expect(screen.getByText('英雄列表（已解锁 2 位）')).toBeDefined();
    expect(screen.getByText('诺娃')).toBeDefined();
    expect(screen.getByText('巴斯特')).toBeDefined();
    expect(screen.queryByText('确认上阵')).toBeNull();
    expect(screen.queryByText('取消')).toBeNull();
  });

  it('triggers onSelectHero when clicking a hero card', () => {
    const heroes = {
      nova: { id: 'nova', level: 2, exp: 0, hp: 100, maxHp: 100, star: 1, wounded: false, talentPoints: 0, talents: {}, awakened: false, logisticsFacilityId: null }
    };

    const onSelectHero = vi.fn();
    const onClose = vi.fn();

    render(
      <GameProvider>
        <HeroListModal
          isOpen={true}
          heroes={heroes}
          onSelectHero={onSelectHero}
          onClose={onClose}
        />
      </GameProvider>
    );

    const heroCard = screen.getByText('诺娃');
    fireEvent.click(heroCard);
    expect(onSelectHero).toHaveBeenCalledWith('nova');
  });
});
