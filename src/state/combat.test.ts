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
  heroToCombatant,
  type CombatantState
} from './combat';
import { STAR_MAX } from '../data/awakening';

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
  id, name, hp, maxHp: hp, attack, defense
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

  it('records an hpTrack snapshot per action for HP bar playback (ticket 21)', () => {
    const heroes = [unit('nova', 100, 35, 8, '诺娃')];
    const enemies = [unit('hound', 45, 9, 3, '废土鬣狗')];
    const { actions, hpTrack, victory } = simulateBattle(heroes, enemies);

    expect(hpTrack).toBeDefined();
    // 初始满血快照 + 每动作一帧
    expect(hpTrack!.length).toBe(actions.length + 1);
    // 首帧：双方满血
    expect(hpTrack![0]).toMatchObject([
      { id: 'nova', side: 'hero', hp: 100, maxHp: 100 },
      { id: 'hound', side: 'enemy', hp: 45, maxHp: 45 }
    ]);
    // 逐帧与动作一一对应：第 i+1 帧 = 第 i 帧应用 actions[i] 后的状态
    for (let i = 0; i < actions.length; i++) {
      const before = hpTrack![i];
      const after = hpTrack![i + 1];
      const action = actions[i];
      // 攻击/技能：目标血量减少恰好 damage；其余参战者不变
      const targetBefore = before.find(x => x.name === action.targetName)!;
      const targetAfter = after.find(x => x.name === action.targetName)!;
      if (action.kind === 'heal') {
        expect(targetAfter.hp).toBe(targetBefore.hp + action.damage);
      } else {
        expect(targetAfter.hp).toBe(Math.max(0, targetBefore.hp - action.damage));
      }
      for (const entry of before) {
        if (entry.name === action.targetName) continue;
        const afterEntry = after.find(x => x.name === entry.name)!;
        expect(afterEntry.hp).toBe(entry.hp);
      }
    }
    // 末帧与胜负一致：胜利 → 敌人 hp 归零
    expect(victory).toBe(true);
    const last = hpTrack![hpTrack!.length - 1];
    expect(last.find(x => x.side === 'enemy')!.hp).toBe(0);
    expect(last.find(x => x.side === 'hero')!.hp).toBeGreaterThan(0);
  });

  it('hpTrack stays in sync for aoe multi-target and heal actions (ticket 21)', () => {
    // aoe 技能：一次行动对全部存活敌人造成伤害
    const nova = heroToCombatant('nova', { ...createInitialHero('nova'), star: STAR_MAX, awakened: true });
    const enemies = [
      { id: 'e1', name: '靶子甲', hp: 500, maxHp: 500, attack: 1, defense: 0 },
      { id: 'e2', name: '靶子乙', hp: 500, maxHp: 500, attack: 1, defense: 0 }
    ];
    const aoeResult = simulateBattle([nova], enemies, 1);
    expect(aoeResult.hpTrack!.length).toBe(aoeResult.actions.length + 1);
    // 第一回合的两个 aoe 动作：每个目标各扣一次，且两次扣血互不影响其他目标
    const round1 = aoeResult.actions.filter(a => a.round === 1 && a.kind === 'skill');
    expect(round1).toHaveLength(2);
    const frame1 = aoeResult.hpTrack![1].find(x => x.id === 'e1')!;
    const frame2 = aoeResult.hpTrack![2].find(x => x.id === 'e1')!;
    const frame2e2 = aoeResult.hpTrack![2].find(x => x.id === 'e2')!;
    expect(frame1.hp).toBe(500 - round1[0].damage);
    expect(frame2.hp).toBe(frame1.hp); // 第二次 aoe 打 e2，e1 不再变化
    expect(frame2e2.hp).toBe(500 - round1[1].damage);

    // heal 技能：自身治疗 → 血量反弹，帧差为正
    const healer = heroToCombatant('healer', { ...createInitialHero('healer'), star: STAR_MAX, awakened: true, hp: 50 });
    const healEnemies = [{ id: 'e1', name: '靶子', hp: 500, maxHp: 500, attack: 1, defense: 0 }];
    const healResult = simulateBattle([healer], healEnemies, 1);
    const healAction = healResult.actions.find(a => a.kind === 'heal')!;
    expect(healAction).toBeDefined();
    const healIdx = healResult.actions.indexOf(healAction);
    const heroBefore = healResult.hpTrack![healIdx].find(x => x.id === 'healer')!;
    const heroAfter = healResult.hpTrack![healIdx + 1].find(x => x.id === 'healer')!;
    expect(heroAfter.hp).toBe(heroBefore.hp + healAction.damage); // 治疗帧血量上升
    expect(heroAfter.hp).toBeLessThanOrEqual(heroAfter.maxHp);
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
