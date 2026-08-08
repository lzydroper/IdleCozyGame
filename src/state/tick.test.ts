import { describe, it, expect } from 'vitest';
import { INITIAL_STATE } from '../data/initialState';
import { COMBAT_CONFIG } from '../data/combatConfig';
import { GAME_CONSTANTS } from '../data/gameConstants';
import { applyTick } from './tick';
import type { GameState, GreenhouseSlot } from '../types/game';

// 13 号 R3 + 04 号 04b：applyTick 短路 —— 无活跃系统 + 体力满/未跨整点 + 未跨天时返回原引用，
// 使 GameContext 每秒 tick 触发 React bailout，消除整树重渲染。体力每 3 秒恢复 1 点（staminaRegenSeconds），
// 仅在跨整点（floor 进位）时才需要推进。
describe('applyTick 短路（13 号 R3 + 04 号 04b）', () => {
  it('无活跃系统 + 体力满 + 未跨天 → 返回原引用（不重渲染）', () => {
    const state: GameState = {
      ...INITIAL_STATE,
      stamina: COMBAT_CONFIG.maxStamina,
      dayStartTime: Date.now(),
      lastTick: Date.now() - 1000
    };
    expect(applyTick(state, Date.now())).toBe(state);
  });

  it('体力未满但未跨整点 → 短路（返回原引用）；跨整点才恢复', () => {
    // elapsed 1s → 50.33，floor 未进位 → 返回原引用（不重渲染）
    const state: GameState = {
      ...INITIAL_STATE,
      stamina: 50,
      lastTick: Date.now() - 1000
    };
    expect(applyTick(state, Date.now())).toBe(state);

    // elapsed 3s → 50 + 1 = 51，floor 51 > 50 跨整点 → 恢复 1 点
    const state2: GameState = {
      ...INITIAL_STATE,
      stamina: 50,
      lastTick: Date.now() - 3000
    };
    const next = applyTick(state2, Date.now());
    expect(next).not.toBe(state2);
    expect(next.stamina).toBeGreaterThan(state2.stamina);
    expect(Math.floor(next.stamina)).toBeGreaterThan(Math.floor(state2.stamina));
  });

  it('跨天 → 推进天数，不短路', () => {
    const state: GameState = {
      ...INITIAL_STATE,
      stamina: COMBAT_CONFIG.maxStamina,
      dayStartTime: Date.now() - GAME_CONSTANTS.GAME_DAY_SECONDS * 1000
    };
    const next = applyTick(state, Date.now());
    expect(next).not.toBe(state);
    expect(next.player.days).toBeGreaterThan(state.player.days);
  });

  it('有活跃系统（温室作物）→ 正常推进，不短路', () => {
    const state: GameState = {
      ...INITIAL_STATE,
      stamina: COMBAT_CONFIG.maxStamina,
      greenhouse: {
        ...INITIAL_STATE.greenhouse,
        slots: INITIAL_STATE.greenhouse.slots.map((s, i) =>
          i === 0 ? { ...s, cropId: 'test_crop' } : s
        )
      },
      lastTick: Date.now() - 1000
    };
    const next = applyTick(state, Date.now());
    expect(next).not.toBe(state);
  });
});

// 06 浇水=维持生长：湿润作物按基础 1x 生长，未湿润作物停滞（不扣减）
describe('applyTick 温室生长（06 浇水=维持生长）', () => {
  const makeStateWithCrop = (slotOverrides: Partial<GreenhouseSlot>): GameState => ({
    ...INITIAL_STATE,
    stamina: COMBAT_CONFIG.maxStamina,
    greenhouse: {
      ...INITIAL_STATE.greenhouse,
      slots: INITIAL_STATE.greenhouse.slots.map((s, i) =>
        i === 0 ? { ...s, cropId: 'glow_grass', growthTimeLeft: 30, growthProgress: 0, ...slotOverrides } : s
      )
    },
    lastTick: Date.now() - 1000
  });

  it('未湿润作物停滞：growthTimeLeft 不扣减', () => {
    const next = applyTick(makeStateWithCrop({ isWatered: false }), Date.now());
    const slot = next.greenhouse.slots[0];
    expect(slot.growthTimeLeft).toBe(30);
    expect(slot.growthProgress).toBe(0);
  });

  it('湿润作物按基础 1x 扣减生长时间', () => {
    const next = applyTick(makeStateWithCrop({ isWatered: true }), Date.now());
    const slot = next.greenhouse.slots[0];
    expect(slot.growthTimeLeft).toBe(29);
    expect(slot.growthProgress).toBe(3); // (30-29)/30*100 ≈ 3.33 → round 3
  });
});

// 07 驻守自动化：自动收割成熟槽并补种原作物、速度加成加速生长
describe('applyTick 驻守自动化（07）', () => {
  it('驻守自动收割成熟作物并补种原作物（扣种子、产出入账）', () => {
    const state: GameState = {
      ...INITIAL_STATE,
      stamina: COMBAT_CONFIG.maxStamina,
      inventory: { seed_glow_grass: 3 },
      greenhouse: {
        ...INITIAL_STATE.greenhouse,
        slots: INITIAL_STATE.greenhouse.slots.map((s, i) =>
          i === 0 ? { ...s, cropId: 'glow_grass', growthTimeLeft: 0, growthProgress: 100, isWatered: true } : s
        )
      },
      shelter: { ...INITIAL_STATE.shelter, assignedWatererId: 'mei' }, // 无速度加成，专注收割补种
      lastTick: Date.now() - 1000
    };
    const next = applyTick(state, Date.now());
    const slot = next.greenhouse.slots[0];
    expect(slot.cropId).toBe('glow_grass'); // 补种原作物
    expect(slot.growthProgress).toBe(0);
    expect(next.inventory.seed_glow_grass).toBe(2); // 扣 1 种子
    expect(next.inventory.glow_fiber).toBe(2);      // 收割产出
    expect(next.inventory.mana_dust).toBe(1);
  });

  it('驻守速度加成：湿润作物 1 tick 扣 1.25 秒（nova +25%）', () => {
    const state: GameState = {
      ...INITIAL_STATE,
      stamina: COMBAT_CONFIG.maxStamina,
      greenhouse: {
        ...INITIAL_STATE.greenhouse,
        slots: INITIAL_STATE.greenhouse.slots.map((s, i) =>
          i === 0 ? { ...s, cropId: 'glow_grass', growthTimeLeft: 30, growthProgress: 0, isWatered: true } : s
        )
      },
      shelter: { ...INITIAL_STATE.shelter, assignedWatererId: 'nova' },
      lastTick: Date.now() - 1000
    };
    const next = applyTick(state, Date.now());
    const slot = next.greenhouse.slots[0];
    expect(slot.growthTimeLeft).toBe(28.75); // 30 - 1.25
  });

  it('作物级速度：以太浆果 1 tick 扣 1.15 秒（mei 浆果专精），荧光草扣 1 秒（09）', () => {
    const state: GameState = {
      ...INITIAL_STATE,
      stamina: COMBAT_CONFIG.maxStamina,
      greenhouse: {
        ...INITIAL_STATE.greenhouse,
        slots: INITIAL_STATE.greenhouse.slots.map((s, i) =>
          i === 0 ? { ...s, cropId: 'aether_berry', growthTimeLeft: 30, growthProgress: 0, isWatered: true } :
          i === 1 ? { ...s, cropId: 'glow_grass', growthTimeLeft: 30, growthProgress: 0, isWatered: true } : s
        )
      },
      shelter: { ...INITIAL_STATE.shelter, assignedWatererId: 'mei' },
      lastTick: Date.now() - 1000
    };
    const next = applyTick(state, Date.now());
    expect(next.greenhouse.slots[0].growthTimeLeft).toBeCloseTo(28.85, 5); // 30 - 1.15（浆果专精）
    expect(next.greenhouse.slots[1].growthTimeLeft).toBeCloseTo(29, 5);    // 30 - 1（普通作物）
  });
});

// 08 挂机：autoFarm 开启时按选定作物播种、种子耗光自动停止
describe('applyTick 挂机（08）', () => {
  const makeAutoFarmState = (autoFarm: { enabled: boolean; cropId: string | null }, inventory: Record<string, number>): GameState => ({
    ...INITIAL_STATE,
    stamina: COMBAT_CONFIG.maxStamina,
    inventory,
    greenhouse: {
      ...INITIAL_STATE.greenhouse,
      autoFarm,
      slots: INITIAL_STATE.greenhouse.slots.map((s, i) =>
        i === 0 ? { ...s, cropId: 'glow_grass', growthTimeLeft: 30, growthProgress: 0, isWatered: true } : s
      )
    },
    shelter: { ...INITIAL_STATE.shelter, assignedWatererId: 'nova' },
    lastTick: Date.now() - 1000
  });

  it('挂机开启：空槽播种选定作物（非原作物），种子耗光后自动停止', () => {
    const state = makeAutoFarmState(
      { enabled: true, cropId: 'aether_berry' },
      { seed_glow_grass: 2, seed_aether_berry: 3 }
    );
    const next = applyTick(state, Date.now());
    // 3 个空槽种上 aether_berry，扣 3 种子
    expect(next.greenhouse.slots.filter(s => s.cropId === 'aether_berry').length).toBe(3);
    expect(next.inventory.seed_aether_berry).toBe(0);
    // 种子种到最后一颗后耗光 → 自动停止
    expect(next.greenhouse.autoFarm.enabled).toBe(false);
  });

  it('挂机已选种但种子为 0 → 直接停止', () => {
    const state = makeAutoFarmState(
      { enabled: true, cropId: 'aether_berry' },
      { seed_glow_grass: 2, seed_aether_berry: 0 }
    );
    const next = applyTick(state, Date.now());
    expect(next.greenhouse.autoFarm.enabled).toBe(false);
    expect(next.greenhouse.autoFarm.cropId).toBe('aether_berry'); // 保留选种
  });
});

// 远征探索员加成（作用域化）：零 -20% 拾荒间隔（radar_station 300s → 240s）
describe('applyTick 远征探索员加成（作用域化）', () => {
  const makeExpeditionState = (explorerId: string | null, elapsedSec: number, now: number): GameState => {
    return {
      ...INITIAL_STATE,
      stamina: COMBAT_CONFIG.maxStamina,
      inventory: { ration: 5 },
      shelter: {
        ...INITIAL_STATE.shelter,
        assignedExplorerId: explorerId,
        expedition: {
          locationId: 'radar_station',
          startTime: now - elapsedSec * 1000,
          lastScavengeTime: now - elapsedSec * 1000
        }
      },
      lastTick: now - 1000
    };
  };

  it('零（-20% 拾荒间隔）：240 秒触发拾荒，无加成时不触发', () => {
    const now = Date.now();
    // 无加成：240s < 300s → 不触发，lastScavengeTime 保持
    const plain = applyTick(makeExpeditionState(null, 240, now), now);
    expect(plain.shelter.expedition.lastScavengeTime).toBe(now - 240 * 1000);
    // 零加成：300 × 0.8 = 240s → 触发一次拾荒，lastScavengeTime 推进一个间隔
    const boosted = applyTick(makeExpeditionState('zero', 240, now), now);
    expect(boosted.shelter.expedition.lastScavengeTime).toBe(now); // lastScavengeTime + 1×240s = now
  });
});
