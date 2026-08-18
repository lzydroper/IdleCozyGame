import { describe, it, expect } from 'vitest';
import type { GameState } from '../types/game';
import { INITIAL_STATE, createInitialHero } from '../data/initialState';
import { HEROES_CONFIG } from '../data/heroes';
import { COMBAT_ZONES } from '../data/combatZones';
import { COMBAT_CONFIG } from '../data/combatConfig';
import { applyTick } from './tick';
import { heroBaseAttributes } from '../data/heroGrowth';
import {
  applyHeroExp,
  consumeExpTomesUpdate,
  startCombatUpdate,
  setPartyUpdate,
  healWoundedHeroUpdate,
  healWoundedHeroesUpdate,
  heroToCombatant,
  recomputeCombatant,
  combatantFromSnapshot,
  type CombatantState,
  type CombatantSnapshot
} from './combat';
import { DEFAULT_PRIMARY_ATTRIBUTES, DEFAULT_SPECIAL_ATTRIBUTES } from '../data/statConfig';
import type { ActiveBuff } from './buffSystem';

describe('recomputeCombatant (B 方案：可重算快照)', () => {
  it('无 buff 时重算 = 入场值（幂等）', () => {
    const c = heroToCombatant('nova', createInitialHero('nova'));
    const r = recomputeCombatant(c, []);
    expect(r.attack).toBe(c.attack);
    expect(r.defense).toBe(c.defense);
    expect(r.maxHp).toBe(c.maxHp);
    expect(r.hp).toBe(c.hp);
  });

  it('buff 变化 → 面板重算（percent 加算 + 元属性折算 + hp 比例缩放）', () => {
    const c = heroToCombatant('nova', createInitialHero('nova'));
    const buffs: ActiveBuff[] = [
      {
        id: 'b1',
        name: '狂暴',
        type: 'buff',
        duration: 3,
        maxDuration: 3,
        statModifiers: [
          { stat: 'attack', kind: 'percent', value: 0.20 },
          { stat: 'maxHp', kind: 'percent', value: 0.10 },
          { stat: 'strength', kind: 'flat', value: 5 }
        ]
      }
    ];
    const r = recomputeCombatant(c, buffs);
    // 力量 7 + 5 = 12 → 攻击 35 + 24 = 59；×1.2 = 70.8 → 71
    expect(r.attack).toBe(71);
    // maxHp = 130 × 1.1 = 143
    expect(r.maxHp).toBe(143);
    // 满血比例不变
    expect(r.hp).toBe(143);
  });

  it('debuff 经意志减免后生效（力量越强减免越多）', () => {
    const c = heroToCombatant('nova', createInitialHero('nova')); // nova 意志 1 → effectReduction 0.5%
    const debuffs: ActiveBuff[] = [
      {
        id: 'd1',
        name: '虚弱',
        type: 'debuff',
        duration: 3,
        maxDuration: 3,
        statModifiers: [{ stat: 'attack', kind: 'flat', value: -40 }]
      }
    ];
    const r = recomputeCombatant(c, debuffs);
    // 减免 40 × (1 - 0.005) = 39.8 → attack = (49 - 39.8) = 9.2 → round 9
    expect(r.attack).toBe(9);
  });

  it('无快照的单位（敌人/手动构造）原样返回', () => {
    const enemy: CombatantState = { id: 'e', name: '敌', hp: 50, maxHp: 50, attack: 5, defense: 2 };
    expect(recomputeCombatant(enemy, [])).toBe(enemy);
  });
});

describe('统一实体：敌人与英雄同走 statSystem 配方（stat-bonus-unification）', () => {
  it('敌人式配方（元属性全 0）→ 面板 = 配置值，快照可重算且幂等', () => {
    const snapshot: CombatantSnapshot = {
      baseAttributes: { attack: 20, defense: 8, maxHp: 150, maxMp: 0, critRate: 0, critDmg: 1.5 },
      primaryAttributes: { ...DEFAULT_PRIMARY_ATTRIBUTES },
      specialAttributes: { ...DEFAULT_SPECIAL_ATTRIBUTES },
      permanentModifiers: []
    };
    const e = combatantFromSnapshot('mutant', '畸变体', snapshot);
    expect(e.attack).toBe(20);
    expect(e.defense).toBe(8);
    expect(e.maxHp).toBe(150);
    expect(e.hp).toBe(150); // 满血进场
    expect(e.snapshot).toBeDefined(); // 敌人也带快照（统一实体）
    // 无 buff 重算 = 入场值（幂等）
    const r = recomputeCombatant(e, []);
    expect(r.attack).toBe(e.attack);
    expect(r.defense).toBe(e.defense);
    expect(r.maxHp).toBe(e.maxHp);
    expect(r.hp).toBe(e.hp);
  });

  it('敌人配置扩展属性走同一管道：元属性折算/修饰符/debuff 全部生效', () => {
    const snapshot: CombatantSnapshot = {
      baseAttributes: { attack: 20, defense: 8, maxHp: 150, maxMp: 0, critRate: 0, critDmg: 1.5 },
      primaryAttributes: { ...DEFAULT_PRIMARY_ATTRIBUTES, strength: 5 }, // 力量 5 → 攻击 +10
      specialAttributes: { ...DEFAULT_SPECIAL_ATTRIBUTES },
      permanentModifiers: [{ stat: 'maxHp', kind: 'percent', value: 0.2 }]
    };
    const e = combatantFromSnapshot('mutant', '畸变体', snapshot);
    expect(e.attack).toBe(30); // 20 + 5×2（元属性折算对敌人同样生效）
    expect(e.maxHp).toBe(180); // 150 × 1.2
    // 敌人也会被 debuff：意志 0 → 无减免，-10 全额生效
    const debuffed = recomputeCombatant(e, [
      {
        id: 'd1',
        name: '虚弱',
        type: 'debuff',
        duration: 2,
        maxDuration: 2,
        statModifiers: [{ stat: 'attack', kind: 'flat', value: -10 }]
      }
    ]);
    expect(debuffed.attack).toBe(20);
  });
});

const makeState = (overrides?: Partial<GameState>): GameState => ({
  ...INITIAL_STATE,
  ...overrides
});

// 可编程 RNG：按序列依次返回
const sequenceRng = (values: number[]): (() => number) => {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
};


describe('Hero stat scaling (等级成长，16 号：职阶系数 + 里程碑)', () => {
  it('scales maxHp / attack / defense with level by class growth', () => {
    const cfg = HEROES_CONFIG.nova; // attacker：每级 生命 +3 / 攻击 +3 / 防御 +1
    expect(heroBaseAttributes(cfg, 1).maxHp).toBe(cfg.baseAttributes.maxHp);
    expect(heroBaseAttributes(cfg, 5).maxHp).toBe(cfg.baseAttributes.maxHp + 4 * 3);
    expect(heroBaseAttributes(cfg, 5).attack).toBe(cfg.baseAttributes.attack + 4 * 3);
    expect(heroBaseAttributes(cfg, 5).defense).toBe(cfg.baseAttributes.defense + 4 * 1);
  });

  it('heroBaseAttributes no longer includes milestone bonus (milestones走modifier管道, 04号)', () => {
    const cfg = HEROES_CONFIG.nova; // { 10: { attack: 5 }, 20: { critRate: 0.02 } }
    // heroBaseAttributes 只含职阶成长，不含里程碑
    expect(heroBaseAttributes(cfg, 9).attack).toBe(cfg.baseAttributes.attack + 8 * 3);
    expect(heroBaseAttributes(cfg, 10).attack).toBe(cfg.baseAttributes.attack + 9 * 3); // 不含 +5
    expect(heroBaseAttributes(cfg, 25).attack).toBe(cfg.baseAttributes.attack + 24 * 3); // 不含 +5
    expect(heroBaseAttributes(cfg, 20).critRate).toBe(0.05 + 19 * 0.002); // 不含 +0.02
  });

  it('applies exp and levels up, growing maxHp and keeping hp delta', () => {
    const hero = createInitialHero('nova');
    const leveled = applyHeroExp(hero, HEROES_CONFIG.nova, COMBAT_CONFIG.expPerLevel * 2);
    expect(leveled.level).toBe(2); // 1→2 需 100 经验，剩余 100 不足以升 3 级
    expect(leveled.exp).toBe(100); // 200 - 100
    expect(leveled.maxHp).toBe(heroBaseAttributes(HEROES_CONFIG.nova, 2).maxHp);
    expect(leveled.hp).toBe(hero.hp + (leveled.maxHp - hero.maxHp)); // 保留当前血量差值
  });
});

describe('startCombatUpdate (开战校验与结算)', () => {
  it('rejects unknown zone without state change', () => {
    const state = makeState();
    const { state: next, result } = startCombatUpdate(state, 'unknown_zone');
    expect(result.failure).toBe('unknown_zone');
    expect(next).toBe(state);
  });

  it('rejects battle when stamina is insufficient', () => {
    const state = makeState({ stamina: COMBAT_ZONES.wasteland_entrance.staminaCost - 1 });
    const { state: next, result } = startCombatUpdate(state, 'wasteland_entrance');
    expect(result.failure).toBe('no_stamina');
    expect(next).toBe(state);
  });

  it('rejects battle when party is empty', () => {
    const state = makeState({ party: [] });
    const { state: next, result } = startCombatUpdate(state, 'wasteland_entrance');
    expect(result.failure).toBe('no_party');
    expect(next).toBe(state);
  });

  it('rejects battle when a party hero is wounded', () => {
    const state = makeState({
      heroes: { nova: { ...createInitialHero('nova'), wounded: true } }
    });
    const { state: next, result } = startCombatUpdate(state, 'wasteland_entrance');
    expect(result.failure).toBe('wounded');
    expect(next).toBe(state);
  });

  it('victory: grants drops, soul echoes, exp, consumes stamina and heals party to full', () => {
    const state = makeState({
      stamina: 50,
      inventory: { scrap_metal: 0 },
      party: ['nova', 'buster'],
      heroes: {
        nova: { ...createInitialHero('nova'), hp: 30 },
        buster: { ...createInitialHero('buster'), hp: 40 }
      }
    });
    // rng 序列：掉落判定命中 + 数量取 maxQty（每次调 2 次）+ 灵魂残响取 max
    const rng = sequenceRng([0.1, 0.99, 0.1, 0.99, 0.99]);
    const { state: next, result } = startCombatUpdate(state, 'wasteland_entrance', rng);

    expect(result.settlement).not.toBeNull();
    expect(result.settlement!.battle.victory).toBe(true);
    expect(result.failure).toBeUndefined();

    const zone = COMBAT_ZONES.wasteland_entrance;
    expect(next.stamina).toBe(50 - zone.staminaCost);
    // 掉落入账
    expect(next.inventory.scrap_metal).toBe(2);   // 命中 + maxQty
    expect(next.inventory.glow_fiber).toBe(2);    // 命中 + maxQty
    // 灵魂残响入账
    expect(next.inventory.soul_echo).toBe(zone.soulEchoMax);
    // 经验入账：两位上阵英雄都获得 expReward，战后再恢复满血
    expect(next.heroes.nova.exp).toBe(zone.expReward);
    expect(next.heroes.buster.exp).toBe(zone.expReward);
    expect(next.heroes.nova.hp).toBe(next.heroes.nova.maxHp);
    expect(next.heroes.buster.hp).toBe(next.heroes.buster.maxHp);
    // 战斗状态记录
    expect(next.combat.zoneId).toBe('wasteland_entrance');
    expect(next.combat.lastSettlement?.drops.scrap_metal).toBe(2);
    // 战斗日志入账
    expect(next.logs[0].type).toBe('combat');
  });

  it('defeat: wounds the whole party, no drops or exp, stamina still consumed', () => {
    const state = makeState({
      stamina: 30,
      inventory: { scrap_metal: 5, soul_echo: 5 },
      party: ['nova'],
      heroes: { nova: { ...createInitialHero('nova'), hp: 5 } }, // 残血进场（战斗 hp ≈ 7），三人敌人必败
      combat: { ...INITIAL_STATE.combat, zonesCleared: ['wasteland_entrance', 'old_town_ruins'] }
    });
    // 让残血的诺娃打辐射车间（三人敌人）必然战败
    const { state: next, result } = startCombatUpdate(state, 'radiated_workshop');

    expect(result.settlement!.battle.victory).toBe(false);
    expect(next.stamina).toBe(30 - COMBAT_ZONES.radiated_workshop.staminaCost);
    expect(next.heroes.nova.wounded).toBe(true);
    expect(next.heroes.nova.hp).toBe(0);
    expect(next.inventory.scrap_metal).toBe(5); // 无掉落
    expect(next.inventory.soul_echo).toBe(5);   // 无灵魂残响
    expect(next.heroes.nova.exp).toBe(0);      // 无经验
    expect(result.settlement!.woundedHeroIds).toEqual(['nova']);
  });
});

describe('setPartyUpdate (上阵队伍管理)', () => {
  it('sets a valid party of up to 3 heroes', () => {
    const state = makeState({
      heroes: {
        nova: createInitialHero('nova'),
        buster: createInitialHero('buster'),
        soldier: createInitialHero('soldier')
      }
    });
    const { state: next, result } = setPartyUpdate(state, ['nova', 'buster', 'soldier']);
    expect(result).toBe(true);
    expect(next.party).toEqual(['nova', 'buster', 'soldier']);
  });

  it('rejects more than 3 heroes', () => {
    const state = makeState();
    const { state: next, result } = setPartyUpdate(state, ['nova', 'buster', 'soldier', 'catherine']);
    expect(result).toBe(false);
    expect(next).toBe(state);
  });

  it('rejects duplicate hero ids', () => {
    const state = makeState();
    const { state: next, result } = setPartyUpdate(state, ['nova', 'nova']);
    expect(result).toBe(false);
    expect(next).toBe(state);
  });

  it('rejects unknown hero ids', () => {
    const state = makeState();
    const { state: next, result } = setPartyUpdate(state, ['ghost']);
    expect(result).toBe(false);
    expect(next).toBe(state);
  });

  it('rejects wounded heroes (禁止上阵)', () => {
    const state = makeState({
      heroes: { nova: { ...createInitialHero('nova'), wounded: true } }
    });
    const { state: next, result } = setPartyUpdate(state, ['nova']);
    expect(result).toBe(false);
    expect(next).toBe(state);
  });

  it('rejects heroes on logistics duty (驻守中不可上阵，与后勤互斥)', () => {
    const state = makeState({
      heroes: {
        nova: { ...createInitialHero('nova'), logisticsFacilityId: { type: 'waterer', targetId: 'greenhouse' } }
      }
    });
    const { state: next, result } = setPartyUpdate(state, ['nova']);
    expect(result).toBe(false);
    expect(next).toBe(state);
  });
});

describe('healWoundedHeroUpdate (纳米修复剂治愈重伤)', () => {
  it('consumes one nanite_injector and cures the wounded hero, restoring hp', () => {
    const state = makeState({
      inventory: { nanite_injector: 2 },
      heroes: { nova: { ...createInitialHero('nova'), hp: 0, wounded: true } }
    });
    const { state: next, result } = healWoundedHeroUpdate(state, 'nova');
    expect(result).toBe(true);
    expect(next.inventory.nanite_injector).toBe(1);
    expect(next.heroes.nova.wounded).toBe(false);
    expect(next.heroes.nova.hp).toBe(next.heroes.nova.maxHp);
  });

  it('fails without enough nanite_injector', () => {
    const state = makeState({
      inventory: {},
      heroes: { nova: { ...createInitialHero('nova'), hp: 0, wounded: true } }
    });
    const { state: next, result } = healWoundedHeroUpdate(state, 'nova');
    expect(result).toBe(false);
    expect(next).toBe(state);
  });

  it('fails for a hero that is not wounded', () => {
    const state = makeState({ inventory: { nanite_injector: 1 } });
    const { state: next, result } = healWoundedHeroUpdate(state, 'nova');
    expect(result).toBe(false);
    expect(next).toBe(state);
  });

  it('fails for an unknown hero', () => {
    const state = makeState({ inventory: { nanite_injector: 1 } });
    const { state: next, result } = healWoundedHeroUpdate(state, 'ghost');
    expect(result).toBe(false);
    expect(next).toBe(state);
  });
});

describe('healWoundedHeroesUpdate (纳米修复剂批量治愈重伤, ADR-0016)', () => {
  it('consumes one injector per selected hero and cures them all', () => {
    const state = makeState({
      inventory: { nanite_injector: 3 },
      heroes: {
        nova: { ...createInitialHero('nova'), hp: 0, wounded: true },
        buster: { ...createInitialHero('buster'), hp: 5, wounded: true },
        soldier: { ...createInitialHero('soldier'), hp: 100, wounded: false }
      }
    });
    const { state: next, result } = healWoundedHeroesUpdate(state, ['nova', 'buster']);
    expect(result).toBe(true);
    expect(next.inventory.nanite_injector).toBe(1); // 3 - 2
    expect(next.heroes.nova.wounded).toBe(false);
    expect(next.heroes.nova.hp).toBe(next.heroes.nova.maxHp);
    expect(next.heroes.buster.wounded).toBe(false);
    expect(next.heroes.buster.hp).toBe(next.heroes.buster.maxHp);
    expect(next.heroes.soldier.wounded).toBe(false); // 未勾选不受影响
  });

  it('fails without enough injectors and leaves state unchanged', () => {
    const state = makeState({
      inventory: { nanite_injector: 1 },
      heroes: {
        nova: { ...createInitialHero('nova'), hp: 0, wounded: true },
        buster: { ...createInitialHero('buster'), hp: 0, wounded: true }
      }
    });
    const { state: next, result } = healWoundedHeroesUpdate(state, ['nova', 'buster']);
    expect(result).toBe(false);
    expect(next).toBe(state);
  });

  it('fails when a selected hero is not wounded', () => {
    const state = makeState({
      inventory: { nanite_injector: 2 },
      heroes: {
        nova: { ...createInitialHero('nova'), hp: 0, wounded: true },
        buster: { ...createInitialHero('buster'), hp: 100, wounded: false }
      }
    });
    const { state: next, result } = healWoundedHeroesUpdate(state, ['nova', 'buster']);
    expect(result).toBe(false);
    expect(next).toBe(state);
  });

  it('fails for empty selection', () => {
    const state = makeState({ inventory: { nanite_injector: 1 } });
    const { state: next, result } = healWoundedHeroesUpdate(state, []);
    expect(result).toBe(false);
    expect(next).toBe(state);
  });

  it('deduplicates repeated ids and consumes once per hero', () => {
    const state = makeState({
      inventory: { nanite_injector: 2 },
      heroes: { nova: { ...createInitialHero('nova'), hp: 0, wounded: true } }
    });
    const { state: next, result } = healWoundedHeroesUpdate(state, ['nova', 'nova']);
    expect(result).toBe(true);
    expect(next.inventory.nanite_injector).toBe(1); // 重复 id 只消耗 1 支
    expect(next.heroes.nova.wounded).toBe(false);
  });
});

describe('Stamina regen (体力随时间恢复)', () => {
  it('recovers stamina over elapsed ticks and caps at max', () => {
    const state = makeState({ stamina: 0 });
    const after3s = applyTick(state, state.lastTick + 3000);
    expect(after3s.stamina).toBeCloseTo(1);

    const full = applyTick(makeState({ stamina: COMBAT_CONFIG.maxStamina }), state.lastTick + 3000);
    expect(full.stamina).toBe(COMBAT_CONFIG.maxStamina);
  });
});

describe('consumeExpTomesUpdate（15 号：经验手册升级）', () => {
  // 每本经验 = ITEMS_CONFIG.exp_tome.useEffect.heroExp = 100

  it('消耗 1 本 → 100 经验 → Lv.1 升到 Lv.2，天赋点 +1', () => {
    const state = makeState({ inventory: { exp_tome: 1 }, heroes: { nova: createInitialHero('nova') } });
    const r = consumeExpTomesUpdate(state, 'nova', 1);

    expect(r.result).toBe(true);
    expect(r.state.inventory.exp_tome).toBe(0);
    expect(r.state.heroes.nova.level).toBe(2);
    expect(r.state.heroes.nova.exp).toBe(0); // 100 经验正好升一级
    expect(r.state.heroes.nova.talentPoints).toBe(1);
  });

  it('消耗 2 本 → 200 经验 → Lv.2 剩 100（溢出自动累计）', () => {
    const state = makeState({ inventory: { exp_tome: 2 }, heroes: { nova: createInitialHero('nova') } });
    const r = consumeExpTomesUpdate(state, 'nova', 2);

    expect(r.state.heroes.nova.level).toBe(2);
    expect(r.state.heroes.nova.exp).toBe(100);
    expect(r.state.inventory.exp_tome).toBe(0);
  });

  it('手册不足 / 无手册 / 未知英雄 → 状态不变', () => {
    const s1 = makeState({ inventory: { exp_tome: 1 }, heroes: { nova: createInitialHero('nova') } });
    expect(consumeExpTomesUpdate(s1, 'nova', 2).state).toBe(s1);

    const s2 = makeState({ inventory: {}, heroes: { nova: createInitialHero('nova') } });
    expect(consumeExpTomesUpdate(s2, 'nova', 1).state).toBe(s2);

    const s3 = makeState();
    expect(consumeExpTomesUpdate(s3, 'ghost', 1).state).toBe(s3);
  });
});
