import { describe, it, expect } from 'vitest';
import type { GameState } from '../types/game';
import { INITIAL_STATE } from '../data/initialState';
import {
  enqueueRecipeUpdate,
  removeQueueEntryUpdate,
  setFacilityActiveUpdate,
  expandFacilityUpdate,
  upgradeShelterStatUpdate,
  processFacility,
  getQueueCapacity,
  getActualDuration,
  resolveDutyBonus
} from './facility';
import { mergeSavedState } from './persistence';

// 以初始存档为基底构造测试状态
const baseState = (): GameState => structuredClone(INITIAL_STATE);

// 升级冶炼炉到指定等级（初始 10 废铁不够升级费用，先补给）
const smelterAtLevel = (level: number): GameState => {
  let state = baseState();
  state.inventory.scrap_metal = 100;
  for (let lv = 1; lv < level; lv++) {
    state = upgradeShelterStatUpdate(state, 'smelter', 0).state;
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

  describe('扩建（多设施并行）', () => {
    it('扩建新增一台 Lv1 设施，费用按已有台数递增', () => {
      let state = baseState();
      state.inventory.scrap_metal = 200;
      const r1 = expandFacilityUpdate(state, 'smelter');
      expect(r1.result).toBe(true);
      expect(r1.state.shelter.facilities.smelter.length).toBe(2);
      expect(r1.state.inventory.scrap_metal).toBe(200 - 40);
      expect(smelter(r1.state).queue).toEqual([]);
      expect(r1.state.shelter.facilities.smelter[1].level).toBe(1);

      const r2 = expandFacilityUpdate(r1.state, 'smelter');
      expect(r2.result).toBe(true);
      expect(r2.state.shelter.facilities.smelter.length).toBe(3);
      expect(r2.state.inventory.scrap_metal).toBe(200 - 40 - 120);

      const r3 = expandFacilityUpdate(r2.state, 'smelter'); // 已达上限 3
      expect(r3.result).toBe(false);
      expect(r3.state.shelter.facilities.smelter.length).toBe(3);
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
      state = expandFacilityUpdate(state, 'smelter').state;
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

    it('resolveDutyBonus 无驻守英雄时返回 null', () => {
      const state = baseState();
      expect(resolveDutyBonus(state, 'smelter', 0)).toBeNull();
    });

    it('resolveDutyBonus 有驻守英雄时返回 dutyMeta', () => {
      const state = baseState();
      // nova 有 facilitySpeedMultiplier: 0.25
      state.heroes.nova.logisticsFacilityId = { type: 'facility', targetId: 'smelter_0' };
      const bonus = resolveDutyBonus(state, 'smelter', 0);
      expect(bonus?.facilitySpeedMultiplier).toBe(0.25);
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
      const dutyMeta = { facilitySpeedMultiplier: 0.25 };
      const r = processFacility(fac, state.inventory, 27, dutyMeta);
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
      const dutyMeta = { facilityYieldMultiplier: 1.0 };
      processFacility(fac, state.inventory, 27, dutyMeta);
      expect(state.inventory.alloy_plate).toBe(2); // 1 * (1 + 1.0) = 2
    });

    it('processFacility 原料减免降低消耗（最低 1）', () => {
      const state = baseState();
      state.inventory.scrap_metal = 10;
      const fac = { ...smelter(state), queue: ['smelt_alloy'], timeLeft: 0 };
      // smelt_alloy 消耗 2 个 scrap_metal，-50% 原料 -> max(1, floor(2 * 0.5)) = 1
      const dutyMeta = { facilityCostReduction: 0.5 };
      processFacility(fac, state.inventory, 27, dutyMeta);
      expect(state.inventory.scrap_metal).toBe(10 - 1);
    });
  });
});
