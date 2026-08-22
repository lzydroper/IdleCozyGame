// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CombatEventLog from './CombatEventLog';
import type { CombatSettlement } from '../types/game';

describe('CombatEventLog Component', () => {
  it('renders a draw settlement as 平局 rather than defeat (三态结算展示)', () => {
    const settlement: CombatSettlement = {
      battle: {
        outcome: 'draw',
        victory: false,
        partyWiped: false,
        rounds: 60,
        events: []
      },
      drops: {},
      soulEchoes: 0,
      expPerHero: 0,
      woundedHeroIds: []
    };

    render(<CombatEventLog settlement={settlement} zoneName="废土边缘 · 荒野哨所" />);

    expect(screen.getByText(/战斗平局/)).toBeDefined();
    expect(screen.queryByText(/战斗失败/)).toBeNull();
    expect(screen.getByText(/达到轮次上限/)).toBeDefined();
  });

  it('renders battle events in the combat event log (skill/attack/heal)', () => {
    const settlement: CombatSettlement = {
      battle: {
        outcome: 'victory',
        victory: true,
        partyWiped: false,
        rounds: 2,
        events: [
          {
            seq: 0,
            round: 1,
            key: 'abilityUsed',
            unitId: 'nova',
            sourceId: 'nova',
            targetId: 'e1',
            sourceName: '诺娃',
            targetName: '废土鬣狗',
            unitName: '诺娃',
            data: { abilityId: 'awaken_nova' }
          },
          {
            seq: 1,
            round: 1,
            key: 'damageTaken',
            unitId: 'e1',
            sourceId: 'nova',
            targetId: 'e1',
            sourceName: '诺娃',
            targetName: '废土鬣狗',
            unitName: '废土鬣狗',
            data: { amount: 28 }
          },
          {
            seq: 2,
            round: 2,
            key: 'healingTaken',
            unitId: 'nova',
            sourceId: 'nova',
            targetId: 'nova',
            sourceName: '诺娃',
            targetName: '诺娃',
            unitName: '诺娃',
            data: { amount: 76 }
          }
        ]
      },
      drops: {},
      soulEchoes: 0,
      expPerHero: 20,
      woundedHeroIds: []
    };

    render(<CombatEventLog settlement={settlement} zoneName="废土边缘 · 荒野哨所" />);

    expect(screen.getByText(/使用【电涌过载】/)).toBeDefined();
    expect(screen.getByText(/受到 28 点伤害/)).toBeDefined();
    expect(screen.getByText(/恢复 76 点生命/)).toBeDefined();
  });
});
