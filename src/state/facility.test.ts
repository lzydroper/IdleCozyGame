import { describe, it, expect } from 'vitest';
import type { GameState } from '../types/game';
import { INITIAL_STATE } from '../data/initialState';
import {
  startTaskUpdate,
  cancelTaskUpdate,
  expandFacilityUpdate,
  upgradeShelterStatUpdate,
  resolveShelterUpgrades,
  getShelterUpgradeLevel,
  getShelterUpgradeKey,
  processFacility,
  getActualDuration,
  getMaxAffordableBatches,
  resolveDutyBonus
} from './facility';
import { calculateDetailedOfflineProgress } from './offline';
import { EMPTY_DUTY_BONUS } from './duty';
import { mergeSavedState } from './persistence';
import { FACILITIES_CONFIG, isFacilityType } from '../data/facilities';
import { SHELTER_UPGRADES } from '../data/shelterUpgrades';

// 以初始存档为基底构造测试状态
const baseState = (): GameState => structuredClone(INITIAL_STATE);

const smelter = (state: GameState) => state.shelter.facilities.smelter[0];

// 在冶炼炉 0 号台上开始任务（默认 smelt_alloy × 2，可选补材料）
const startSmelterTask = (state: GameState, recipeId = 'smelt_alloy', target = 2, inventory?: Record<string, number>) => {
  if (inventory) state.inventory = { ...state.inventory, ...inventory };
  return startTaskUpdate(state, 'smelter', 0, recipeId, target);
};

describe('单任务批量生产（issue 06）', () => {
  describe('开始任务', () => {
    it('开始任务扣全部材料（按每批折扣成本）并置任务字段，当前批从首批耗时开始计时', () => {
      let state = baseState();
      state.inventory.scrap_metal = 10; // smelt_alloy 每批 2 个，×2 批 = 4
      const r = startSmelterTask(state, 'smelt_alloy', 2);

      expect(r.result).toBe(true);
      expect(r.state.inventory.scrap_metal).toBe(10 - 4);
      const fac = smelter(r.state);
      expect(fac.recipeId).toBe('smelt_alloy');
      expect(fac.targetCount).toBe(2);
      expect(fac.completedCount).toBe(0);
      expect(fac.timeLeft).toBe(getActualDuration('smelt_alloy', 1)); // 27s
      expect(fac.currentProgress).toBe(0);
    });

    it('材料不足拒绝且不扣料、不置任务', () => {
      let state = baseState();
      state.inventory.scrap_metal = 3; // 需要 4
      const r = startSmelterTask(state, 'smelt_alloy', 2);
      expect(r.result).toBe(false);
      expect(r.state.inventory.scrap_metal).toBe(3);
      expect(smelter(r.state).recipeId).toBeNull();
    });

    it('已在生产中拒绝开始新任务（单任务互斥），原任务不受影响', () => {
      let state = baseState();
      state = startSmelterTask(state, 'smelt_alloy', 2, { scrap_metal: 10 }).state;
      const r = startSmelterTask(state, 'smelt_alloy', 1);
      expect(r.result).toBe(false);
      expect(smelter(r.state).recipeId).toBe('smelt_alloy');
      expect(r.state.inventory.scrap_metal).toBe(10 - 4);
    });

    it('拒绝未知配方 / 配方不属于该设备 / 台索引无效', () => {
      let state = baseState();
      state.inventory.scrap_metal = 100;
      expect(startSmelterTask(state, 'nope', 1).result).toBe(false);
      expect(startSmelterTask(state, 'assemble_ration', 1).result).toBe(false); // assembler 配方
      expect(startTaskUpdate(state, 'smelter', 9, 'smelt_alloy', 1).result).toBe(false);
    });

    it('拒绝非法批次（0 / 负数 / 非有限数）且不扣料', () => {
      let state = baseState();
      state.inventory.scrap_metal = 100;
      expect(startSmelterTask(state, 'smelt_alloy', 0).result).toBe(false);
      expect(startSmelterTask(state, 'smelt_alloy', -3).result).toBe(false);
      expect(startSmelterTask(state, 'smelt_alloy', NaN).result).toBe(false);
      expect(state.inventory.scrap_metal).toBe(100);
    });
  });
  describe('任务推进（processFacility）', () => {
    it('每批完成后 completedCount + 1 并产出入账；达到目标批数自动回待机', () => {
      let state = baseState();
      state.inventory.scrap_metal = 100;
      state = startSmelterTask(state, 'smelt_alloy', 2).state;

      const r1 = processFacility(smelter(state), state.inventory, 30);
      expect(r1.facility.completedCount).toBe(1);
      expect(r1.facility.recipeId).toBe('smelt_alloy');
      expect(r1.facility.timeLeft).toBe(30); // 第二批开始（Lv1 每批 30s）
      expect(r1.produced.alloy_plate).toBe(1);
      expect(state.inventory.alloy_plate).toBe(1);

      const r2 = processFacility(r1.facility, state.inventory, 30);
      expect(r2.facility.recipeId).toBeNull(); // 达目标回待机
      expect(r2.facility.targetCount).toBe(0);
      expect(r2.facility.completedCount).toBe(0);
      expect(r2.facility.timeLeft).toBe(0);
      expect(state.inventory.alloy_plate).toBe(2);
    });

    it('时间不足保留当前批 timeLeft 进度，下次继续', () => {
      let state = baseState();
      state.inventory.scrap_metal = 100;
      state = startSmelterTask(state, 'smelt_alloy', 2).state;

      const r1 = processFacility(smelter(state), state.inventory, 10);
      expect(r1.facility.completedCount).toBe(0);
      expect(r1.facility.timeLeft).toBe(20); // 30 - 10
      expect(r1.facility.currentProgress).toBe(Math.round((10 / 30) * 100));
      expect(state.inventory.alloy_plate).toBeUndefined();

      const r2 = processFacility(r1.facility, state.inventory, 20);
      expect(r2.facility.completedCount).toBe(1);
      expect(state.inventory.alloy_plate).toBe(1);
    });

    it('待机（recipeId 为 null）推进无操作', () => {
      let state = baseState();
      const r = processFacility(smelter(state), state.inventory, 100);
      expect(r.facility).toBe(smelter(state)); // 原引用返回
      expect(r.produced).toEqual({});
      expect(state.inventory.scrap_metal).toBe(10);
    });

    it('seconds <= 0 时返回原状', () => {
      let state = baseState();
      state = startSmelterTask(state, 'smelt_alloy', 2, { scrap_metal: 100 }).state;
      const r = processFacility(smelter(state), state.inventory, 0);
      expect(r.facility.completedCount).toBe(0);
      expect(r.facility.timeLeft).toBe(getActualDuration('smelt_alloy', 1));
    });

    it('防御：配置中已删除的配方任务作废回待机（不产出、不崩溃）', () => {
      let state = baseState();
      const ghost = { ...smelter(state), recipeId: 'ghost_recipe', targetCount: 2, completedCount: 0, timeLeft: 5 };
      const r = processFacility(ghost, state.inventory, 10);
      expect(r.facility.recipeId).toBeNull();
      expect(r.facility.timeLeft).toBe(0);
      expect(state.inventory.alloy_plate).toBeUndefined();
    });

    it('速度加成缩短每批耗时（沿用 getActualDuration）', () => {
      let state = baseState();
      state.inventory.scrap_metal = 100;
      state = startSmelterTask(state, 'smelt_alloy', 2).state;
      // +25% 速度：Lv1 每批 30 / (1.0 × 1.25) = 24s；首批 30s 完成后第二批 timeLeft=24
      const dutyResolved = { ...EMPTY_DUTY_BONUS, speedMultiplier: 0.25 };
      const r = processFacility(smelter(state), state.inventory, 30, dutyResolved);
      expect(r.facility.completedCount).toBe(1);
      expect(r.facility.timeLeft).toBe(24);
    });

    it('产量加成 floor 入账：floor(reward × (1 + yield))', () => {
      let state = baseState();
      state.inventory.scrap_metal = 100;
      state = startSmelterTask(state, 'smelt_alloy', 2).state;
      // smelt_alloy reward = 1；+100% 产量 → floor(1 × 2) = 2
      const dutyResolved = { ...EMPTY_DUTY_BONUS, yieldMultiplier: 1.0 };
      processFacility(smelter(state), state.inventory, 30, dutyResolved);
      expect(state.inventory.alloy_plate).toBe(2);
    });
  });
  describe('取消任务', () => {
    it('取消退款 = (目标批数 − 已完成批数) × 每批折扣成本，已产出保留', () => {
      let state = baseState();
      state.inventory.scrap_metal = 100;
      state = startSmelterTask(state, 'smelt_alloy', 3).state; // 扣 6
      expect(state.inventory.scrap_metal).toBe(94);

      // 完成 1 批后取消：剩余 2 批 × 2 = 退 4
      const afterOne = processFacility(smelter(state), state.inventory, 30);
      state = { ...state, shelter: { ...state.shelter, facilities: { ...state.shelter.facilities, smelter: [afterOne.facility] } } };
      const r = cancelTaskUpdate(state, 'smelter', 0);

      expect(r.result).toBe(true);
      expect(r.state.inventory.scrap_metal).toBe(100 - 2); // 已产 1 批消耗 2，退 4
      expect(r.state.inventory.alloy_plate).toBe(1); // 已产出保留
      const fac = smelter(r.state);
      expect(fac.recipeId).toBeNull();
      expect(fac.targetCount).toBe(0);
      expect(fac.completedCount).toBe(0);
      expect(fac.timeLeft).toBe(0);
    });

    it('刚开始即取消：全额退款（未生产任何批次）', () => {
      let state = baseState();
      state.inventory.scrap_metal = 100;
      state = startSmelterTask(state, 'smelt_alloy', 2).state;
      const r = cancelTaskUpdate(state, 'smelter', 0);
      expect(r.state.inventory.scrap_metal).toBe(100);
      expect(smelter(r.state).recipeId).toBeNull();
    });

    it('待机时取消拒绝', () => {
      let state = baseState();
      const r = cancelTaskUpdate(state, 'smelter', 0);
      expect(r.result).toBe(false);
      expect(r.state).toBe(state);
    });

    it('取消退款与扣款同折扣单价（无折扣时完全抵消，不赚差价）', () => {
      let state = baseState();
      state.inventory.scrap_metal = 100;
      state = startSmelterTask(state, 'smelt_alloy', 5).state; // 扣 10
      const r = cancelTaskUpdate(state, 'smelter', 0);
      expect(r.state.inventory.scrap_metal).toBe(100); // 无折扣：退 10
    });

    it('换驻守后取消仍按任务开始时刻的减免快照退款（扣/退同价，不赚差价）', () => {
      let state = baseState();
      // 注入带 -15% 全局原料减免的英雄（soldier）并驻守冶炼炉
      state.heroes.soldier = structuredClone(state.heroes.nova);
      state.heroes.soldier.logisticsFacilityId = { type: 'facility', targetId: 'smelter_0' };
      state.inventory.scrap_metal = 100;
      // 每批折扣：smelt_alloy 2 废铁 → max(1, floor(2 × 0.85)) = 1；target 3 → 扣 3
      state = startSmelterTask(state, 'smelt_alloy', 3).state;
      expect(state.inventory.scrap_metal).toBe(100 - 3);
      expect(smelter(state).costReduction).toBe(0.15); // 快照已记录

      // 任务中换驻守：解除 soldier（此后无任何减免）
      state.heroes.soldier.logisticsFacilityId = null;

      // 取消：按快照 0.15 退款 = 3 × 1 = 3（若用当前减免 0 会退 6 赚差价）
      const r = cancelTaskUpdate(state, 'smelter', 0);
      expect(r.state.inventory.scrap_metal).toBe(100);
      expect(smelter(r.state).recipeId).toBeNull();
    });
  });

  describe('多台设备并行（单任务互斥但不跨设备）', () => {
    it('两台设备各自独立任务，互不影响', () => {
      let state = baseState();
      state.inventory.scrap_metal = 100;
      state = expandFacilityUpdate(state, 'smelter', 0).state;
      state = resolveShelterUpgrades(state, 10 ** 12).state; // 完成扩建 → 2 台

      state = startTaskUpdate(state, 'smelter', 0, 'smelt_alloy', 2).state;
      state = startTaskUpdate(state, 'smelter', 1, 'smelt_alloy', 2).state;
      expect(state.inventory.scrap_metal).toBe(100 - 40 - 8); // 扩建 40 + 各扣 4

      const result0 = processFacility(state.shelter.facilities.smelter[0], state.inventory, 30);
      const result1 = processFacility(state.shelter.facilities.smelter[1], state.inventory, 30);
      expect(result0.facility.completedCount).toBe(1);
      expect(result1.facility.completedCount).toBe(1);
      expect(state.inventory.alloy_plate).toBe(2);
    });
  });

  describe('批次上限（getMaxAffordableBatches，UI 滑条用）', () => {
    it('上限 = floor(库存 / 每批折扣成本)，材料不足为 0', () => {
      let state = baseState();
      state.inventory.scrap_metal = 10; // 每批 2 → 5 批
      expect(getMaxAffordableBatches('smelt_alloy', state.inventory)).toBe(5);
      state.inventory.scrap_metal = 3;
      expect(getMaxAffordableBatches('smelt_alloy', state.inventory)).toBe(1);
      state.inventory.scrap_metal = 0;
      expect(getMaxAffordableBatches('smelt_alloy', state.inventory)).toBe(0);
    });

    it('成本减免提高上限（floor(库存 / 折扣价)）；多材料取最小值', () => {
      let state = baseState();
      state.inventory.scrap_metal = 10;
      // 减免 50%：2 废铁 → 1 /批 → 上限 10
      expect(getMaxAffordableBatches('smelt_alloy', state.inventory, 0.5)).toBe(10);
      // 多材料取最小值：smelt_sunflower 需 3 钢花瓣 + 1 废铁
      state.inventory.steel_petal = 6;
      state.inventory.scrap_metal = 5;
      expect(getMaxAffordableBatches('smelt_sunflower', state.inventory)).toBe(2); // min(floor(6/3)=2, floor(5/1)=5)
    });

    it('未知配方返回 0', () => {
      expect(getMaxAffordableBatches('nope', baseState().inventory)).toBe(0);
    });
  });
});
describe('扩建（多设施并行，耗时施工）', () => {
  it('扩建开始扣材料进入施工，完成后新增一台 Lv1 设施，费用按已有台数递增', () => {
    let state = baseState();
    state.inventory.scrap_metal = 200;
    const r1 = expandFacilityUpdate(state, 'smelter', 0);
    expect(r1.result).toBe(true);
    expect(r1.state.shelter.facilities.smelter.length).toBe(1); // 施工中
    expect(r1.state.inventory.scrap_metal).toBe(200 - 40);
    expect(r1.state.shelter.upgrades['expand_smelter']).toEqual({ startTime: 0 });

    const done1 = resolveShelterUpgrades(r1.state, 10 ** 12);
    expect(done1.completed.length).toBe(1);
    expect(done1.state.shelter.facilities.smelter.length).toBe(2);
    expect(done1.state.shelter.facilities.smelter[1].level).toBe(1);
    expect(done1.state.shelter.facilities.smelter[1].recipeId).toBeNull(); // 新台待机
    expect(done1.state.shelter.upgrades['expand_smelter']).toBeUndefined();

    const r2 = expandFacilityUpdate(done1.state, 'smelter', 0);
    expect(r2.result).toBe(true);
    expect(r2.state.inventory.scrap_metal).toBe(200 - 40 - 120);
    const done2 = resolveShelterUpgrades(r2.state, 10 ** 12);
    expect(done2.state.shelter.facilities.smelter.length).toBe(3);

    // 已达上限 3
    const r3 = expandFacilityUpdate(done2.state, 'smelter');
    expect(r3.result).toBe(false);
    expect(r3.state.shelter.facilities.smelter.length).toBe(3);
  });

  it('扩建施工中禁止重复开始', () => {
    let state = baseState();
    state.inventory.scrap_metal = 200;
    const r1 = expandFacilityUpdate(state, 'smelter', 0);
    expect(r1.result).toBe(true);
    expect(expandFacilityUpdate(r1.state, 'smelter').result).toBe(false);
  });

  it('扩建资金不足时拒绝', () => {
    let state = baseState();
    state.inventory.scrap_metal = 10;
    const r = expandFacilityUpdate(state, 'smelter');
    expect(r.result).toBe(false);
    expect(r.state.shelter.facilities.smelter.length).toBe(1);
  });
});

describe('基建升级耗时（时间戳驱动）', () => {
  it('开始升级扣材料并进入升级中，未到耗时前不应用，到期后完成', () => {
    let state = baseState();
    state.inventory.scrap_metal = 100;
    const r = upgradeShelterStatUpdate(state, 'smelter', 0, 0);
    expect(r.result).toBe(true);
    expect(r.state.inventory.scrap_metal).toBe(100 - 20); // Lv1→2 扣 20
    expect(r.state.shelter.upgrades['smelter_0']).toEqual({ startTime: 0 });
    expect(smelter(r.state).level).toBe(1); // 施工中未应用

    const mid = resolveShelterUpgrades(r.state, 1800 * 1000 - 1);
    expect(smelter(mid.state).level).toBe(1);
    expect(mid.state.shelter.upgrades['smelter_0']).toBeDefined();
    expect(mid.completed).toEqual([]);

    const done = resolveShelterUpgrades(r.state, 1800 * 1000);
    expect(smelter(done.state).level).toBe(2);
    expect(done.state.shelter.upgrades['smelter_0']).toBeUndefined();
    expect(done.completed[0].text).toContain('魔导冶炼炉 升级至 Lv.2');
  });

  it('升级中禁止重复开始同一项，不同项可并行', () => {
    let state = baseState();
    state.inventory.scrap_metal = 1000;
    state = upgradeShelterStatUpdate(state, 'battery', 0, 0).state;
    expect(upgradeShelterStatUpdate(state, 'battery', 0, 0).result).toBe(false); // 重复
    const r = upgradeShelterStatUpdate(state, 'generator', 0, 0);
    expect(r.result).toBe(true); // 不同项并行
  });

  it('已满级拒绝开始', () => {
    let state = baseState();
    state.shelter.recyclerLevel = 10;
    expect(upgradeShelterStatUpdate(state, 'recycler').result).toBe(false);
  });

  it('材料不足拒绝开始且不扣料', () => {
    let state = baseState(); // 初始 10 废铁，battery Lv1→2 需 20
    const r = upgradeShelterStatUpdate(state, 'battery');
    expect(r.result).toBe(false);
    expect(r.state.inventory.scrap_metal).toBe(10);
    expect(r.state.shelter.upgrades).toEqual({});
  });

  it('battery 升级完成后更新 maxOfflineDuration', () => {
    let state = baseState();
    state.inventory.scrap_metal = 100;
    state = upgradeShelterStatUpdate(state, 'battery', 0, 0).state;
    const done = resolveShelterUpgrades(state, 3600 * 1000);
    expect(done.state.shelter.batteryLevel).toBe(2);
    expect(done.state.shelter.maxOfflineDuration).toBe(18000);
  });

  it('温室智能扩展坞升级：每级 +2 槽并钳制到 8 槽上限', () => {
    let state = baseState();
    state.inventory = { scrap_metal: 1000, alloy_plate: 100, plasma_cell: 20, mana_dust: 50 };
    state = upgradeShelterStatUpdate(state, 'greenhouse_dock', 0, 0).state;
    const done1 = resolveShelterUpgrades(state, 7200 * 1000);
    expect(done1.state.greenhouse.unlockedSlotsCount).toBe(6);
    expect(done1.state.greenhouse.slots.length).toBe(6);

    const r2 = upgradeShelterStatUpdate(done1.state, 'greenhouse_dock', 0, 0);
    const done2 = resolveShelterUpgrades(r2.state, 43200 * 1000);
    expect(done2.state.greenhouse.unlockedSlotsCount).toBe(8);
    expect(upgradeShelterStatUpdate(done2.state, 'greenhouse_dock').result).toBe(false); // 满级
  });

  it('旧存档 6 槽自动换算为扩展坞 Lv.1（无需迁移）', () => {
    let state = baseState();
    state.greenhouse.unlockedSlotsCount = 6;
    expect(getShelterUpgradeLevel(state, 'greenhouse_dock')).toBe(1); // 6 槽 → Lv.1
    const rich = { ...state, inventory: { scrap_metal: 1000, alloy_plate: 100, plasma_cell: 20, mana_dust: 50 } };
    const r = upgradeShelterStatUpdate(rich, 'greenhouse_dock', 0, 0);
    expect(r.result).toBe(true);
    expect(r.state.shelter.upgrades['greenhouse_dock']).toBeDefined();
  });

  it('离线回归：先应用完成的升级再结算产出，报告含 completedUpgrades', () => {
    let state = baseState();
    state.inventory.scrap_metal = 1000;
    // 发电机升级 30m：开始于 0，离线 1h 后必然完成
    state = upgradeShelterStatUpdate(state, 'generator', 0, 0).state;
    const { updatedState, report } = calculateDetailedOfflineProgress(state, 3600, Math.random, 3600 * 1000);
    expect(updatedState.shelter.generatorLevel).toBe(1);
    expect(updatedState.shelter.upgrades['generator']).toBeUndefined();
    expect(report.completedUpgrades).toContain('魔导发电机 升级至 Lv.1（离线期间完成）');
  });

  it('离线回归：未完成的升级保留施工条目继续计时', () => {
    let state = baseState();
    state.inventory.scrap_metal = 1000;
    // battery 升级 1h：开始于 0，离线 30m 未完成
    state = upgradeShelterStatUpdate(state, 'battery', 0, 0).state;
    const { updatedState, report } = calculateDetailedOfflineProgress(state, 1800, Math.random, 1800 * 1000);
    expect(updatedState.shelter.batteryLevel).toBe(1);
    expect(updatedState.shelter.upgrades['battery']).toEqual({ startTime: 0 });
    expect(report.completedUpgrades).toBeUndefined();
  });

  it('防御：无法解析的施工条目被丢弃（不应用、不崩溃）', () => {
    let state = baseState();
    const ghost = {
      ...state,
      shelter: { ...state.shelter, upgrades: { ghost_unknown: { startTime: 0 } } }
    };
    const r = resolveShelterUpgrades(ghost, 10 ** 12);
    expect(r.state.shelter.upgrades['ghost_unknown']).toBeUndefined();
    expect(r.completed).toEqual([]);
    expect(r.state.inventory.scrap_metal).toBe(10); // 未误扣/误退
  });

  it('离线：升级施工先应用再结算，顺序影响任务批次耗时（issue 07）', () => {
    const state = baseState();
    state.inventory = { scrap_metal: 1000 };
    // 任务：Lv1 smelt_alloy × 2，首批剩 22s（timeLeft 绝对推进，与等级无关）
    state.shelter.facilities.smelter[0] = {
      id: 'smelter',
      name: '魔导冶炼炉',
      level: 1,
      recipeId: 'smelt_alloy',
      targetCount: 2,
      completedCount: 0,
      timeLeft: 22,
      currentProgress: 0
    };
    const now = 3600 * 1000 + 51 * 1000;
    // 冶炼炉升级 Lv1→2（耗时 1800s）在离线 51s 时恰好完成：startTime = now - 1841s
    state.shelter.upgrades = { smelter_0: { startTime: now - 1841 * 1000 } };

    const { updatedState } = calculateDetailedOfflineProgress(state, 51, Math.random, now);

    const fac = updatedState.shelter.facilities.smelter[0];
    expect(fac.level).toBe(2); // 升级先应用（Lv1→2）
    expect(updatedState.shelter.upgrades['smelter_0']).toBeUndefined();
    // 顺序锁定：先应用升级（Lv2 每批 30/1.1=27s）→ 首批 22s + 第二批 27s = 49s ≤ 51s 完成回待机；
    // 若升级后应用（Lv1 每批 30/1.0=30s）→ 22 + 30 = 52s > 51s 未完成（仅产 1 批）——两种顺序结果不同
    expect(fac.recipeId).toBeNull();
    expect(fac.timeLeft).toBe(0);
    expect(updatedState.inventory.alloy_plate).toBe(2); // 离线推进完成 2 批
  });
});
describe('加工耗时', () => {
  it('耗时随等级缩短（Lv1 = 100% 基准，每级 +10%）', () => {
    expect(getActualDuration('smelt_alloy', 1)).toBe(30); // 30 / 1.0（Lv1 初始效率）
    expect(getActualDuration('smelt_alloy', 5)).toBe(21); // 30 / 1.4
  });

  it('getActualDuration 扩展第三参：speedMultiplier=0 时向后兼容', () => {
    expect(getActualDuration('smelt_alloy', 1, 0)).toBe(30); // 30 / 1.0
    expect(getActualDuration('smelt_alloy', 1)).toBe(30);    // 不传第三参，默认 0
  });

  it('速度加成乘算叠加：level + speedMultiplier', () => {
    // 30 / ((1 + 0) × (1 + 0.25)) = 30 / 1.25 = 24
    expect(getActualDuration('smelt_alloy', 1, 0.25)).toBe(24);
    // 30 / ((1 + 0.4) × (1 + 0.25)) = 30 / 1.75 = 17.1 -> floor 17
    expect(getActualDuration('smelt_alloy', 5, 0.25)).toBe(17);
  });
});

describe('旧存档迁移（mergeSavedState）', () => {
  it('旧队列（queue 数组）一次性清空：加载回待机，任务字段默认值', () => {
    const saved = {
      ...baseState(),
      shelter: {
        ...baseState().shelter,
        facilities: {
          smelter: [
            {
              id: 'smelter',
              name: '魔导冶炼炉',
              level: 2,
              queue: ['smelt_alloy', 'smelt_sunflower'],
              currentProgress: 0,
              timeLeft: 5,
              active: true
            }
          ],
          assembler: [
            {
              id: 'assembler',
              name: '微型芯片组装台',
              level: 3,
              queue: ['assemble_ration'],
              currentProgress: 0,
              timeLeft: 0,
              active: false
            }
          ]
        }
      }
    } as unknown as GameState;

    const merged = mergeSavedState(saved, INITIAL_STATE);
    // 旧队列不转换，一次性清空 → 待机
    expect(merged.shelter.facilities.smelter[0].recipeId).toBeNull();
    expect(merged.shelter.facilities.smelter[0].targetCount).toBe(0);
    expect(merged.shelter.facilities.smelter[0].timeLeft).toBe(0);
    expect(merged.shelter.facilities.assembler[0].recipeId).toBeNull();
  });

  it('旧单设施对象存档（activeRecipeId）迁移为单批任务（target=1，保留在制进度）', () => {
    const saved = {
      ...baseState(),
      shelter: {
        ...baseState().shelter,
        facilities: {
          smelter: {
            id: 'smelter',
            name: '魔导冶炼炉',
            level: 2,
            activeRecipeId: 'smelt_alloy',
            currentProgress: 0,
            timeLeft: 5,
            active: true
          }
        }
      }
    } as unknown as GameState;

    const merged = mergeSavedState(saved, INITIAL_STATE);

    expect(Array.isArray(merged.shelter.facilities.smelter)).toBe(true);
    expect(merged.shelter.facilities.smelter[0].recipeId).toBe('smelt_alloy');
    expect(merged.shelter.facilities.smelter[0].targetCount).toBe(1); // 单批任务
    expect(merged.shelter.facilities.smelter[0].completedCount).toBe(0);
    expect(merged.shelter.facilities.smelter[0].timeLeft).toBe(5); // 在制进度保留（钳制内）
    expect(merged.shelter.facilities.assembler.length).toBe(1); // 缺失类型回退初始
  });

  it('新字段任务存档：未完成保留、完成态回待机、配方失效回待机', () => {
    const saved = {
      ...baseState(),
      shelter: {
        ...baseState().shelter,
        facilities: {
          smelter: [
            { id: 'smelter', name: '魔导冶炼炉', level: 2, recipeId: 'smelt_alloy', targetCount: 5, completedCount: 3, timeLeft: 10, currentProgress: 0, costReduction: 0.2 },
            { id: 'smelter', name: '魔导冶炼炉', level: 1, recipeId: 'smelt_alloy', targetCount: 2, completedCount: 2, timeLeft: 0, currentProgress: 0 }, // 已完成 → 待机
            { id: 'smelter', name: '魔导冶炼炉', level: 1, recipeId: 'ghost_recipe', targetCount: 2, completedCount: 0, timeLeft: 5, currentProgress: 0 } // 配方失效 → 待机
          ]
        }
      }
    } as unknown as GameState;

    const merged = mergeSavedState(saved, INITIAL_STATE);
    const units = merged.shelter.facilities.smelter;
    expect(units[0].recipeId).toBe('smelt_alloy');
    expect(units[0].targetCount).toBe(5);
    expect(units[0].completedCount).toBe(3);
    expect(units[0].timeLeft).toBe(10);
    expect(units[0].costReduction).toBe(0.2); // 减免快照透传
    expect(units[1].recipeId).toBeNull(); // 已完成回待机
    expect(units[2].recipeId).toBeNull(); // 配方失效回待机
  });

  it('ticket 01 去重：被删除的自动配方 id 任务清出（迁移映射目标为工坊侧手动配方，不再可自动生产）', () => {
    const saved = {
      ...baseState(),
      shelter: {
        ...baseState().shelter,
        facilities: {
          smelter: [
            { id: 'smelter', name: '魔导冶炼炉', level: 1, recipeId: 'craft_nanite_slurry', targetCount: 2, completedCount: 0, timeLeft: 5, currentProgress: 0 } // 已被删除
          ],
          assembler: [
            { id: 'assembler', name: '微型芯片组装台', level: 2, recipeId: 'craft_rusted_spring', targetCount: 2, completedCount: 0, timeLeft: 5, currentProgress: 0 }
          ]
        }
      }
    } as unknown as GameState;

    const merged = mergeSavedState(saved, INITIAL_STATE);
    expect(merged.shelter.facilities.smelter[0].recipeId).toBeNull();
    expect(merged.shelter.facilities.assembler[0].recipeId).toBeNull();
  });
});

describe('dutyMeta 加成（ADR-0018：设施驻守）', () => {
  it('resolveDutyBonus 无驻守英雄时返回空加成', () => {
    let state = baseState();
    expect(resolveDutyBonus(state, 'smelter', 0)).toEqual({ heroId: null, bonuses: EMPTY_DUTY_BONUS });
  });

  it('resolveDutyBonus 有驻守英雄时按设备作用域返回加成', () => {
    let state = baseState();
    // nova 全局 +25% 速度（作用域化：all → 对熔炉生效）
    state.heroes.nova.logisticsFacilityId = { type: 'facility', targetId: 'smelter_0' };
    const { heroId, bonuses } = resolveDutyBonus(state, 'smelter', 0);
    expect(heroId).toBe('nova');
    expect(bonuses.speedMultiplier).toBe(0.25);
    expect(bonuses.yieldMultiplier).toBe(0);
  });

  it('resolveDutyBonus 熔炉专精：罗伊驻守熔炉 +30%，驻守组装台仅 +15%', () => {
    let state = baseState();
    state.heroes.roy = structuredClone(state.heroes.nova);
    state.heroes.roy.logisticsFacilityId = { type: 'facility', targetId: 'smelter_0' };
    const smelterBonus = resolveDutyBonus(state, 'smelter', 0).bonuses;
    expect(smelterBonus.speedMultiplier).toBeCloseTo(0.45, 5); // 熔炉专精 0.30 + 全局 0.15
    state.heroes.roy.logisticsFacilityId = { type: 'facility', targetId: 'assembler_0' };
    const assemblerBonus = resolveDutyBonus(state, 'assembler', 0).bonuses;
    expect(assemblerBonus.speedMultiplier).toBe(0.15);
  });

  it('processFacility 无 dutyMeta 时行为不变（向后兼容）', () => {
    let state = baseState();
    state.inventory.scrap_metal = 100;
    const fac = { ...smelter(state), recipeId: 'smelt_alloy', targetCount: 1, completedCount: 0, timeLeft: 27 };
    const r = processFacility(fac, state.inventory, 27);
    expect(r.facility.recipeId).toBeNull();
    expect(state.inventory.alloy_plate).toBe(1);
    expect(state.inventory.scrap_metal).toBe(100); // processFacility 不再扣料（扣料在 startTask）
  });
});

describe('数据驱动设备注册（issue 05）', () => {
  it('初始状态设施由配置表驱动生成：key 与 FACILITIES_CONFIG 一致，每类初始 1 台 Lv1', () => {
    const keys = Object.keys(FACILITIES_CONFIG) as (keyof typeof FACILITIES_CONFIG)[];
    const stateKeys = Object.keys(INITIAL_STATE.shelter.facilities);
    expect(stateKeys).toEqual(keys);
    for (const type of keys) {
      const units = INITIAL_STATE.shelter.facilities[type];
      expect(units.length).toBe(1);
      expect(units[0].level).toBe(1);
      expect(units[0].name).toBe(FACILITIES_CONFIG[type].name);
      expect(units[0].id).toBe(type);
    }
  });

  it('SHELTER_UPGRADES 收敛为纯全局升级：不残留设备条目，仅 4 项全局升级', () => {
    for (const type of Object.keys(FACILITIES_CONFIG)) {
      expect(SHELTER_UPGRADES[type]).toBeUndefined();
    }
    expect(Object.keys(SHELTER_UPGRADES).sort()).toEqual(['battery', 'generator', 'greenhouse_dock', 'recycler']);
  });

  it('isFacilityType 守卫：配置表 key 为 true，全局升级/未知类型为 false', () => {
    for (const type of Object.keys(FACILITIES_CONFIG)) {
      expect(isFacilityType(type)).toBe(true);
    }
    expect(isFacilityType('battery')).toBe(false);
    expect(isFacilityType('unknown_facility')).toBe(false);
  });

  it('存档归一化按配置表 key 遍历：未知设备类型丢弃、缺失类型回退初始', () => {
    const saved = {
      ...baseState(),
      shelter: {
        ...baseState().shelter,
        facilities: {
          smelter: [
            {
              id: 'smelter',
              name: '魔导冶炼炉',
              level: 2,
              recipeId: 'smelt_alloy',
              targetCount: 2,
              completedCount: 0,
              timeLeft: 5,
              currentProgress: 0
            }
          ],
          ghost_facility: [
            {
              id: 'ghost_facility',
              name: '已删除的设备',
              level: 1,
              recipeId: null,
              targetCount: 0,
              completedCount: 0,
              timeLeft: 0,
              currentProgress: 0
            }
          ]
        }
      }
    } as unknown as GameState;

    const merged = mergeSavedState(saved, INITIAL_STATE);
    expect(Object.keys(merged.shelter.facilities).sort()).toEqual(Object.keys(FACILITIES_CONFIG).sort());
    expect((merged.shelter.facilities as Record<string, unknown>).ghost_facility).toBeUndefined();
    expect(merged.shelter.facilities.smelter[0].recipeId).toBe('smelt_alloy'); // 有效类型正常保留
  });

  it('升级/扩建 key 解析自动覆盖配置表新 key（isFacilityType 驱动 getShelterUpgradeKey）', () => {
    for (const type of Object.keys(FACILITIES_CONFIG)) {
      const t = type as 'smelter' | 'assembler';
      expect(getShelterUpgradeKey(t, 1)).toBe(`${t}_1`);
    }
    expect(getShelterUpgradeKey('battery')).toBe('battery');
  });
});


