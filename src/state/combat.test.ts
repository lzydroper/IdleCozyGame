import { describe, it, expect } from 'vitest';
import type { GameState } from '../types/game';
import { INITIAL_STATE, createInitialHero } from '../data/initialState';
import { HEROES_CONFIG } from '../data/heroes';
import { COMBAT_CONFIG } from '../data/combatConfig';
import { applyTick } from './tick';
import { heroBaseAttributes } from '../data/heroGrowth';
import {
  applyHeroExp,
  consumeExpTomesUpdate,
  setPartyUpdate,
  healWoundedHeroUpdate,
  healWoundedHeroesUpdate,
  heroToCombatant,
  enemyConfigToEntity,
  simulateBattle,
  createBattle,
  canActWithBuffs
} from './combat';
import { ENEMY_CONFIGS } from '../data/enemies';
import { createBattleContext, type BattleContext } from './battleContext';
import { BUFF_CONFIGS } from './buffTypes';
import { createBuffTriggerHooks } from './buffRuntime';
import { createTurnRuntime, type BattleEvent, type BattleUnitRuntime, type BattleUnitSnapshot, type TurnRuntime } from './turnEngine';

describe('BattleEntity 装配（统一实体）', () => {
  it('heroToCombatant 产出 BattleEntity，英雄专属字段已结算进配方', () => {
    const e = heroToCombatant('nova', createInitialHero('nova'));
    expect(e.kind).toBe('hero');
    expect(e.side).toBe('hero');
    expect(e.abilities.length).toBeGreaterThan(0);
    expect(e.recipe.baseAttributes.maxHp).toBeGreaterThan(0);
  });

  it('enemyConfigToEntity 与英雄同走实体工厂，role/faction/普通攻击兜底正确', () => {
    const e = enemyConfigToEntity(ENEMY_CONFIGS.wasteland_hound);
    expect(e.kind).toBe('enemy');
    expect(e.role).toBe('normal');
    expect(e.side).toBe('enemy');
    expect(e.faction).toBe('nightmare');
    expect(e.abilities.length).toBeGreaterThan(0);
  });

  it('createBattle 装配工厂可直接 run 并暴露战斗上下文', () => {
    const hero = heroToCombatant('nova', createInitialHero('nova'));
    const enemy = enemyConfigToEntity(ENEMY_CONFIGS.test_dummy);
    const battle = createBattle([hero, enemy]);
    const result = battle.run();
    expect(result.victory).toBe(true);
    expect(battle.context).toBeDefined();
  });
});

const makeState = (overrides?: Partial<GameState>): GameState => ({
  ...INITIAL_STATE,
  ...overrides
});

const fakeTurnRuntime = (): TurnRuntime => ({
  round: 0,
  rng: () => 0.5,
  register: () => () => {},
  unregister: () => () => {},
  dispatchEvent: (): BattleEvent => ({ seq: 0, round: 0, key: '', unitId: null, sourceId: null, targetId: null, unitName: null, sourceName: null, targetName: null, data: {} }),
  dealDamage: () => 0,
  applyHeal: () => 0,
  applyHpDelta: () => 0,
  updateInitiative: () => {},
  summonUnit: (): BattleUnitRuntime => ({ id: '', name: '', side: 'hero', hp: 0, maxHp: 0, initiative: 0, abilities: [], stats: { attack: 0, defense: 0, maxHp: 0, maxMp: 0, critRate: 0, critDmg: 1.5 }, entryOrder: 0 }),
  requestEnd: () => {},
  getUnit: () => undefined,
  getLivingUnits: () => []
});

describe('canActWithBuffs', () => {
  it('眩晕 duration 大于 0 时不可行动，归零后恢复', () => {
    const ctx = createBattleContext(fakeTurnRuntime());
    expect(canActWithBuffs(ctx, 'b')).toBe(true);
    ctx.applyBuff('b', { id: 'stun-1', buffId: 'stun', sourceId: 'a', targetId: 'b', stacks: 1, duration: 1, values: {} });
    expect(canActWithBuffs(ctx, 'b')).toBe(false);
    ctx.getBuff('b', 'stun')!.duration = 0;
    expect(canActWithBuffs(ctx, 'b')).toBe(true);
  });

  it('真实回合引擎：眩晕 duration=N 严格跳过 N 个自身回合（快照制判定）', () => {
    const hero: BattleUnitSnapshot = {
      id: 'a', name: 'a', side: 'hero', hp: 100, maxHp: 100, initiative: 100, abilities: [],
      stats: { attack: 10, defense: 0, maxHp: 100, maxMp: 0, critRate: 0, critDmg: 1.5, willpower: 0, durationReduction: 0, effectReduction: 0 }
    };
    const enemy: BattleUnitSnapshot = {
      id: 'b', name: 'b', side: 'enemy', hp: 100, maxHp: 100, initiative: 100, abilities: [],
      stats: { attack: 10, defense: 0, maxHp: 100, maxMp: 0, critRate: 0, critDmg: 1.5, willpower: 0, durationReduction: 0, effectReduction: 0 }
    };
    const actions: string[] = [];
    let ctx!: BattleContext;

    // 装配前移（combat-assembly 01）：context 与眩晕 Buff 在 run 前就绪。
    const engine = createTurnRuntime([hero, enemy], {
      maxRounds: 3,
      rng: () => 0.5,
      canAct: (unit) => canActWithBuffs(ctx, unit.id),
      performAction: (unit) => { actions.push(unit.id); }
    });
    ctx = createBattleContext(engine, BUFF_CONFIGS, createBuffTriggerHooks(() => ctx));
    ctx.applyBuff('b', {
      id: 'stun-1', buffId: 'stun', sourceId: 'a', targetId: 'b',
      stacks: 1, duration: 2, values: {}
    });
    engine.run();

    // 快照制（combat-aftermath 02 D1）：先判定后递减。
    // r1: a 行动，b 快照见 dur=2 跳过 → 递减为 1；r2: a 行动，b 见 1 跳过 → 归零移除；r3: b 恢复行动。
    expect(actions).toEqual(['a', 'a', 'a', 'b']);
    expect(ctx.getBuff('b', 'stun')).toBeUndefined();
  });
});


describe('simulateBattle 走 Effect 结算', () => {
  it('事件流包含 effectApplied 伤害/治疗完成事件', () => {
    const hero = heroToCombatant('nova', createInitialHero('nova'));
    const enemy = enemyConfigToEntity(ENEMY_CONFIGS.test_dummy);
    const battle = simulateBattle([hero], [enemy]);
    expect(battle.events.some(e => e.key === 'effectApplied' && e.data.kind === 'damage')).toBe(true);
  });
});

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
