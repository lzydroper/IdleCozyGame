// @vitest-environment jsdom
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import CombatPlaybackView from './CombatPlaybackView';
import type { CombatSettlement } from '../types/game';

describe('CombatPlaybackView Component (ticket 21)', () => {
  const mockSettlement1: CombatSettlement = {
    battle: {
      victory: true,
      partyWiped: false,
      rounds: 2,
      actions: [
        { round: 1, actorSide: 'hero', actorId: 'nova', actorName: '诺娃', actorEmoji: '🗡️', targetName: '变异丧尸', damage: 15, kind: 'attack' }
      ]
    },
    drops: { scrap_metal: 3 },
    soulEchoes: 20,
    expPerHero: 50,
    woundedHeroIds: []
  };

  const mockSettlement2: CombatSettlement = {
    battle: {
      victory: true,
      partyWiped: false,
      rounds: 2,
      actions: [
        { round: 1, actorSide: 'hero', actorId: 'nova', actorName: '诺娃', actorEmoji: '🗡️', targetName: '变异恶犬', damage: 15, kind: 'attack' },
        { round: 1, actorSide: 'enemy', actorId: 'hound', actorName: '变异恶犬', actorEmoji: '🐕', targetName: '诺娃', damage: 5, kind: 'attack' },
        { round: 2, actorSide: 'hero', actorId: 'nova', actorName: '诺娃', actorEmoji: '🗡️', targetName: '变异恶犬', damage: 20, kind: 'skill', skillName: '星能重击' }
      ]
    },
    drops: { scrap_metal: 5 },
    soulEchoes: 30,
    expPerHero: 80,
    woundedHeroIds: []
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders zone title and action step-by-step when a new settlement occurs', () => {
    const { rerender } = render(<CombatPlaybackView settlement={mockSettlement1} zoneName="废土荒原" />);

    expect(screen.getByText(/废土荒原/)).toBeDefined();

    // 传入新战斗 settlement
    rerender(<CombatPlaybackView settlement={mockSettlement2} zoneName="废土荒原" />);

    expect(screen.getByText('1x')).toBeDefined();
    expect(screen.getByText('跳过')).toBeDefined();

    // 前进 800ms 触发第 1 个动作
    act(() => {
      vi.advanceTimersByTime(800);
    });

    expect(screen.getByText('变异恶犬')).toBeDefined();
  });

  it('cycles playback speed from 1x -> 2x -> 4x', () => {
    render(<CombatPlaybackView settlement={mockSettlement1} zoneName="废土荒原" />);

    const speedBtn = screen.getByTitle('切换播放倍速');
    expect(screen.getByText('1x')).toBeDefined();

    // 点击 1x -> 2x
    fireEvent.click(speedBtn);
    expect(screen.getByText('2x')).toBeDefined();

    // 点击 2x -> 4x
    fireEvent.click(speedBtn);
    expect(screen.getByText('4x')).toBeDefined();

    // 点击 4x -> 1x
    fireEvent.click(speedBtn);
    expect(screen.getByText('1x')).toBeDefined();
  });

  it('instantly resolves playback when clicking Skip button', () => {
    render(<CombatPlaybackView settlement={mockSettlement1} zoneName="废土荒原" />);

    const skipBtn = screen.getByText('跳过');
    fireEvent.click(skipBtn);

    // Skip 后直接显示所有动作与最终结算
    expect(screen.getByText('战斗胜利！')).toBeDefined();
    expect(screen.getByText(/✨ 战后恢复：全员 100% HP/)).toBeDefined();
    expect(screen.getByText(/灵魂残响 ×20/)).toBeDefined();
    expect(screen.getByText(/经验 ×50 \/ 英雄/)).toBeDefined();
  });
});
