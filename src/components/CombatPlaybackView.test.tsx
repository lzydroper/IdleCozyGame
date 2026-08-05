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

  it('renders HP bars that deplete as actions step (ticket 21)', () => {
    const settlement: CombatSettlement = {
      battle: {
        victory: true,
        partyWiped: false,
        rounds: 2,
        actions: [
          { round: 1, actorSide: 'hero', actorId: 'nova', actorName: '诺娃', actorEmoji: '🗡️', targetName: '变异恶犬', damage: 20, kind: 'attack' }
        ],
        hpTrack: [
          [
            { id: 'nova', side: 'hero', name: '诺娃', emoji: '🗡️', hp: 100, maxHp: 100 },
            { id: 'hound', side: 'enemy', name: '变异恶犬', emoji: '🐕', hp: 50, maxHp: 50 }
          ],
          [
            { id: 'nova', side: 'hero', name: '诺娃', emoji: '🗡️', hp: 100, maxHp: 100 },
            { id: 'hound', side: 'enemy', name: '变异恶犬', emoji: '🐕', hp: 30, maxHp: 50 }
          ]
        ]
      },
      drops: {},
      soulEchoes: 0,
      expPerHero: 0,
      woundedHeroIds: []
    };

    render(<CombatPlaybackView settlement={settlement} zoneName="废土荒原" />);

    // 初始帧：敌人满血 50/50
    expect(screen.getByText('50/50')).toBeDefined();
    expect(screen.getByText('100/100')).toBeDefined();

    // 步进 1 个动作后：敌人 30/50
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(screen.getByText('30/50')).toBeDefined();
  });

  it('falls back to log-only playback when hpTrack is absent (old saves)', () => {
    const legacy: CombatSettlement = {
      ...mockSettlement1,
      battle: { ...mockSettlement1.battle, hpTrack: undefined }
    };
    const { container } = render(<CombatPlaybackView settlement={legacy} zoneName="废土荒原" />);

    // 无 hpTrack → 不渲染血条数值，纯日志播报仍可用
    expect(screen.queryByText('100/100')).toBeNull();
    expect(screen.getByText('跳过')).toBeDefined();
    expect(container.querySelectorAll('.font-mono').length).toBeGreaterThan(0);
  });

  it('renders statically without autoplay for historical settlements (autoPlay=false)', () => {
    render(<CombatPlaybackView settlement={mockSettlement2} zoneName="废土荒原" autoPlay={false} />);

    // 直接显示最终状态：全部动作可见、结算卡片立即可见
    expect(screen.getByText(/废土荒原/)).toBeDefined();
    expect(screen.getAllByText(/变异恶犬/).length).toBeGreaterThan(0);
    expect(screen.getByText('战斗胜利！')).toBeDefined();
    // 无播放控制按钮（不自动播放、不可跳过/重播）
    expect(screen.queryByText('跳过')).toBeNull();
    expect(screen.queryByText('重播')).toBeNull();
    // 不触发 onComplete
    const onComplete = vi.fn();
    render(<CombatPlaybackView settlement={mockSettlement1} zoneName="x" autoPlay={false} onComplete={onComplete} />);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('shows the exit button after playback and calls onExit when clicked (ticket 21 feedback 4)', () => {
    const onExit = vi.fn();
    render(
      <CombatPlaybackView
        settlement={mockSettlement1}
        zoneName="废土荒原"
        onComplete={() => {}}
        onExit={onExit}
        exitLabel="继续探索"
      />
    );

    // 播放中不显示离开按钮
    expect(screen.queryByText('继续探索')).toBeNull();

    // 点击跳过 → 播放完成，出现离开按钮
    fireEvent.click(screen.getByText('跳过'));
    expect(screen.getByText('继续探索')).toBeDefined();

    // 点击离开 → onExit 被调用；未播完前不会触发 onComplete
    fireEvent.click(screen.getByText('继续探索'));
    expect(onExit).toHaveBeenCalledTimes(1);
  });
});
