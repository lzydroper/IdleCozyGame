import { describe, it, expect } from 'vitest';
import type { GameState } from '../types/game';
import { INITIAL_STATE } from '../data/initialState';
import {
  enqueueRecipeUpdate,
  removeQueueEntryUpdate,
  setFacilityActiveUpdate,
  expandFacilityUpdate,
  upgradeShelterStatUpdate,
  resolveShelterUpgrades,
  getShelterUpgradeLevel,
  processFacility,
  getQueueCapacity,
  getActualDuration,
  resolveDutyBonus
} from './facility';
import { calculateDetailedOfflineProgress } from './offline';
import { EMPTY_DUTY_BONUS } from './duty';
import { mergeSavedState } from './persistence';

// 以初始存档为基底构造测试状态
const baseState = (): GameState => structuredClone(INITIAL_STATE);

// 升级冶炼炉到指定等级（初始 10 废铁不够升级费用，先补给）；
// 耗时施工模式：startTime=0 开始，用超大时间戳 resolve 强制完成
const smelterAtLevel = (level: number): GameState => {
  let state = baseState();
  state.inventory.scrap_metal = 100;
  for (let lv = 1; lv < level; lv++) {
    const started = upgradeShelterStatUpdate(state, 'smelter', 0, 0);
    state = resolveShelterUpgrades(started.state, 10 ** 12).state;
  }
  return state;
};

const smelter = (state: GameState) => state.shelter.facilities.smelter[0];

describe('配方队列（ticket 13）', () => {
  describe('入队', () => {
    it('按 FIFO 尾部追加配方', () => {
      let state = smelterAtLevel(2); // Lv2 → 容量 2
      state = enqueueRecipeUpdate(state, 'smelter', 0, 'smelt_alloy').state;
      state = enqueueRecipeUpdate(state, 'smelter', 0, 'smelt_sunflower').state;

      expect(smelter(state).queue).toEqual(['smelt_alloy', 'smelt_sunflower']);
    });

    it('队列容量随设施等级提升（容量 = 等级）', () => {
      expect(getQueueCapacity(1)).toBe(1);
      expect(getQueueCapacity(2)).toBe(2);
      expect(getQueueCapacity(5)).toBe(5);
    });

    it('队列已满时拒绝入队', () => {
      let state = baseState(); // smelter Lv1 → 容量 1
      state = enqueueRecipeUpdate(state, 'smelter', 0, 'smelt_alloy').state;

      const r = enqueueRecipeUpdate(state, 'smelter', 0, 'smelt_sunflower');
      expect(r.result).toBe(false);
      expect(smelter(r.state).queue).toEqual(['smelt_alloy']);
    });

    it('拒绝不属于该设施类型的配方', () => {
      const state = baseState();
      const r = enqueueRecipeUpdate(state, 'smelter', 0, 'assemble_ration'); // assembler 配方
      expect(r.result).toBe(false);
      expect(smelter(r.state).queue).toEqual([]);
    });

    it('拒绝未知配方与不存在的台索引', () => {
      expect(enqueueRecipeUpdate(baseState(), 'smelter', 0, 'nope').result).toBe(false);
      expect(enqueueRecipeUpdate(baseState(), 'smelter', 9, 'smelt_alloy').result).toBe(false);
    });

    it('升级后队列容量提升，可继续入队', () => {
      let state = smelterAtLevel(2); // 升级消耗 20 废铁后容量 2
      state = enqueueRecipeUpdate(state, 'smelter', 0, 'smelt_alloy').state;
      const r = enqueueRecipeUpdate(state, 'smelter', 0, 'smelt_sunflower');
      expect(r.result).toBe(true);
      expect(smelter(r.state).queue).toEqual(['smelt_alloy', 'smelt_sunflower']);
    });
  });

  describe('顺序执行（FIFO）', () => {
    it('队首完成后自动执行下一配方，每项只产一批', () => {
      let state = smelterAtLevel(3); // Lv3 容量 3：提炼合金(30s→27s) + 钢纹花瓣熔炼(45s→40s)
      state = enqueueRecipeUpdate(state, 'smelter', 0, 'smelt_alloy').state;
      state = enqueueRecipeUpdate(state, 'smelter', 0, 'smelt_sunflower').state;
      state.inventory.scrap_metal = 10;
      state.inventory.steel_petal = 3;

      // 推进 70 秒：第一项 27s 完成，第二项 40s 完成，剩余 3s
      const { facility } = processFacility(smelter(state), state.inventory, 70);

      expect(facility.queue).toEqual([]); // 两项都已出队
      expect(state.inventory.alloy_plate).toBe(3); // 1 + 2
      expect(state.inventory.scrap_metal).toBe(10 - 2 - 1); // 两项原料均已扣除
      expect(state.inventory.steel_petal).toBe(0);
      expect(facility.timeLeft).toBe(0);
    });

    it('队首生产中途暂停，恢复后继续', () => {
      let state = baseState();
      state = enqueueRecipeUpdate(state, 'smelter', 0, 'smelt_alloy').state;
      state.inventory.scrap_metal = 2;
      state = { ...state, shelter: { ...state.shelter, facilities: { ...state.shelter.facilities, smelter: [processFacility(smelter(state), state.inventory, 1).facility] } } };

      // 生产 1 秒后（27s 中的第 1 秒），原料耗尽不影响进行中的一轮
      expect(smelter(state).timeLeft).toBe(26);
      const mid = processFacility(smelter(state), state.inventory, 30);
      expect(mid.facility.queue).toEqual([]);
      expect(state.inventory.alloy_plate).toBe(1);
    });
  });

  describe('资源不足暂停', () => {
    it('队首原料不足时暂停：不扣料、不产出、队首保留', () => {
      let state = baseState();
      state = enqueueRecipeUpdate(state, 'smelter', 0, 'smelt_alloy').state;
      state.inventory.scrap_metal = 0;

      const r = processFacility(smelter(state), state.inventory, 10);

      expect(r.facility.timeLeft).toBe(0);
      expect(r.facility.queue).toEqual(['smelt_alloy']);
      expect(state.inventory.scrap_metal).toBe(0);
      expect(state.inventory.alloy_plate).toBeUndefined();
    });

    it('材料补足后自动恢复生产', () => {
      let state = baseState();
      state = enqueueRecipeUpdate(state, 'smelter', 0, 'smelt_alloy').state;
      state.inventory.scrap_metal = 0;
      processFacility(smelter(state), state.inventory, 5); // 暂停

      state.inventory.scrap_metal = 2; // 补料
      const r = processFacility(smelter(state), state.inventory, 27);

      expect(r.facility.timeLeft).toBe(0);
      expect(r.facility.queue).toEqual([]);
      expect(state.inventory.alloy_plate).toBe(1);
    });

    it('完成当前配方后，下一配方原料不足时暂停等待', () => {
      let state = smelterAtLevel(2); // Lv2 → 容量 2
      state = enqueueRecipeUpdate(state, 'smelter', 0, 'smelt_alloy').state;
      state = enqueueRecipeUpdate(state, 'smelter', 0, 'smelt_sunflower').state;
      state.inventory.scrap_metal = 2; // 只够第一项
      state.inventory.steel_petal = 0;

      const r = processFacility(smelter(state), state.inventory, 30);

      expect(state.inventory.alloy_plate).toBe(1); // 第一项完成
      expect(r.facility.queue).toEqual(['smelt_sunflower']); // 第二项留在队首等待
      expect(r.facility.timeLeft).toBe(0);
    });
  });

  describe('队首移除与停用', () => {
    it('移除生产中（timeLeft > 0）的队首退还已扣原料', () => {
      let state = baseState();
      state = enqueueRecipeUpdate(state, 'smelter', 0, 'smelt_alloy').state;
      state.inventory.scrap_metal = 10;
      state = { ...state, shelter: { ...state.shelter, facilities: { ...state.shelter.facilities, smelter: [processFacility(smelter(state), state.inventory, 5).facility] } } };
      expect(smelter(state).timeLeft).toBeGreaterThan(0);
      expect(state.inventory.scrap_metal).toBe(8); // 已扣 2

      const r = removeQueueEntryUpdate(state, 'smelter', 0, 0);
      expect(r.result).toBe(true);
      expect(r.state.inventory.scrap_metal).toBe(10); // 退还
      expect(smelter(r.state).queue).toEqual([]);
      expect(smelter(r.state).timeLeft).toBe(0);
    });

    it('移除排队中（非队首）的条目不影响生产', () => {
      let state = smelterAtLevel(2);
      state = enqueueRecipeUpdate(state, 'smelter', 0, 'smelt_alloy').state;
      state = enqueueRecipeUpdate(state, 'smelter', 0, 'smelt_sunflower').state;
      state.inventory.scrap_metal = 10;
      state.inventory.steel_petal = 3;

      const r = removeQueueEntryUpdate(state, 'smelter', 0, 1);
      expect(r.result).toBe(true);
      expect(smelter(r.state).queue).toEqual(['smelt_alloy']);
      expect(r.state.inventory.scrap_metal).toBe(10); // 未扣任何原料
    });

    it('停用的设施不运转', () => {
      let state = baseState();
      state = enqueueRecipeUpdate(state, 'smelter', 0, 'smelt_alloy').state;
      state = setFacilityActiveUpdate(state, 'smelter', 0, false).state;
      state.inventory.scrap_metal = 10;

      const r = processFacility(smelter(state), state.inventory, 30);
      expect(r.facility.timeLeft).toBe(0);
      expect(r.facility.queue).toEqual(['smelt_alloy']);
      expect(state.inventory.scrap_metal).toBe(10);
    });
  });

  describe('扩建（多设施并行，耗时施工）', () => {
    it('扩建开始扣材料进入施工，完成后新增一台 Lv1 设施，费用按已有台数递增', () => {
      let state = baseState();
      state.inventory.scrap_metal = 200;
      // 第 2 台：开始施工（扣 40）→ 未完成前台数不变
      const r1 = expandFacilityUpdate(state, 'smelter', 0);
      expect(r1.result).toBe(true);
      expect(r1.state.shelter.facilities.smelter.length).toBe(1); // 施工中
      expect(r1.state.inventory.scrap_metal).toBe(200 - 40);
      expect(r1.state.shelter.upgrades['expand_smelter']).toEqual({ startTime: 0 });

      const done1 = resolveShelterUpgrades(r1.state, 10 ** 12);
      expect(done1.completed.length).toBe(1);
      expect(done1.state.shelter.facilities.smelter.length).toBe(2);
      expect(done1.state.shelter.facilities.smelter[1].level).toBe(1);
      expect(done1.state.shelter.facilities.smelter[1].queue).toEqual([]);
      expect(done1.state.shelter.upgrades['expand_smelter']).toBeUndefined();

      // 第 3 台：扣 120
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
      const state = baseState();
      state.inventory.scrap_metal = 200;
      const r1 = expandFacilityUpdate(state, 'smelter', 0);
      expect(r1.result).toBe(true);
      expect(expandFacilityUpdate(r1.state, 'smelter').result).toBe(false);
    });

    it('扩建资金不足时拒绝', () => {
      const state = baseState();
      state.inventory.scrap_metal = 10;
      const r = expandFacilityUpdate(state, 'smelter');
      expect(r.result).toBe(false);
      expect(r.state.shelter.facilities.smelter.length).toBe(1);
    });

    it('两台设施独立运转（并行）', () => {
      let state = baseState();
      state.inventory.scrap_metal = 100;
      state = expandFacilityUpdate(state, 'smelter', 0).state;
      state = resolveShelterUpgrades(state, 10 ** 12).state; // 完成扩建
      state = enqueueRecipeUpdate(state, 'smelter', 0, 'smelt_alloy').state;
      state = enqueueRecipeUpdate(state, 'smelter', 1, 'smelt_alloy').state;
      state.inventory.scrap_metal = 100;

      const result0 = processFacility(state.shelter.facilities.smelter[0], state.inventory, 27);
      const result1 = processFacility(state.shelter.facilities.smelter[1], state.inventory, 27);

      expect(result0.facility.queue).toEqual([]);
      expect(result1.facility.queue).toEqual([]);
      expect(state.inventory.alloy_plate).toBe(2);
      expect(state.inventory.scrap_metal).toBe(100 - 4);
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

      // 未到完成时刻（耗时 1800s）
      const mid = resolveShelterUpgrades(r.state, 1800 * 1000 - 1);
      expect(smelter(mid.state).level).toBe(1);
      expect(mid.state.shelter.upgrades['smelter_0']).toBeDefined();
      expect(mid.completed).toEqual([]);

      // 到达完成时刻
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
      const state = baseState();
      state.shelter.recyclerLevel = 10;
      expect(upgradeShelterStatUpdate(state, 'recycler').result).toBe(false);
    });

    it('材料不足拒绝开始且不扣料', () => {
      const state = baseState(); // 初始 10 废铁，battery Lv1→2 需 20
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
      const state = baseState();
      state.greenhouse.unlockedSlotsCount = 6;
      expect(getShelterUpgradeLevel(state, 'greenhouse_dock')).toBe(1); // 6 槽 → Lv.1
      // Lv1 已是当前等级，下一步应指向 Lv2（补足材料后允许开始）
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
      const state = baseState();
      const ghost = {
        ...state,
        shelter: { ...state.shelter, upgrades: { ghost_unknown: { startTime: 0 } } }
      };
      const r = resolveShelterUpgrades(ghost, 10 ** 12);
      expect(r.state.shelter.upgrades['ghost_unknown']).toBeUndefined();
      expect(r.completed).toEqual([]);
      expect(r.state.inventory.scrap_metal).toBe(10); // 未误扣/误退
    });
  });

  describe('加工耗时', () => {
    it('耗时随等级缩短（每级 +10%）', () => {
      expect(getActualDuration('smelt_alloy', 1)).toBe(27); // 30 / 1.1
      expect(getActualDuration('smelt_alloy', 5)).toBe(20); // 30 / 1.5
    });

    it('防御：配置中不存在的队首条目被丢弃，残留进度一并清零', () => {
      const state = baseState();
      const ghost = { ...smelter(state), queue: ['ghost_recipe'], timeLeft: 5 };
      const r = processFacility(ghost, state.inventory, 10);
      expect(r.facility.queue).toEqual([]);
      expect(r.facility.timeLeft).toBe(0);
    });

    it('防御：运行期配置变更时丢弃失效条目，但不影响有效条目（进度不白送）', () => {
      const state = baseState();
      const ghost = { ...smelter(state), level: 2, queue: ['smelt_alloy', 'ghost_recipe'], timeLeft: 0 };
      const r = processFacility(ghost, state.inventory, 27);
      expect(r.facility.queue).toEqual([]);
      expect(state.inventory.alloy_plate).toBe(1); // 有效配方正常产出
    });

    it('防御：迁移时未知配方丢弃后，残留在制进度一并清零（不白送给下一配方）', () => {
      const saved = {
        ...baseState(),
        shelter: {
          ...baseState().shelter,
          facilities: {
            smelter: {
              id: 'smelter',
              name: '魔导冶炼炉',
              level: 3,
              activeRecipeId: 'ghost_recipe', // 配置中已删除的配方
              currentProgress: 40,
              timeLeft: 5,
              active: true
            }
          }
        }
      } as unknown as GameState;

      const merged = mergeSavedState(saved, INITIAL_STATE);
      expect(merged.shelter.facilities.smelter[0].queue).toEqual([]);
      expect(merged.shelter.facilities.smelter[0].timeLeft).toBe(0);
    });

    it('防御：失效队首后的有效配方不继承失效队的在制进度（timeLeft 清零）', () => {
      const saved = {
        ...baseState(),
        shelter: {
          ...baseState().shelter,
          facilities: {
            smelter: {
              id: 'smelter',
              name: '魔导冶炼炉',
              level: 3,
              queue: ['ghost_recipe', 'smelt_alloy'],
              currentProgress: 40,
              timeLeft: 5,
              active: true
            }
          }
        }
      } as unknown as GameState;

      const merged = mergeSavedState(saved, INITIAL_STATE);
      expect(merged.shelter.facilities.smelter[0].queue).toEqual(['smelt_alloy']);
      expect(merged.shelter.facilities.smelter[0].timeLeft).toBe(0);
    });
  });

  describe('旧存档迁移（mergeSavedState）', () => {
    it('旧单设施对象存档（activeRecipeId）迁移为多台数组 + FIFO 队列', () => {
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
      expect(merged.shelter.facilities.smelter[0].queue).toEqual(['smelt_alloy']);
      expect(merged.shelter.facilities.smelter[0].timeLeft).toBe(5); // 在制进度保留
      expect(merged.shelter.facilities.smelter[0].level).toBe(2);
      expect(merged.shelter.facilities.assembler.length).toBe(1); // 缺失类型回退初始
    });

    it('新队列数组存档保留队列；未知配方丢弃、容量按等级钳制', () => {
      const saved = {
        ...baseState(),
        shelter: {
          ...baseState().shelter,
          facilities: {
            smelter: [
              {
                id: 'smelter',
                name: '魔导冶炼炉',
                level: 1,
                queue: ['smelt_alloy', 'ghost_recipe', 'smelt_sunflower'],
                currentProgress: 0,
                timeLeft: 0,
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

      expect(merged.shelter.facilities.smelter[0].queue).toEqual(['smelt_alloy']); // Lv1 容量 1 + ghost 丢弃
      expect(merged.shelter.facilities.assembler[0].queue).toEqual(['assemble_ration']);
      expect(merged.shelter.facilities.assembler[0].active).toBe(false);
    });

    it('ticket 01 去重：被删除的自动配方 id 从设施队列清出（迁移映射目标为工坊侧手动配方，不再可自动生产）', () => {
      const saved = {
        ...baseState(),
        shelter: {
          ...baseState().shelter,
          facilities: {
            smelter: [
              {
                id: 'smelter',
                name: '魔导冶炼炉',
                level: 1,
                queue: ['craft_nanite_slurry', 'smelt_alloy'], // craft_nanite_slurry 已被删除
                currentProgress: 0,
                timeLeft: 0,
                active: true
              }
            ],
            assembler: [
              {
                id: 'assembler',
                name: '微型芯片组装台',
                level: 2,
                queue: ['craft_rusted_spring', 'assemble_ration'], // craft_rusted_spring 已被删除
                currentProgress: 0,
                timeLeft: 0,
                active: true
              }
            ]
          }
        }
      } as unknown as GameState;

      const merged = mergeSavedState(saved, INITIAL_STATE);

      expect(merged.shelter.facilities.smelter[0].queue).toEqual(['smelt_alloy']);
      expect(merged.shelter.facilities.smelter[0].queue).not.toContain('craft_nanite_slurry');
      expect(merged.shelter.facilities.assembler[0].queue).toEqual(['assemble_ration']);
      expect(merged.shelter.facilities.assembler[0].queue).not.toContain('craft_rusted_spring');
    });
  });

  describe('dutyMeta 加成（ADR-0018：设施驻守）', () => {
    it('getActualDuration 扩展第三参：speedMultiplier=0 时向后兼容', () => {
      expect(getActualDuration('smelt_alloy', 1, 0)).toBe(27); // 30 / 1.1
      expect(getActualDuration('smelt_alloy', 1)).toBe(27);    // 不传第三参，默认 0
    });

    it('getActualDuration 速度加成乘算叠加：level + speedMultiplier', () => {
      // 30 / ((1 + 1*0.1) * (1 + 0.25)) = 30 / (1.1 * 1.25) = 30 / 1.375 = 21.8 -> floor 21
      expect(getActualDuration('smelt_alloy', 1, 0.25)).toBe(21);
      // 30 / ((1 + 5*0.1) * (1 + 0.25)) = 30 / (1.5 * 1.25) = 30 / 1.875 = 16
      expect(getActualDuration('smelt_alloy', 5, 0.25)).toBe(16);
    });

    it('resolveDutyBonus 无驻守英雄时返回空加成', () => {
      const state = baseState();
      expect(resolveDutyBonus(state, 'smelter', 0)).toEqual({ heroId: null, bonuses: EMPTY_DUTY_BONUS });
    });

    it('resolveDutyBonus 有驻守英雄时按设备作用域返回加成', () => {
      const state = baseState();
      // nova 全局 +25% 速度（作用域化：all → 对熔炉生效）
      state.heroes.nova.logisticsFacilityId = { type: 'facility', targetId: 'smelter_0' };
      const { heroId, bonuses } = resolveDutyBonus(state, 'smelter', 0);
      expect(heroId).toBe('nova');
      expect(bonuses.speedMultiplier).toBe(0.25);
      expect(bonuses.yieldMultiplier).toBe(0);
    });

    it('resolveDutyBonus 熔炉专精：罗伊驻守熔炉 +30%，驻守组装台仅 +15%', () => {
      const state = baseState();
      // roy 非初始英雄，用 nova 状态模板注入
      state.heroes.roy = structuredClone(state.heroes.nova);
      state.heroes.roy.logisticsFacilityId = { type: 'facility', targetId: 'smelter_0' };
      const smelterBonus = resolveDutyBonus(state, 'smelter', 0).bonuses;
      expect(smelterBonus.speedMultiplier).toBeCloseTo(0.45, 5); // 熔炉专精 0.30 + 全局 0.15
      // 同一英雄改驻守组装台：只吃到全局 0.15（熔炉专精被过滤）
      state.heroes.roy.logisticsFacilityId = { type: 'facility', targetId: 'assembler_0' };
      const assemblerBonus = resolveDutyBonus(state, 'assembler', 0).bonuses;
      expect(assemblerBonus.speedMultiplier).toBe(0.15);
    });

    it('processFacility 无 dutyMeta 时行为不变（向后兼容）', () => {
      const state = baseState();
      state.inventory.scrap_metal = 10;
      const fac = { ...smelter(state), queue: ['smelt_alloy'], timeLeft: 0 };
      const r = processFacility(fac, state.inventory, 27);
      expect(r.facility.queue).toEqual([]);
      expect(state.inventory.alloy_plate).toBe(1);
      expect(state.inventory.scrap_metal).toBe(10 - 2);
      expect(r.facility.queue).toEqual([]);
    });

    it('processFacility 速度加成缩短加工时间', () => {
      const state = baseState();
      state.inventory.scrap_metal = 10;
      const fac = { ...smelter(state), queue: ['smelt_alloy'], timeLeft: 0 };
      // 有 +25% 速度时，27 秒已足够完成（实际耗时 21 秒）
      const dutyResolved = { ...EMPTY_DUTY_BONUS, speedMultiplier: 0.25 };
      const r = processFacility(fac, state.inventory, 27, dutyResolved);
      expect(r.facility.queue).toEqual([]);
      expect(state.inventory.alloy_plate).toBe(1);
    });

    it('processFacility 产量加成增加产出数量', () => {
      const state = baseState();
      state.inventory.scrap_metal = 10;
      const fac = { ...smelter(state), queue: ['smelt_alloy'], timeLeft: 0 };
      // smelt_alloy 产出 1 个 alloy_plate，+20% 产量 -> floor(1 * 1.2) = 1
      // 用一个产量 >1 的配方测试更有效，但 smelt_alloy 只产 1 个
      // 验证 floor 公式：floor(1 * 1.2) = 1（不变），floor(2 * 1.2) = 2（不变）
      // 改用 +100% 验证：floor(1 * 2.0) = 2
      const dutyResolved = { ...EMPTY_DUTY_BONUS, yieldMultiplier: 1.0 };
      processFacility(fac, state.inventory, 27, dutyResolved);
      expect(state.inventory.alloy_plate).toBe(2); // 1 * (1 + 1.0) = 2
    });

    it('processFacility 原料减免降低消耗（最低 1）', () => {
      const state = baseState();
      state.inventory.scrap_metal = 10;
      const fac = { ...smelter(state), queue: ['smelt_alloy'], timeLeft: 0 };
      // smelt_alloy 消耗 2 个 scrap_metal，-50% 原料 -> max(1, floor(2 * 0.5)) = 1
      const dutyResolved = { ...EMPTY_DUTY_BONUS, costReduction: 0.5 };
      processFacility(fac, state.inventory, 27, dutyResolved);
      expect(state.inventory.scrap_metal).toBe(10 - 1);
    });
  });
});
