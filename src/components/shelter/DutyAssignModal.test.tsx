// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DutyAssignModal from './DutyAssignModal';
import type { HeroState } from '../../types/game';

describe('DutyAssignModal Component', () => {
  const sampleHeroes: Record<string, HeroState> = {
    nova: {
      level: 5, exp: 0, hp: 100, maxHp: 100, star: 1, wounded: false,
      talentPoints: 0, talents: {}, awakened: false, logisticsFacilityId: null
    },
    mei: {
      level: 3, exp: 0, hp: 120, maxHp: 120, star: 1, wounded: false,
      talentPoints: 0, talents: {}, awakened: false, logisticsFacilityId: { type: 'facility', targetId: 'smelter_0' }
    },
    zero: {
      level: 2, exp: 0, hp: 110, maxHp: 110, star: 1, wounded: false,
      talentPoints: 0, talents: {}, awakened: false, logisticsFacilityId: null
    }
  };

  it('renders only assignable heroes (logisticsFacilityId null)', () => {
    render(
      <DutyAssignModal
        isOpen={true}
        title="指派驻守英雄"
        heroes={sampleHeroes}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );

    // 诺娃（可指派）和赛罗（可指派）可见
    expect(screen.getByText('诺娃')).toBeDefined();
    expect(screen.getByText('赛罗')).toBeDefined();
    // 阿梅（已驻守 smelter_0）不可见
    expect(screen.queryByText('阿梅')).toBeNull();
  });

  it('shows class/faction labels and dutyMeta badges', () => {
    render(
      <DutyAssignModal
        isOpen={true}
        title="指派驻守英雄"
        heroes={sampleHeroes}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );

    // 诺娃是 进攻者 · 机械（HEROES_CONFIG）
    expect(screen.getByText(/进攻者 · 机械/)).toBeDefined();
    // 诺娃和赛罗都有速度加成 -> 作用域化标签「全·速」至少一个
    expect(screen.getAllByText('全·速').length).toBeGreaterThanOrEqual(1);
  });

  it('calls onSelect when hero clicked', () => {
    const onSelect = vi.fn();
    render(
      <DutyAssignModal
        isOpen={true}
        title="指派驻守英雄"
        heroes={sampleHeroes}
        onSelect={onSelect}
        onClose={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('诺娃'));
    expect(onSelect).toHaveBeenCalledWith('nova');
  });

  it('shows empty state when no assignable heroes', () => {
    const allDutyHeroes: Record<string, HeroState> = {
      nova: { ...sampleHeroes.nova, logisticsFacilityId: { type: 'facility', targetId: 'smelter_0' } },
      mei: { ...sampleHeroes.mei, logisticsFacilityId: { type: 'waterer', targetId: 'greenhouse' } },
    };
    render(
      <DutyAssignModal
        isOpen={true}
        title="指派驻守英雄"
        heroes={allDutyHeroes}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText(/无可用英雄/)).toBeDefined();
  });

  it('hides heroes already in the party (已上阵不可指派驻守)', () => {
    render(
      <DutyAssignModal
        isOpen={true}
        title="指派驻守英雄"
        heroes={sampleHeroes}
        party={['nova']}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );

    // 诺娃已上阵 → 不可见；赛罗（未上阵未驻守）可见
    expect(screen.queryByText('诺娃')).toBeNull();
    expect(screen.getByText('赛罗')).toBeDefined();
  });

  it('returns null when closed', () => {
    render(
      <DutyAssignModal
        isOpen={false}
        title="指派驻守英雄"
        heroes={sampleHeroes}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.queryByText('指派驻守英雄')).toBeNull();
  });
});
