import { describe, it, expect } from 'vitest';
import type { GameState } from '../types/game';
import { INITIAL_STATE, createInitialHero } from '../data/initialState';
import { HEROES_CONFIG } from '../data/heroes';
import { COMBAT_ZONES } from '../data/combatZones';
import { COMBAT_CONFIG } from '../data/combatConfig';
import { applyTick } from './tick';
import {
  heroMaxHp,
  heroAttack,
  applyHeroExp,
  simulateBattle,
  startCombatUpdate,
  setPartyUpdate,
  healWoundedHeroUpdate,
  type CombatantState
} from './combat';

const makeState = (overrides?: Partial<GameState>): GameState => ({
  ...INITIAL_STATE,
  ...overrides
});

// 可编程 RNG：按序列依次返回
const sequenceRng = (values: number[]): (() => number) => {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
};

// 构造一个纯战斗单位
const unit = (id: string, hp: number, attack: number, defense: number, name = id): CombatantState => ({
  id, name, emoji: '⚔️', hp, maxHp: hp, attack, defense
});

describe('Hero stat scaling (等级成长)', () => {
  it('scales maxHp and attack with level', () => {
    const cfg = HEROES_CONFIG.nova;
    expect(heroMaxHp(cfg, 1)).toBe(cfg.baseHp);
    expect(heroMaxHp(cfg, 5)).toBe(cfg.baseHp + 4 * COMBAT_CONFIG.hpPerLevel);
    expect(heroAttack(cfg, 5)).toBe(cfg.baseAttack + 4 * COMBAT_CONFIG.attackPerLevel);
  });

  it('applies exp and levels up, growing maxHp and keeping hp delta', () => {
    const hero = createInitialHero('nova');
    const leveled = applyHeroExp(hero, HEROES_CONFIG.nova, COMBAT_CONFIG.expPerLevel * 2);
    expect(leveled.level).toBe(2); // 1→2 需 100 经验，剩余 100 不足以升 3 级
    expect(leveled.exp).toBe(100); // 200 - 100
    expect(leveled.maxHp).toBe(heroMaxHp(HEROES_CONFIG.nova, 2));
    expect(leveled.hp).toBe(hero.hp + (leveled.maxHp - hero.maxHp)); // 保留当前血量差值
  });
});

describe('simulateBattle (轮询回合制)', () => {
  it('heroes and enemies act in fixed round-robin order each round', () => {
    // 敌人血量极高，保证打满一整个回合
    const heroes = [unit('nova', 200, 5, 0, '诺娃'), unit('buster', 200, 5, 0, '巴斯特')];
    const enemies = [unit('e1', 999, 1, 0, '敌人1')];
    const { victory, partyWiped, actions, rounds } = simulateBattle(heroes, enemies);
    expect(victory).toBe(false);
    expect(partyWiped).toBe(false); // 回合上限双方存活 → 平局（不触发重伤）
    // 每回合固定顺序：诺娃 → 巴斯特 → 敌人1
    const firstRound = actions.slice(0, 3);
    expect(firstRound[0]).toMatchObject({ round: 1, actorSide: 'hero', actorId: 'nova' });
    expect(firstRound[1]).toMatchObject({ round: 1, actorSide: 'hero', actorId: 'buster' });
    expect(firstRound[2]).toMatchObject({ round: 1, actorSide: 'enemy', actorId: 'e1' });
    expect(rounds).toBe(COMBAT_CONFIG.maxBattleRounds);
  });

  it('victory when all enemies are defeated', () => {
    const heroes = [unit('nova', 100, 35, 8, '诺娃')];
    const enemies = [unit('hound', 45, 9, 3, '废土鬣狗')];
    const { victory, rounds } = simulateBattle(heroes, enemies);
    expect(victory).toBe(true);
    expect(rounds).toBe(2);
  });

  it('defeat when all heroes are defeated', () => {
    const heroes = [unit('nova', 10, 5, 0, '诺娃')];
    const enemies = [unit('boss', 200, 30, 0, '强敌')];
    const { victory, partyWiped } = simulateBattle(heroes, enemies);
    expect(victory).toBe(false);
    expect(partyWiped).toBe(true);
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
      soulEchoes: 0,
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
    expect(next.soulEchoes).toBe(zone.soulEchoMax);
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
      inventory: { scrap_metal: 5 },
      soulEchoes: 5,
      party: ['nova'],
      heroes: { nova: createInitialHero('nova') },
      combat: { ...INITIAL_STATE.combat, zonesCleared: ['wasteland_entrance', 'old_town_ruins'] }
    });
    // 让诺娃打辐射车间（三人敌人）必然战败
    const { state: next, result } = startCombatUpdate(state, 'radiated_workshop');

    expect(result.settlement!.battle.victory).toBe(false);
    expect(next.stamina).toBe(30 - COMBAT_ZONES.radiated_workshop.staminaCost);
    expect(next.heroes.nova.wounded).toBe(true);
    expect(next.heroes.nova.hp).toBe(0);
    expect(next.inventory.scrap_metal).toBe(5); // 无掉落
    expect(next.soulEchoes).toBe(5);           // 无灵魂残响
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

describe('Stamina regen (体力随时间恢复)', () => {
  it('recovers stamina over elapsed ticks and caps at max', () => {
    const state = makeState({ stamina: 0 });
    const after3s = applyTick(state, state.lastTick + 3000);
    expect(after3s.stamina).toBeCloseTo(1);

    const full = applyTick(makeState({ stamina: COMBAT_CONFIG.maxStamina }), state.lastTick + 3000);
    expect(full.stamina).toBe(COMBAT_CONFIG.maxStamina);
  });
});
