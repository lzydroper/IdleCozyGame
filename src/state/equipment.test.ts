import { describe, it, expect } from 'vitest';
import type { GameState, HeroEquipment, EquippedItem, EquipmentSlot } from '../types/game';
import { INITIAL_STATE, createInitialHero } from '../data/initialState';
import {
  EQUIPMENT_SETS,
  EQUIPMENT_SLOTS,
  FORGE_COST,
  enhanceCost,
  EQUIPMENT_LIST
} from '../data/equipment';
import { ITEMS_CONFIG } from '../data/items';
import { RECIPES_CONFIG } from '../data/recipes';
import { COMBAT_ZONES, COMBAT_ZONE_LIST } from '../data/combatZones';
import { DREAM_EVENTS } from '../data/dreamEvents';
import {
  equipItemUpdate,
  unequipItemUpdate,
  enhanceItemUpdate,
  forgeMythicUpdate,
  getEquippedItemStats,
  getEquippedFlatStats,
  getSetEnhanceProgress,
  getSetBonuses,
  getHeroEquipmentBonus,
  emptyEquipment
} from './equipment';
import { craftItemUpdate } from './workshop';
import { heroToCombatant } from './combat';
import { mergeSavedState } from './persistence';

// 基础测试状态：开局状态 + 诺娃
const makeState = (overrides: Partial<GameState> = {}): GameState => {
  const s = JSON.parse(JSON.stringify(INITIAL_STATE)) as GameState;
  s.heroes.nova = createInitialHero('nova');
  return { ...s, ...overrides, heroes: { ...s.heroes, ...(overrides.heroes || {}) } };
};

// 便捷：给诺娃穿上一件装备
const wear = (state: GameState, slot: EquipmentSlot, itemId: string, enhance = 0, mythic = false): GameState => {
  const equip: HeroEquipment = {
    ...emptyEquipment(),
    ...(state.equipment?.nova || {}),
    [slot]: { itemId, enhance, mythic }
  };
  return { ...state, equipment: { ...(state.equipment || {}), nova: equip } };
};

// 便捷：背包持有 N 件装备实例（ADR-0014 修订）
const holdEquip = (state: GameState, itemId: string, n = 1, enhance = 0, mythic = false): GameState => ({
  ...state,
  equipmentInventory: {
    ...(state.equipmentInventory || {}),
    [itemId]: Array.from({ length: n }, () => ({ itemId, enhance, mythic }))
  }
});

describe('装备配置完整性（ticket 10）', () => {
  it('每个装备配置都有对应物品定义且类别为 equipment', () => {
    EQUIPMENT_LIST.forEach(cfg => {
      const item = ITEMS_CONFIG[cfg.id];
      expect(item, cfg.id).toBeDefined();
      expect(item.category).toBe('equipment');
      expect(EQUIPMENT_SETS[cfg.set], `${cfg.id} 的系列 ${cfg.set}`).toBeDefined();
      expect(EQUIPMENT_SLOTS).toContain(cfg.slot);
      expect(['workshop', 'blueprint', 'dreamscape', 'boss']).toContain(cfg.source);
    });
  });

  it('图纸解锁装备（blueprint source）都带 blueprintId，其余不带', () => {
    EQUIPMENT_LIST.forEach(cfg => {
      if (cfg.source === 'blueprint') {
        expect(cfg.blueprintId, cfg.id).toBeTruthy();
      } else {
        expect(cfg.blueprintId, cfg.id).toBeUndefined();
      }
    });
  });

  it('工坊合成（含图纸解锁）的每件装备都有对应配方，且图纸配方引用正确的 blueprintId', () => {
    EQUIPMENT_LIST
      .filter(cfg => cfg.source === 'workshop' || cfg.source === 'blueprint')
      .forEach(cfg => {
        const recipe = Object.values(RECIPES_CONFIG).find(r => r.reward[cfg.id]);
        expect(recipe, `${cfg.id} 应有合成配方`).toBeDefined();
        if (cfg.source === 'blueprint') {
          expect(recipe!.blueprintId, `${cfg.id} 配方应有图纸门槛`).toBe(cfg.blueprintId);
        } else {
          expect(recipe!.blueprintId, `${cfg.id} 配方不应有图纸门槛`).toBeUndefined();
        }
      });
  });

  it('掉落表含系列套装装备：余烬/星核 BOSS 专属，强化魔晶全域掉落', () => {
    const oldTownBoss = COMBAT_ZONES.old_town_ruins.boss;
    const radiatedBoss = COMBAT_ZONES.radiated_workshop.boss;
    // 余烬系列 + 图纸：旧城废墟 BOSS 掉落
    ['ember_weapon', 'ember_armor', 'ember_trinket', 'blueprint_ember_armory'].forEach(itemId => {
      expect(oldTownBoss.drops.some(d => d.itemId === itemId), itemId).toBe(true);
    });
    // 最强星核系列：仅辐射车间 BOSS 掉落
    ['starcore_weapon', 'starcore_armor', 'starcore_trinket'].forEach(itemId => {
      expect(radiatedBoss.drops.some(d => d.itemId === itemId), itemId).toBe(true);
      expect(oldTownBoss.drops.some(d => d.itemId === itemId), itemId).toBe(false);
    });
    // 强化魔晶：所有区域普通与 BOSS 掉落表都有
    COMBAT_ZONE_LIST.forEach(zone => {
      expect(zone.drops.some(d => d.itemId === 'enhance_stone'), `${zone.id} 掉落表`).toBe(true);
      expect(zone.boss.drops.some(d => d.itemId === 'enhance_stone'), `${zone.id} BOSS 掉落表`).toBe(true);
    });
  });

  it('梦境事件可掉落幽梦系列装备', () => {
    const event = DREAM_EVENTS.dreamveil_armory;
    expect(event).toBeDefined();
    expect(event.choices.A.results.items?.dreamveil_weapon).toBe(1);
    expect(event.choices.A.results.items?.dreamveil_trinket).toBe(1);
  });
});

describe('穿戴 / 卸下', () => {
  it('穿戴消耗 1 件背包装备实例，槽位以该实例落位', () => {
    let state = holdEquip(makeState(), 'ember_weapon', 2);
    const r = equipItemUpdate(state, 'nova', 'weapon', 'ember_weapon');
    expect(r.result).toBe(true);
    expect(r.state.equipmentInventory.ember_weapon.length).toBe(1);
    expect(r.state.equipment.nova.weapon).toEqual({ itemId: 'ember_weapon', enhance: 0, mythic: false });
  });

  it('换装：旧装备（含强化）返回背包，新装备入槽', () => {
    let state = wear(makeState(), 'weapon', 'wasteland_weapon', 5);
    state = holdEquip(state, 'ember_weapon', 1);
    const r = equipItemUpdate(state, 'nova', 'weapon', 'ember_weapon');
    expect(r.result).toBe(true);
    expect(r.state.equipment.nova.weapon?.itemId).toBe('ember_weapon');
    // 旧装备带强化等级返回背包（ADR-0014 修订）
    expect(r.state.equipmentInventory.wasteland_weapon).toEqual([{ itemId: 'wasteland_weapon', enhance: 5, mythic: false }]);
    expect(r.state.equipmentInventory.ember_weapon?.length ?? 0).toBe(0);
  });

  it('拒绝：槽位不符 / 未知装备 / 背包无货 / 未知英雄', () => {
    expect(equipItemUpdate(makeState(), 'nova', 'weapon', 'ember_armor').result).toBe(false);
    expect(equipItemUpdate(makeState(), 'nova', 'weapon', 'not_a_gear').result).toBe(false);
    expect(equipItemUpdate(makeState(), 'nova', 'weapon', 'ember_weapon').result).toBe(false);
    const state = holdEquip(makeState(), 'ember_weapon', 1);
    expect(equipItemUpdate(state, 'ghost', 'weapon', 'ember_weapon').result).toBe(false);
  });

  it('同物品换装允许：新实例入槽，旧强化实例回背包（ADR-0014 修订）', () => {
    const state = holdEquip(wear(makeState(), 'weapon', 'wasteland_weapon', 12), 'wasteland_weapon', 1);
    const r = equipItemUpdate(state, 'nova', 'weapon', 'wasteland_weapon');
    expect(r.result).toBe(true);
    expect(r.state.equipment.nova.weapon?.enhance).toBe(0); // 新 +0 实例入槽
    expect(r.state.equipmentInventory.wasteland_weapon).toEqual([{ itemId: 'wasteland_weapon', enhance: 12, mythic: false }]); // 旧 +12 回背包
  });

  it('卸下：装备实例（含强化）返回背包，槽位清空；空槽卸下无操作', () => {
    const state = wear(makeState(), 'armor', 'wasteland_armor', 3);
    const r = unequipItemUpdate(state, 'nova', 'armor');
    expect(r.result).toBe(true);
    expect(r.state.equipment.nova.armor).toBeNull();
    // 强化等级随实例保留（ADR-0014 修订）
    expect(r.state.equipmentInventory.wasteland_armor).toEqual([{ itemId: 'wasteland_armor', enhance: 3, mythic: false }]);
    expect(unequipItemUpdate(r.state, 'nova', 'armor').result).toBe(false);
  });
});

describe('强化（上限 +30）', () => {
  it('强化 +1 并按公式消耗强化魔晶', () => {
    const state = wear(makeState({ inventory: { ...INITIAL_STATE.inventory, enhance_stone: 10 } }), 'weapon', 'wasteland_weapon');
    const r = enhanceItemUpdate(state, 'nova', 'weapon');
    expect(r.result).toBe(true);
    expect(r.state.equipment.nova.weapon?.enhance).toBe(1);
    expect(r.state.inventory.enhance_stone).toBe(10 - enhanceCost(0)); // cost(0)=1
    // 再强化一级：cost(1)=1
    const r2 = enhanceItemUpdate(r.state, 'nova', 'weapon');
    expect(r2.state.equipment.nova.weapon?.enhance).toBe(2);
    expect(r2.state.inventory.enhance_stone).toBe(10 - enhanceCost(0) - enhanceCost(1));
  });

  it('强化等级越高消耗越多（cost = 1 + floor(level/5)）', () => {
    expect(enhanceCost(0)).toBe(1);
    expect(enhanceCost(4)).toBe(1);
    expect(enhanceCost(5)).toBe(2);
    expect(enhanceCost(29)).toBe(6);
  });

  it('强化魔晶不足拒绝；神话装备拒绝；+30 封顶', () => {
    const noStone = wear(makeState(), 'weapon', 'wasteland_weapon');
    expect(enhanceItemUpdate(noStone, 'nova', 'weapon').result).toBe('no_stone');

    const mythic = wear(makeState({ inventory: { ...INITIAL_STATE.inventory, enhance_stone: 99 } }), 'weapon', 'wasteland_weapon', 30, true);
    expect(enhanceItemUpdate(mythic, 'nova', 'weapon').result).toBe('mythic');

    const maxed = wear(makeState({ inventory: { ...INITIAL_STATE.inventory, enhance_stone: 99 } }), 'weapon', 'wasteland_weapon', 30);
    expect(enhanceItemUpdate(maxed, 'nova', 'weapon').result).toBe('maxed');
  });

  it('空槽强化返回 no_item', () => {
    expect(enhanceItemUpdate(makeState(), 'nova', 'weapon').result).toBe('no_item');
  });
});

describe('神话锻造（+30 装备）', () => {
  it('+30 装备消耗材料锻造为神话：更名生效、强化等级保留、词条附加', () => {
    const inv = { ...INITIAL_STATE.inventory, ...FORGE_COST };
    const state = wear(makeState({ inventory: inv }), 'weapon', 'ember_weapon', 30);
    const r = forgeMythicUpdate(state, 'nova', 'weapon');
    expect(r.result).toBe(true);
    expect(r.state.equipment.nova.weapon?.mythic).toBe(true);
    expect(r.state.equipment.nova.weapon?.enhance).toBe(30);
    Object.entries(FORGE_COST).forEach(([id, qty]) => {
      expect(r.state.inventory[id]).toBe(inv[id] - qty);
    });
    // 神话词条生效（余烬：生命上限 +5%，与 +30 档特效 +15% 叠加 → 20%）
    expect(getSetBonuses(r.state.equipment.nova).maxHpPercent).toBe(20);
  });

  it('未满 +30 / 材料不足 / 已是神话均拒绝', () => {
    const inv = { ...INITIAL_STATE.inventory, ...FORGE_COST };
    const low = wear(makeState({ inventory: inv }), 'weapon', 'ember_weapon', 29);
    expect(forgeMythicUpdate(low, 'nova', 'weapon').result).toBe('not_maxed');

    const broke = wear(makeState(), 'weapon', 'ember_weapon', 30);
    expect(forgeMythicUpdate(broke, 'nova', 'weapon').result).toBe('no_materials');

    const done = wear(makeState({ inventory: inv }), 'weapon', 'ember_weapon', 30, true);
    expect(forgeMythicUpdate(done, 'nova', 'weapon').result).toBe('already_mythic');
  });
});

describe('属性与套装特效计算', () => {
  it('单件属性 = 基础 + 强化成长；神话整体 ×1.5', () => {
    const base: EquippedItem = { itemId: 'ember_weapon', enhance: 0, mythic: false };
    expect(getEquippedItemStats(base)).toEqual({ attack: 16 });
    const plus5: EquippedItem = { itemId: 'ember_weapon', enhance: 5, mythic: false };
    expect(getEquippedItemStats(plus5)).toEqual({ attack: 23.5 }); // 16 + 1.5*5
    const mythic: EquippedItem = { itemId: 'ember_weapon', enhance: 30, mythic: true };
    expect(getEquippedItemStats(mythic)).toEqual({ attack: (16 + 1.5 * 30) * 1.5 }); // 91.5
  });

  it('三槽平值属性汇总', () => {
    const equip: HeroEquipment = {
      weapon: { itemId: 'wasteland_weapon', enhance: 0, mythic: false },   // attack 10
      armor: { itemId: 'wasteland_armor', enhance: 0, mythic: false },     // defense 6
      trinket: { itemId: 'wasteland_trinket', enhance: 0, mythic: false }  // maxHp 20
    };
    expect(getEquippedFlatStats(equip)).toEqual({ attack: 10, defense: 6, maxHp: 20 });
    expect(getEquippedFlatStats(emptyEquipment())).toEqual({});
  });

  it('套装进度 = 同系列三槽强化总和', () => {
    const equip: HeroEquipment = {
      weapon: { itemId: 'wasteland_weapon', enhance: 10, mythic: false },
      armor: { itemId: 'wasteland_armor', enhance: 4, mythic: false },
      trinket: null
    };
    expect(getSetEnhanceProgress(equip)).toEqual({ wasteland: 14 });
  });

  it('套装特效按 +10/+20/+30 阈值叠加触发', () => {
    const gear10: HeroEquipment = { weapon: { itemId: 'wasteland_weapon', enhance: 10, mythic: false }, armor: null, trinket: null };
    expect(getSetBonuses(gear10)).toEqual({ attackPercent: 5 });

    const gear20: HeroEquipment = { weapon: { itemId: 'wasteland_weapon', enhance: 10, mythic: false }, armor: { itemId: 'wasteland_armor', enhance: 10, mythic: false }, trinket: null };
    expect(getSetBonuses(gear20)).toEqual({ attackPercent: 5, defensePercent: 8 });

    const gear30: HeroEquipment = {
      weapon: { itemId: 'wasteland_weapon', enhance: 10, mythic: false },
      armor: { itemId: 'wasteland_armor', enhance: 10, mythic: false },
      trinket: { itemId: 'wasteland_trinket', enhance: 10, mythic: false }
    };
    expect(getSetBonuses(gear30)).toEqual({ attackPercent: 5, defensePercent: 8, maxHpPercent: 10 });
  });

  it('神话词条：穿戴该系列任意神话装备即生效（与套装特效叠加，每系列仅一次）', () => {
    const equip: HeroEquipment = {
      weapon: { itemId: 'starcore_weapon', enhance: 30, mythic: true },
      armor: null,
      trinket: null
    };
    // 单件 +30 神话：触发全部阈值特效（攻击+10%、防御+12%、生命+18%）+ 神话词条（攻击+5%、防御+5%）
    expect(getSetBonuses(equip)).toEqual({ attackPercent: 15, defensePercent: 17, maxHpPercent: 18 });
  });

  it('神话词条为系列共有：三件神话也只结算一次', () => {
    const equip: HeroEquipment = {
      weapon: { itemId: 'starcore_weapon', enhance: 30, mythic: true },
      armor: { itemId: 'starcore_armor', enhance: 30, mythic: true },
      trinket: { itemId: 'starcore_trinket', enhance: 30, mythic: true }
    };
    // 满编 90：特效攻击+10%、防御+12%、生命+18% + 词条攻击+5%、防御+5%（仅一次）
    expect(getSetBonuses(equip)).toEqual({ attackPercent: 15, defensePercent: 17, maxHpPercent: 18 });
  });

  it('getHeroEquipmentBonus 汇总平值与百分比', () => {
    const equip: HeroEquipment = {
      weapon: { itemId: 'wasteland_weapon', enhance: 10, mythic: false },
      armor: null,
      trinket: null
    };
    expect(getHeroEquipmentBonus(equip)).toEqual({
      flat: { attack: 20 },               // 10 + 1*10
      percent: { attackPercent: 5 }       // 废土 +10 档
    });
  });
});

describe('装备属性在战斗中生效（ticket 10 → 05 集成）', () => {
  const novaLv1 = () => createInitialHero('nova'); // 攻击 35 / 防御 8 / 生命 100

  it('无装备时战斗属性与之前一致（回归）', () => {
    const c = heroToCombatant('nova', novaLv1());
    expect(c.attack).toBe(35);
    expect(c.defense).toBe(8);
    expect(c.maxHp).toBe(100);
    expect(c.hp).toBe(100);
  });

  it('平值属性直接加入战斗数值，当前血量按比例缩放', () => {
    const gear: HeroEquipment = {
      weapon: { itemId: 'ember_weapon', enhance: 0, mythic: false },   // attack +16
      armor: null,
      trinket: { itemId: 'ember_trinket', enhance: 0, mythic: false }  // maxHp +30
    };
    const hero = { ...novaLv1(), hp: 80 }; // 已损 20%
    const c = heroToCombatant('nova', hero, {}, gear);
    expect(c.attack).toBe(35 + 16);
    expect(c.maxHp).toBe(130);
    expect(c.hp).toBe(104); // 80% × 130
  });

  it('套装特效百分比与羁绊百分比叠加生效', () => {
    const gear: HeroEquipment = {
      weapon: { itemId: 'wasteland_weapon', enhance: 10, mythic: false }, // 废土 +10 档：攻击 +5%
      armor: null,
      trinket: null
    };
    const bond = { attackPercent: 10 }; // 羁绊攻击 +10%
    const c = heroToCombatant('nova', novaLv1(), bond, gear);
    // 攻击 = round((35 + 20) × 1.15) = round(63.25) = 63
    expect(c.attack).toBe(63);
  });

  it('满强化 + 神话全套：属性显著放大', () => {
    const gear: HeroEquipment = {
      weapon: { itemId: 'starcore_weapon', enhance: 30, mythic: true },
      armor: { itemId: 'starcore_armor', enhance: 30, mythic: true },
      trinket: { itemId: 'starcore_trinket', enhance: 30, mythic: true }
    };
    const c = heroToCombatant('nova', novaLv1(), {}, gear);
    // 星核满编 90：特效攻击 +10%、防御 +12%、生命 +18%；神话词条（每系列一次）攻击+5% 防御+5%
    expect(c.maxHp).toBe(Math.round((100 + 45 * 3 * 1.5) * 1.18));
    expect(c.attack).toBe(Math.round((35 + (22 + 2 * 30) * 1.5) * 1.15));
    expect(c.defense).toBe(Math.round((8 + (15 + 1 * 30) * 1.5) * 1.17));
  });
});

describe('获取分层：工坊合成与图纸解锁', () => {
  it('废土系列无需图纸即可合成（产出进装备实例背包，ADR-0014 修订）', () => {
    const state = makeState({ inventory: { ...INITIAL_STATE.inventory, scrap_metal: 20, alloy_plate: 10 } });
    const r = craftItemUpdate(state, 'wasteland_weapon_recipe');
    expect(r.result).toBe(true);
    expect(r.state.equipmentInventory.wasteland_weapon).toEqual([{ itemId: 'wasteland_weapon', enhance: 0, mythic: false }]);
  });

  it('余烬系列未获得图纸时拒绝合成，获得图纸后解锁', () => {
    const rich = makeState({ inventory: { ...INITIAL_STATE.inventory, alloy_plate: 20, rusted_spring: 10, mana_dust: 20 } });
    expect(craftItemUpdate(rich, 'ember_weapon_recipe').result).toBe(false);

    const withBlueprint = makeState({ inventory: { ...rich.inventory, blueprint_ember_armory: 1 } });
    const r = craftItemUpdate(withBlueprint, 'ember_weapon_recipe');
    expect(r.result).toBe(true);
    expect(r.state.equipmentInventory.ember_weapon).toEqual([{ itemId: 'ember_weapon', enhance: 0, mythic: false }]);
    // 图纸是知识类物品，不消耗
    expect(r.state.inventory.blueprint_ember_armory).toBe(1);
  });

  it('强化魔晶可工坊合成', () => {
    const state = makeState({ inventory: { ...INITIAL_STATE.inventory, mana_dust: 10, scrap_metal: 10 } });
    const r = craftItemUpdate(state, 'enhance_stone_recipe');
    expect(r.result).toBe(true);
    expect(r.state.inventory.enhance_stone).toBe(1);
  });
});

describe('存档迁移归一化（mergeSavedState）', () => {
  it('损坏存档：强化等级钳制 0-30、非法值归 0、缺失槽位补 null', () => {
    const save = JSON.parse(JSON.stringify(INITIAL_STATE)) as GameState;
    save.equipment = {
      nova: {
        weapon: { itemId: 'ember_weapon', enhance: 99, mythic: 'yes' as unknown as boolean }, // 超上限 + 非布尔
        armor: { itemId: 'ember_armor', enhance: Number.NaN, mythic: false },                   // NaN 强化
        trinket: undefined as unknown as never                                            // 缺失槽位
      }
    };
    const merged = mergeSavedState(save, INITIAL_STATE);
    expect(merged.equipment.nova.weapon).toEqual({ itemId: 'ember_weapon', enhance: 30, mythic: true });
    expect(merged.equipment.nova.armor).toEqual({ itemId: 'ember_armor', enhance: 0, mythic: false });
    expect(merged.equipment.nova.trinket).toBeNull();
  });

  it('旧存档（无 equipment 字段）回退空表', () => {
    const save = JSON.parse(JSON.stringify(INITIAL_STATE)) as GameState;
    delete (save as unknown as Record<string, unknown>).equipment;
    const merged = mergeSavedState(save, INITIAL_STATE);
    expect(merged.equipment).toEqual({});
  });

  it('旧存档 inventory 中的可穿戴装备计数迁移为 +0 实例（ADR-0014 修订）', () => {
    const save = JSON.parse(JSON.stringify(INITIAL_STATE)) as GameState;
    save.inventory = { ...save.inventory, wasteland_weapon: 2, ember_weapon: 1, scrap_metal: 5, enhance_stone: 3 };
    const merged = mergeSavedState(save, INITIAL_STATE);

    expect(merged.equipmentInventory.wasteland_weapon).toHaveLength(2);
    expect(merged.equipmentInventory.wasteland_weapon[0]).toEqual({ itemId: 'wasteland_weapon', enhance: 0, mythic: false });
    expect(merged.equipmentInventory.ember_weapon).toHaveLength(1);
    expect(merged.inventory.wasteland_weapon).toBeUndefined(); // 已移出计数背包
    expect(merged.inventory.ember_weapon).toBeUndefined();
    expect(merged.inventory.scrap_metal).toBe(5);   // 非装备保持计数
    expect(merged.inventory.enhance_stone).toBe(3); // 生态物品保持计数
  });

  it('按 index 穿戴指定强化实例；缺省取最高强化（ADR-0014 修订）', () => {
    const state = {
      ...makeState(),
      equipmentInventory: {
        wasteland_weapon: [
          { itemId: 'wasteland_weapon', enhance: 0, mythic: false },
          { itemId: 'wasteland_weapon', enhance: 10, mythic: false }
        ]
      }
    };

    // 指定 index 1 → 穿 +10，背包剩 +0
    const r = equipItemUpdate(state, 'nova', 'weapon', 'wasteland_weapon', 1);
    expect(r.state.equipment.nova.weapon?.enhance).toBe(10);
    expect(r.state.equipmentInventory.wasteland_weapon).toEqual([{ itemId: 'wasteland_weapon', enhance: 0, mythic: false }]);

    // 缺省 index → 取强化最高者（+10）
    const r2 = equipItemUpdate(state, 'nova', 'weapon', 'wasteland_weapon');
    expect(r2.state.equipment.nova.weapon?.enhance).toBe(10);
  });
});
