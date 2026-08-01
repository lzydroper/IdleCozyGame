import { describe, it, expect } from 'vitest';
import { HEROES_CONFIG } from './heroes';
import type { HeroState } from '../types/game';

describe('Facility Duty & Hero Meta Attributes', () => {
  it('defines unique duty meta attributes for each hero', () => {
    expect(HEROES_CONFIG.nova.dutyMeta?.facilitySpeedMultiplier).toBe(0.25);
    expect(HEROES_CONFIG.buster.dutyMeta?.facilityYieldMultiplier).toBe(0.20);
    expect(HEROES_CONFIG.soldier.dutyMeta?.facilityCostReduction).toBe(0.15);
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
      logisticsFacilityId: 'smelter_1'
    };

    expect(heroState.logisticsFacilityId).toBe('smelter_1');
  });
});
