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
            key: 'attackAfter',
            unitId: 'nova',
            sourceId: 'nova',
            targetId: 'e1',
            sourceName: '诺娃',
            targetName: '废土鬣狗',
            unitName: '诺娃',
            data: { kind: 'skill', skillName: '电涌过载', damage: 28 }
          },
          {
            seq: 1,
            round: 1,
            key: 'attackAfter',
            unitId: 'e1',
            sourceId: 'e1',
            targetId: 'nova',
            sourceName: '废土鬣狗',
            targetName: '诺娃',
            unitName: '废土鬣狗',
            data: { kind: 'attack', damage: 6 }
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
            data: { kind: 'heal', skillName: '净化之泉', amount: 76 }
          }
        ]
      },
      drops: {},
      soulEchoes: 0,
      expPerHero: 20,
      woundedHeroIds: []
    };

    render(<CombatEventLog settlement={settlement} zoneName="废土边缘 · 荒野哨所" />);

    const skillLine = screen.getByText(/发动【电涌过载】/);
    expect(skillLine.textContent).toContain('-28');
    expect(screen.getByText(/恢复 76 点生命/)).toBeDefined();
  });
});
