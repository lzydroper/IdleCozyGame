import { describe, it, expect } from 'vitest';
import type { GameState } from '../types/game';
import { INITIAL_STATE } from '../configs/seed/initialState';
import {
  advanceRegionProgress,
  completePendingMilestone,
  getPendingMilestone,
  getRegionProgress,
  getRegionProgressPercent,
  canTriggerPendingMilestone
} from './explorationProgress';

const fresh = (): GameState => JSON.parse(JSON.stringify(INITIAL_STATE)) as GameState;

describe('exploration region progress', () => {
  it('accumulates steps and derives percent', () => {
    const state = fresh();
    state.exploration.realityRegionId = 'wasteland_entrance';
    const s1 = advanceRegionProgress(state, 'wasteland_entrance');
    expect(getRegionProgress(s1, 'wasteland_entrance')).toBe(1);
    expect(getRegionProgressPercent(s1, 'wasteland_entrance')).toBe(10);
    const s2 = advanceRegionProgress(s1, 'wasteland_entrance');
    expect(getRegionProgressPercent(s2, 'wasteland_entrance')).toBe(20);
  });

  it('caps progress and registers a pending milestone when crossing 20%', () => {
    const state = fresh();
    state.exploration.realityRegionId = 'wasteland_entrance';
    // 累计到第 2 步（20% = 2/10）
    const s2 = advanceRegionProgress(advanceRegionProgress(state, 'wasteland_entrance'), 'wasteland_entrance');
    expect(getPendingMilestone(s2, 'wasteland_entrance')).toBe('encounter_wasteland_pack');
    // 存在待办时进度不再累加
    const s3 = advanceRegionProgress(s2, 'wasteland_entrance');
    expect(getRegionProgress(s3, 'wasteland_entrance')).toBe(2);
  });

  it('does not trigger before the current run reaches minRunSteps', () => {
    const state = fresh();
    state.exploration.realityRegionId = 'wasteland_entrance';
    state.exploration.realitySteps = 1;
    const s2 = advanceRegionProgress(advanceRegionProgress(state, 'wasteland_entrance'), 'wasteland_entrance');
    expect(getPendingMilestone(s2, 'wasteland_entrance')).toBe('encounter_wasteland_pack');
    expect(canTriggerPendingMilestone(s2, 'wasteland_entrance')).toBe(false);
    const ready = { ...s2, exploration: { ...s2.exploration, realitySteps: 7 } };
    expect(canTriggerPendingMilestone(ready, 'wasteland_entrance')).toBe(true);
  });

  it('completes a pending milestone and resumes progress', () => {
    const state = fresh();
    state.exploration.realityRegionId = 'wasteland_entrance';
    const s2 = advanceRegionProgress(advanceRegionProgress(state, 'wasteland_entrance'), 'wasteland_entrance');
    const cleared = completePendingMilestone(s2, 'wasteland_entrance');
    expect(getPendingMilestone(cleared, 'wasteland_entrance')).toBeNull();
    const s3 = advanceRegionProgress(cleared, 'wasteland_entrance');
    expect(getRegionProgress(s3, 'wasteland_entrance')).toBe(3);
  });
});
