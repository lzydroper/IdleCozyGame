import { describe, it, expect } from 'vitest';
import { INITIAL_STATE } from '../data/initialState';
import { CROPS_CONFIG } from '../data/crops';
import {
  resolveWatererBonuses,
  autoHarvestAndReplantUpdate,
  advanceGreenhouseAutomation,
  harvestSlotUpdate,
  batchHarvestUpdate,
  setAutoFarmCropUpdate,
  setAutoFarmEnabledUpdate,
  maybeStopAutoFarmOnSeedDepletion
} from './greenhouse';
import { resolveDutyBonuses } from './duty';
import type { GameState, GreenhouseSlot } from '../types/game';

const makeSlots = (slots: Partial<GreenhouseSlot>[]): GreenhouseSlot[] =>
  slots.map((s, i) => ({
    id: i + 1,
    cropId: null,
    growthProgress: 0,
    growthTimeLeft: 0,
    isWatered: false,
    ...s
  }));

const makeState = (overrides: {
  slots?: GreenhouseSlot[];
  assignedWatererId?: string | null;
  inventory?: Record<string, number>;
} = {}): GameState => ({
  ...INITIAL_STATE,
  inventory: overrides.inventory ?? { seed_glow_grass: 5 },
  greenhouse: {
    ...INITIAL_STATE.greenhouse,
    slots: overrides.slots ?? makeSlots([{ cropId: null }])
  },
  shelter: {
    ...INITIAL_STATE.shelter,
    assignedWatererId: overrides.assignedWatererId ?? null
  }
});

describe('resolveWatererBonuses（07 驻守加成反查，作用域化）', () => {
  it('从驻守英雄配置按温室作用域聚合加成', () => {
    expect(resolveWatererBonuses(makeState({ assignedWatererId: 'mei' })).yieldMultiplier).toBe(0.25);
    expect(resolveWatererBonuses(makeState({ assignedWatererId: 'nova' })).speedMultiplier).toBe(0.25);
    expect(resolveWatererBonuses(makeState({ assignedWatererId: null })).yieldMultiplier).toBe(0);
    // 产线专用加成（facility scope，如罗伊熔炉专精）不作用于温室，只吃到全局部分
    expect(resolveWatererBonuses(makeState({ assignedWatererId: 'roy' })).speedMultiplier).toBe(0.15);
  });

  it('作物级专精：限定作物的加成叠加生效（多作物数组 + 作物级 speed）', () => {
    // 阿梅：以太浆果专精（产量 +10% 且生长速度 +15%）叠加温室级（产量 +25%）
    const berry = resolveWatererBonuses(makeState({ assignedWatererId: 'mei' }), 'aether_berry');
    expect(berry.yieldMultiplier).toBe(0.35); // 0.25 + 0.10
    expect(berry.speedMultiplier).toBe(0.15); // 作物级 speed 仅浆果生效
    // 其他作物只吃到温室级产量加成，无作物级速度
    const grass = resolveWatererBonuses(makeState({ assignedWatererId: 'mei' }), 'glow_grass');
    expect(grass.yieldMultiplier).toBe(0.25);
    expect(grass.speedMultiplier).toBe(0);
  });

  it('多作物数组：cropIds 任一命中即生效；空数组 = 温室级', () => {
    const meta = {
      bonuses: [{ scope: { kind: 'greenhouse' as const, cropIds: ['aether_berry', 'glow_grass'] }, speedMultiplier: 0.10 }]
    };
    expect(resolveDutyBonuses(meta, { role: 'greenhouse', cropId: 'aether_berry' }).speedMultiplier).toBe(0.10);
    expect(resolveDutyBonuses(meta, { role: 'greenhouse', cropId: 'glow_grass' }).speedMultiplier).toBe(0.10);
    // 未命中作物 → 不生效
    expect(resolveDutyBonuses(meta, { role: 'greenhouse', cropId: 'sunflower' }).speedMultiplier).toBe(0);
    // 未指定作物上下文 → 限定加成不生效
    expect(resolveDutyBonuses(meta, { role: 'greenhouse' }).speedMultiplier).toBe(0);
    // 空 cropIds = 未限定 → 对所有作物生效
    const all = { bonuses: [{ scope: { kind: 'greenhouse' as const, cropIds: [] }, yieldMultiplier: 0.05 }] };
    expect(resolveDutyBonuses(all, { role: 'greenhouse', cropId: 'sunflower' }).yieldMultiplier).toBe(0.05);
  });

  it('作物级速度专精：离线推进时以太浆果生长快于普通作物（09）', () => {
    const state = makeState({
      assignedWatererId: 'mei',
      slots: makeSlots([
        { cropId: 'aether_berry', growthTimeLeft: 100, growthProgress: 0, isWatered: true },
        { cropId: 'glow_grass', growthTimeLeft: 100, growthProgress: 0, isWatered: true },
        { cropId: null }
      ])
    });
    const r = advanceGreenhouseAutomation(state, 10, 'original');
    const slots = r.state.greenhouse.slots;
    // 以太浆果 10 × 1.15 = 11.5 秒扣减；荧光草 10 × 1 = 10 秒
    expect(slots[0].growthTimeLeft).toBeCloseTo(88.5, 5);
    expect(slots[1].growthTimeLeft).toBeCloseTo(90, 5);
  });
});

describe('autoHarvestAndReplantUpdate（07 驻守自动收割播种）', () => {
  it('收割成熟槽并补种原作物（扣种子、种下未湿润）', () => {
    const state = makeState({
      slots: makeSlots([
        { cropId: 'glow_grass', growthProgress: 100, growthTimeLeft: 0, isWatered: true },
        { cropId: null }
      ]),
      assignedWatererId: 'nova',
      inventory: { seed_glow_grass: 5 }
    });
    const r = autoHarvestAndReplantUpdate(state, 'original');
    expect(r.result.harvested).toEqual({ glow_fiber: 2, mana_dust: 1 });
    expect(r.state.inventory.glow_fiber).toBe(2);
    expect(r.state.inventory.mana_dust).toBe(1);
    // 补种原作物 glow_grass，扣 1 种子
    expect(r.state.inventory.seed_glow_grass).toBe(4);
    const slot = r.state.greenhouse.slots[0];
    expect(slot.cropId).toBe('glow_grass');
    expect(slot.growthProgress).toBe(0);
    expect(slot.growthTimeLeft).toBe(CROPS_CONFIG.glow_grass.growthTime);
    expect(slot.isWatered).toBe(false); // 种下未湿润（06）
    // 从未种植的空槽不播种（'original' 只补收割槽）
    expect(r.state.greenhouse.slots[1].cropId).toBeNull();
  });

  it('种子不足时收割后留空', () => {
    const state = makeState({
      slots: makeSlots([{ cropId: 'glow_grass', growthProgress: 100, growthTimeLeft: 0, isWatered: true }]),
      assignedWatererId: 'nova',
      inventory: { seed_glow_grass: 0 }
    });
    const r = autoHarvestAndReplantUpdate(state, 'original');
    expect(r.result.harvested).toEqual({ glow_fiber: 2, mana_dust: 1 });
    expect(r.state.greenhouse.slots[0].cropId).toBeNull(); // 留空
  });

  it('驻守产量加成（floor(qty × (1+yieldMult))）作用于自动收割', () => {
    const state = makeState({
      slots: makeSlots([{ cropId: 'steel_sunflower', growthProgress: 100, growthTimeLeft: 0, isWatered: true }]),
      assignedWatererId: 'mei', // +25% 产量
      inventory: { seed_steel_sunflower: 5 }
    });
    const r = autoHarvestAndReplantUpdate(state, 'original');
    expect(r.result.harvested).toEqual({ steel_petal: 5, alloy_plate: 1 }); // 4×1.25=5, 1×1.25=1
  });
});

describe('手动/批量收割产量加成（07 驻守期间所有收割）', () => {
  it('手动收割享受驻守产量加成', () => {
    const state = makeState({
      slots: makeSlots([{ cropId: 'steel_sunflower', growthProgress: 100, growthTimeLeft: 0, isWatered: true }]),
      assignedWatererId: 'mei'
    });
    const r = harvestSlotUpdate(state, 1);
    expect(r.result).toEqual({ steel_petal: 5, alloy_plate: 1 });
  });

  it('批量收割享受驻守产量加成', () => {
    const state = makeState({
      slots: makeSlots([
        { cropId: 'steel_sunflower', growthProgress: 100, growthTimeLeft: 0, isWatered: true },
        { cropId: 'steel_sunflower', growthProgress: 100, growthTimeLeft: 0, isWatered: true }
      ]),
      assignedWatererId: 'mei'
    });
    const r = batchHarvestUpdate(state);
    expect(r.result).toEqual({ steel_petal: 10, alloy_plate: 2 });
  });

  it('无驻守时收割不加成', () => {
    const state = makeState({
      slots: makeSlots([{ cropId: 'steel_sunflower', growthProgress: 100, growthTimeLeft: 0, isWatered: true }])
    });
    const r = harvestSlotUpdate(state, 1);
    expect(r.result).toEqual({ steel_petal: 4, alloy_plate: 1 });
  });
});

describe('advanceGreenhouseAutomation（07 离线多轮自动收割播种）', () => {
  it('离线 125 秒、30 秒作物 → 自动收割 4 轮并补种（mei 无速度加成）', () => {
    const state = makeState({
      slots: makeSlots([{ cropId: 'glow_grass', growthProgress: 0, growthTimeLeft: 30, isWatered: false }]),
      assignedWatererId: 'mei', // 无 speed，yield 0.25（floor 后产量不变）
      inventory: { seed_glow_grass: 10 }
    });
    const r = advanceGreenhouseAutomation(state, 125, 'original');
    expect(r.result.harvested).toEqual({ glow_fiber: 8, mana_dust: 4 }); // 4 轮 × 2/1
    expect(r.state.inventory.seed_glow_grass).toBe(6); // 补种 4 次扣 4
    const slot = r.state.greenhouse.slots[0];
    expect(slot.cropId).toBe('glow_grass'); // 第 5 轮补种后仍在生长
    expect(slot.growthTimeLeft).toBe(25); // 30 - 5（剩余 5 秒 × 1x）
    expect(slot.growthProgress).toBe(17); // (30-25)/30*100 ≈ 16.67 → round 17
    expect(slot.isWatered).toBe(true); // 驻守自动浇水（维持生长）
  });

  it('驻守速度加成加速生长（nova +25% → 40 秒内成熟并补种推进 20 秒）', () => {
    const state = makeState({
      slots: makeSlots([{ cropId: 'glow_grass', growthProgress: 0, growthTimeLeft: 30, isWatered: true }]),
      assignedWatererId: 'nova', // +25% 速度
      inventory: { seed_glow_grass: 5 }
    });
    const r = advanceGreenhouseAutomation(state, 40, 'original');
    // 30/1.25=24 秒成熟 → 收割补种 → 剩余 16 秒 × 1.25 = 20 秒生长
    expect(r.result.harvested).toEqual({ glow_fiber: 2, mana_dust: 1 });
    const slot = r.state.greenhouse.slots[0];
    expect(slot.cropId).toBe('glow_grass');
    expect(slot.growthTimeLeft).toBe(10); // 30 - 20
    expect(slot.isWatered).toBe(true);
  });

  it('无作物时不产生收割', () => {
    const state = makeState({
      slots: makeSlots([{ cropId: null }]),
      assignedWatererId: 'nova'
    });
    const r = advanceGreenhouseAutomation(state, 60, 'original');
    expect(r.result.harvested).toBeNull();
  });

  it('离线开始时已成熟的作物先被收割（code-review should-fix）', () => {
    const state = makeState({
      slots: makeSlots([{ cropId: 'glow_grass', growthProgress: 100, growthTimeLeft: 0, isWatered: true }]),
      assignedWatererId: 'mei', // 无速度加成，专注收割轮次
      inventory: { seed_glow_grass: 5 }
    });
    const r = advanceGreenhouseAutomation(state, 60, 'original');
    // 初始成熟 1 轮 + 补种后 30 秒/轮 × 2 轮 = 3 轮 × (2/1)
    expect(r.result.harvested).toEqual({ glow_fiber: 6, mana_dust: 3 });
    expect(r.state.inventory.seed_glow_grass).toBe(2); // 5 - 3
    const slot = r.state.greenhouse.slots[0];
    expect(slot.cropId).toBe('glow_grass'); // 最后一轮补种后仍在
  });
});

describe('挂机区域 actions（08）', () => {
  it('setAutoFarmCrop 选种/清除（无前置，随时可存）', () => {
    const s = makeState();
    const r1 = setAutoFarmCropUpdate(s, 'glow_grass');
    expect(r1.result).toBe(true);
    expect(r1.state.greenhouse.autoFarm.cropId).toBe('glow_grass');
    const r2 = setAutoFarmCropUpdate(r1.state, null);
    expect(r2.state.greenhouse.autoFarm.cropId).toBeNull();
  });

  it('setAutoFarmEnabled 开启必须驻守、关闭无前置', () => {
    const noGarrison = makeState({ assignedWatererId: null });
    expect(setAutoFarmEnabledUpdate(noGarrison, true).result).toBe(false);

    const withGarrison = makeState({ assignedWatererId: 'nova' });
    const r = setAutoFarmEnabledUpdate(withGarrison, true);
    expect(r.result).toBe(true);
    expect(r.state.greenhouse.autoFarm.enabled).toBe(true);

    const r2 = setAutoFarmEnabledUpdate(r.state, false);
    expect(r2.state.greenhouse.autoFarm.enabled).toBe(false);
  });

  it('maybeStopAutoFarmOnSeedDepletion：种子耗光停止、保留 cropId', () => {
    const state = makeState({ inventory: { seed_glow_grass: 0 } });
    const s = {
      ...state,
      greenhouse: { ...state.greenhouse, autoFarm: { enabled: true, cropId: 'glow_grass' } }
    };
    const r = maybeStopAutoFarmOnSeedDepletion(s);
    expect(r.greenhouse.autoFarm.enabled).toBe(false);
    expect(r.greenhouse.autoFarm.cropId).toBe('glow_grass');
  });

  it('种子充足时不停止', () => {
    const state = makeState({ inventory: { seed_glow_grass: 3 } });
    const s = {
      ...state,
      greenhouse: { ...state.greenhouse, autoFarm: { enabled: true, cropId: 'glow_grass' } }
    };
    expect(maybeStopAutoFarmOnSeedDepletion(s).greenhouse.autoFarm.enabled).toBe(true);
  });

  it('挂机策略 { cropId }：收割成熟槽并把空槽种上选定作物（08）', () => {
    const state = makeState({
      slots: makeSlots([
        { cropId: 'glow_grass', growthProgress: 0, growthTimeLeft: 30, isWatered: true },
        { cropId: null }
      ]),
      assignedWatererId: 'mei',
      inventory: { seed_glow_grass: 5, seed_aether_berry: 5 }
    });
    const r = advanceGreenhouseAutomation(state, 60, { cropId: 'aether_berry' });
    // 60 秒：glow_grass 30s 成熟收割 1 轮（第 2 轮 30 秒被 aether_berry 占据，120s 未成熟）
    expect(r.result.harvested).toEqual({ glow_fiber: 2, mana_dust: 1 });
    const planted = r.state.greenhouse.slots.filter(s => s.cropId === 'aether_berry');
    expect(planted.length).toBe(2); // 收割后槽 + 原空槽都种 aether_berry
    expect(r.state.inventory.seed_aether_berry).toBe(3); // 扣 2
  });
});
