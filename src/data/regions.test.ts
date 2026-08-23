import { describe, it, expect } from 'vitest';
import { REGION_CONFIGS } from './regions';
import type { DropEntry, RegionConfig } from './regions';
import { ENEMY_CONFIGS } from './enemies';
import { REALITY_EVENTS } from './realityEvents';
import { EXPLORATION_CONFIG } from '../configs/constants/explorationConfig';
import {
  getMainlineRegions,
  getRegion,
  getRegionLevels,
  getLevel,
  findRegionByLevelId
} from './regionSelectors';

const allRegions: RegionConfig[] = Object.values(REGION_CONFIGS);

describe('Region/Level data registry', () => {
  it('contains 3 mainline regions and 1 test region', () => {
    expect(allRegions).toHaveLength(4);
    expect(getMainlineRegions().map((r) => r.id)).toEqual([
      'wasteland_entrance',
      'old_town_ruins',
      'radiated_workshop'
    ]);
    const testRegion = getRegion('equipment_test_zone');
    expect(testRegion?.isTestZone).toBe(true);
    expect(getMainlineRegions().some((r) => r.id === 'equipment_test_zone')).toBe(false);
  });

  it('orders mainline regions by explicit order, not recommendedLevel', () => {
    const orders = getMainlineRegions().map((r) => r.order);
    expect(orders).toEqual([1, 2, 3]);
    expect(getMainlineRegions().map((r) => r.recommendedLevel)).toEqual([1, 3, 6]);
  });

  it('gives every mainline region two ordered levels and puts a boss enemy in the last level', () => {
    for (const region of getMainlineRegions()) {
      expect(region.levels).toHaveLength(2);
      const lastLevel = region.levels[region.levels.length - 1];
      expect(lastLevel.enemies.some((enemyId) => ENEMY_CONFIGS[enemyId]?.role === 'boss')).toBe(true);
    }
  });

  it('keeps level local ids unique within each region and across the whole registry', () => {
    const seen = new Set<string>();
    for (const region of allRegions) {
      const localIds = region.levels.map((level) => level.id);
      expect(new Set(localIds).size).toBe(localIds.length);
      localIds.forEach((id) => {
        expect(seen.has(id)).toBe(false);
        seen.add(id);
      });
    }
  });

  it('keeps every level enemy list inside the region enemy pool', () => {
    for (const region of allRegions) {
      const pool = new Set(region.enemyPool);
      for (const level of region.levels) {
        for (const enemyId of level.enemies) {
          expect(pool.has(enemyId)).toBe(true);
        }
      }
    }
  });

  it('references only known enemy ids', () => {
    for (const region of allRegions) {
      for (const enemyId of region.enemyPool) {
        expect(ENEMY_CONFIGS[enemyId]).toBeDefined();
      }
      for (const level of region.levels) {
        for (const enemyId of level.enemies) {
          expect(ENEMY_CONFIGS[enemyId]).toBeDefined();
        }
      }
    }
  });

  it('references only known event ids in exploration pools', () => {
    for (const region of allRegions) {
      for (const eventId of region.explorationEvents) {
        expect(REALITY_EVENTS[eventId]).toBeDefined();
      }
    }
  });

  it('uses valid DropEntry shapes with integer percent and positive counts', () => {
    for (const region of allRegions) {
      for (const level of region.levels) {
        [...level.drops, ...(level.firstClearDrops ?? [])].forEach((drop) => {
          assertDropEntry(drop);
        });
      }
    }
  });

  it('keeps the blueprint as a first-clear reward on the old-town boss level', () => {
    const boss = getLevel('old_town_ruins', 'old_town_ruins_2');
    expect(boss?.firstClearDrops).toEqual([
      { kind: 'fixed', itemId: 'blueprint_ember_armory', count: 1 }
    ]);
    expect(boss?.drops.some((d) => d.kind !== 'weighted' && d.itemId === 'blueprint_ember_armory')).toBe(false);
  });

  it('exposes the global minRunSteps constant for milestones', () => {
    expect(EXPLORATION_CONFIG.minRunSteps).toBe(7);
  });
});

describe('Region/Level selectors', () => {
  it('returns ordered levels for a region', () => {
    expect(getRegionLevels('wasteland_entrance').map((l) => l.id)).toEqual([
      'wasteland_entrance_1',
      'wasteland_entrance_2'
    ]);
  });

  it('finds a level by regionId + local id', () => {
    expect(getLevel('radiated_workshop', 'radiated_workshop_2')?.name).toBe('车间之主'); // 纯关卡名（U#3 方案 A）
    expect(getLevel('radiated_workshop', 'missing')).toBeUndefined();
  });

  it('finds the region that contains a level id', () => {
    expect(findRegionByLevelId('old_town_ruins_1')?.id).toBe('old_town_ruins');
    expect(findRegionByLevelId('missing')).toBeUndefined();
  });
});

function assertDropEntry(drop: DropEntry): void {
  if (drop.kind === 'fixed') {
    expect(Number.isInteger(drop.count)).toBe(true);
    expect(drop.count).toBeGreaterThan(0);
  } else if (drop.kind === 'chance') {
    expect(Number.isInteger(drop.chancePercent)).toBe(true);
    expect(drop.chancePercent).toBeGreaterThanOrEqual(0);
    expect(drop.chancePercent).toBeLessThanOrEqual(100);
    expect(Number.isInteger(drop.count)).toBe(true);
    expect(drop.count).toBeGreaterThan(0);
  } else {
    expect(drop.pool.length).toBeGreaterThan(0);
    drop.pool.forEach((entry) => {
      expect(Number.isInteger(entry.weight)).toBe(true);
      expect(entry.weight).toBeGreaterThan(0);
      expect(Number.isInteger(entry.count)).toBe(true);
      expect(entry.count).toBeGreaterThan(0);
    });
  }
}
