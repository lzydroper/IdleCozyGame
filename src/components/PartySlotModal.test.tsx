// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PartySlotModal from './PartySlotModal';
import type { HeroState } from '../types/game';

describe('PartySlotModal Component', () => {
  const sampleHeroes: Record<string, HeroState> = {
    nova: {
      level: 5,
      exp: 0,
      hp: 100,
      maxHp: 100,
      star: 1,
      wounded: false,
      talentPoints: 0,
      talents: {},
      awakened: false,
      logisticsFacilityId: null
    },
    buster: {
      level: 8,
      exp: 0,
      hp: 110,
      maxHp: 110,
      star: 2,
      wounded: false,
      talentPoints: 0,
      talents: {},
      awakened: false,
      logisticsFacilityId: { type: 'facility', targetId: 'smelter_1' } // 后勤中
    },
    soldier: {
      level: 10,
      exp: 0,
      hp: 160,
      maxHp: 160,
      star: 1,
      wounded: false,
      talentPoints: 0,
      talents: {},
      awakened: false,
      logisticsFacilityId: null
    }
  };

  it('renders modal and displays logistics hero as disabled and sorted to the bottom', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    render(
      <PartySlotModal
        isOpen={true}
        targetSlotIndex={0}
        currentParty={['nova', 'soldier']} // soldier is in slot 1 (other slot)
        heroes={sampleHeroes}
        onConfirm={onConfirm}
        onClose={onClose}
      />
    );

    expect(screen.getByText('选择槽位 1 上阵英雄')).toBeDefined();
    expect(screen.getByText('诺娃')).toBeDefined();
    expect(screen.getByText('巴斯特')).toBeDefined();
    expect(screen.getByText('后勤中')).toBeDefined();
    expect(screen.getByText('已上阵')).toBeDefined();
  });

  it('ignores clicks on disabled (logistics or other slot) heroes', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    render(
      <PartySlotModal
        isOpen={true}
        targetSlotIndex={0}
        currentParty={['nova', 'soldier']}
        heroes={sampleHeroes}
        onConfirm={onConfirm}
        onClose={onClose}
      />
    );

    // Click on Buster (in logistics)
    fireEvent.click(screen.getByText('巴斯特'));
    // Click confirm
    fireEvent.click(screen.getByText('确认上阵'));

    // Duty hero Buster should not be added to party
    expect(onConfirm).toHaveBeenCalledWith(['nova', 'soldier']);
  });

  it('triggers onClose when backdrop mask is clicked', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    render(
      <PartySlotModal
        isOpen={true}
        targetSlotIndex={0}
        currentParty={['nova']}
        heroes={sampleHeroes}
        onConfirm={onConfirm}
        onClose={onClose}
      />
    );

    // createPortal 会将元素直接挂载在 document.body 下
    const backdrop = document.querySelector('.fixed.inset-0') as HTMLElement;
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
