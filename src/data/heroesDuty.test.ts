import { describe, it, expect } from 'vitest';
import { HEROES_CONFIG } from './heroes';
import type { HeroState } from '../types/game';

describe('Facility Duty & Hero Meta Attributes', () => {
  it('defines unique duty meta attributes for each hero', () => {
    // 作用域化加成：bonuses 数组中按 scope 匹配（全部英雄至少一条全局加成）
    const allScope = (b: { scope: { kind: string } }) => b.scope.kind === 'all';
    expect(HEROES_CONFIG.nova.dutyMeta?.bonuses.some(b => allScope(b) && b.speedMultiplier === 0.25)).toBe(true);
    expect(HEROES_CONFIG.buster.dutyMeta?.bonuses.some(b => allScope(b) && b.yieldMultiplier === 0.20)).toBe(true);
    expect(HEROES_CONFIG.soldier.dutyMeta?.bonuses.some(b => allScope(b) && b.costReduction === 0.15)).toBe(true);
  });

  it('supports scoped bonuses: 设备/作物/远征作用域', () => {
    // 罗伊：熔炉专精 +30% 速度
    expect(
      HEROES_CONFIG.roy.dutyMeta?.bonuses.some(b => b.scope.kind === 'facility' && b.scope.facilityType === 'smelter' && b.speedMultiplier === 0.30)
    ).toBe(true);
    // 阿梅：温室 +25% 产量 + 以太浆果专精 +10%
    expect(
      HEROES_CONFIG.mei.dutyMeta?.bonuses.some(b => b.scope.kind === 'greenhouse' && b.scope.cropId === undefined && b.yieldMultiplier === 0.25)
    ).toBe(true);
    expect(
      HEROES_CONFIG.mei.dutyMeta?.bonuses.some(b => b.scope.kind === 'greenhouse' && b.scope.cropId === 'aether_berry' && b.yieldMultiplier === 0.10)
    ).toBe(true);
    // 零：远征拾荒间隔 -20%
    expect(
      HEROES_CONFIG.zero.dutyMeta?.bonuses.some(b => b.scope.kind === 'expedition' && b.intervalReduction === 0.20)
    ).toBe(true);
  });

  it('supports hero state logistics facility assignment', () => {
    const heroState: HeroState = {
      level: 10,
      exp: 50,
      hp: 120,
      maxHp: 120,
      star: 2,
      wounded: false,
      talentPoints: 0,
      talents: {},
      awakened: false,
      logisticsFacilityId: { type: 'facility', targetId: 'smelter_1' }
    };

    expect(heroState.logisticsFacilityId?.type).toBe('facility');
    expect(heroState.logisticsFacilityId?.targetId).toBe('smelter_1');
  });
});
