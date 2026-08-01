import { describe, it, expect } from 'vitest';
import type { GameState } from '../types/game';
import { INITIAL_STATE, createInitialHero } from '../data/initialState';
import { HEROES_CONFIG, HERO_FACTION_LABELS } from '../data/heroes';
import { BONDS, formatBonus } from '../data/bonds';
import type { HeroFaction } from '../types/game';
import { getActiveBonds, aggregateBonus } from './bonds';
import { heroToCombatant, simulateBattle, startBossBattleUpdate, startCombatUpdate } from './combat';
import { COMBAT_ZONES } from '../data/combatZones';

const makeState = (overrides?: Partial<GameState>): GameState => ({
  ...INITIAL_STATE,
  ...overrides
});

const owned = (ids: string[], party: string[]): Partial<GameState> => ({
  heroes: Object.fromEntries(ids.map(id => [id, createInitialHero(id)])),
  party
});

describe('Bond data (羁绊表数据驱动配置)', () => {
  it('has at least 2 example bonds, each with id/name/description and a numeric bonus', () => {
    expect(BONDS.length).toBeGreaterThanOrEqual(2);
    BONDS.forEach(bond => {
      expect(bond.id).toBeTruthy();
      expect(bond.name).toBeTruthy();
      expect(bond.description).toBeTruthy();
      // 触发条件：英雄组合或阵营要求至少其一
      expect(bond.heroes.length > 0 || Object.keys(bond.factions).length > 0).toBe(true);
      // 加成数值：至少一项有效
      expect(
        (bond.bonus.attackPercent || 0) + (bond.bonus.defensePercent || 0) + (bond.bonus.maxHpPercent || 0)
      ).toBeGreaterThan(0);
    });
  });

  it('references only known heroes and valid factions', () => {
    BONDS.forEach(bond => {
      bond.heroes.forEach(h => {
        expect(HEROES_CONFIG[h], `${bond.id} 引用了未知英雄 ${h}`).toBeDefined();
      });
      Object.keys(bond.factions).forEach(f => {
        expect(HERO_FACTION_LABELS[f as HeroFaction], `${bond.id} 引用了未知阵营 ${f}`).toBeDefined();
      });
    });
  });

  it('has unique bond ids', () => {
    const ids = BONDS.map(b => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('formatBonus renders the bonus values', () => {
    expect(formatBonus(BONDS.find(b => b.id === 'mechanical_partners')!.bonus)).toBe('攻击 +10%');
    expect(formatBonus(BONDS.find(b => b.id === 'arcane_resonance')!.bonus)).toBe('生命 +10%');
    expect(formatBonus(BONDS.find(b => b.id === 'wasteland_guardians')!.bonus)).toBe('防御 +10%');
  });
});

describe('getActiveBonds (触发与失效)', () => {
  it('triggers hero-combo bond when both heroes are on the party', () => {
    expect(getActiveBonds(['nova', 'roy']).map(b => b.id)).toEqual(['mechanical_partners']);
    // 三人小队：多余英雄不影响触发
    expect(getActiveBonds(['nova', 'roy', 'soldier']).map(b => b.id)).toEqual(['mechanical_partners']);
  });

  it('does not trigger the hero-combo bond when one hero is missing', () => {
    expect(getActiveBonds(['nova'])).toEqual([]);
    expect(getActiveBonds(['nova', 'soldier'])).toEqual([]);
    expect(getActiveBonds(['roy', 'soldier'])).toEqual([]);
  });

  it('triggers the faction bond when enough heroes of the faction are on the party (阵营参与判定)', () => {
    // 阿梅 + 艾拉：两名奥术阵营 → 奥术共鸣
    expect(getActiveBonds(['mei', 'healer']).map(b => b.id)).toEqual(['arcane_resonance']);
  });

  it('does not trigger the faction bond with too few faction heroes', () => {
    expect(getActiveBonds(['mei'])).toEqual([]);
    expect(getActiveBonds(['mei', 'nova'])).toEqual([]); // 仅 1 名奥术
  });

  it('triggers independent bonds simultaneously and ignores unknown heroes', () => {
    // 巴斯特(星界)+铁卫(英灵) → 废土守护
    expect(getActiveBonds(['buster', 'soldier']).map(b => b.id)).toEqual(['wasteland_guardians']);
    // 未知英雄防御性忽略
    expect(getActiveBonds(['ghost', 'nova', 'roy']).map(b => b.id)).toEqual(['mechanical_partners']);
    // 空队伍
    expect(getActiveBonds([])).toEqual([]);
  });

  it('aggregateBonus sums percent bonuses of all active bonds', () => {
    expect(aggregateBonus(['nova', 'roy'])).toEqual({ attackPercent: 10 });
    expect(aggregateBonus(['mei', 'healer'])).toEqual({ maxHpPercent: 10 });
    expect(aggregateBonus(['buster', 'soldier'])).toEqual({ defensePercent: 10 });
    expect(aggregateBonus(['nova'])).toEqual({}); // 无羁绊 → 空加成
  });
});

describe('Bond combat application (羁绊在战斗中生效)', () => {
  it('heroToCombatant applies attack/defense/maxHp percent bonuses', () => {
    const nova = createInitialHero('nova');
    const boosted = heroToCombatant('nova', nova, { attackPercent: 10, defensePercent: 10, maxHpPercent: 10 });
    expect(boosted.attack).toBe(Math.round(HEROES_CONFIG.nova.baseAttack * 1.1)); // 39
    expect(boosted.defense).toBe(Math.round(HEROES_CONFIG.nova.baseDefense * 1.1)); // 9
    expect(boosted.maxHp).toBe(Math.round(nova.maxHp * 1.1)); // 110
    expect(boosted.hp).toBe(Math.round(nova.hp * 1.1)); // 当前血量同比例缩放
    // 无加成时保持原值（回归）
    const plain = heroToCombatant('nova', nova);
    expect(plain.attack).toBe(HEROES_CONFIG.nova.baseAttack);
    expect(plain.maxHp).toBe(nova.maxHp);
  });

  it('startCombatUpdate: hero-combo bond boosts damage in the actual battle', () => {
    const zone = COMBAT_ZONES.wasteland_entrance;
    const state = makeState({
      ...owned(['nova', 'roy'], ['nova', 'roy']),
      stamina: 100
    });
    const { result } = startCombatUpdate(state, zone.id);
    // 机械搭档：诺娃攻击 35 → 39（round(35*1.1)），首击伤害 39 - 敌防 3 = 36
    expect(result.settlement?.battle.actions[0]).toMatchObject({ actorId: 'nova', damage: 36 });

    // 对照组：单诺娃无羁绊 → 35 - 3 = 32
    const solo = makeState({ ...owned(['nova'], ['nova']), stamina: 100 });
    const { result: soloOutcome } = startCombatUpdate(solo, zone.id);
    expect(soloOutcome.settlement?.battle.actions[0]).toMatchObject({ actorId: 'nova', damage: 32 });
  });

  it('faction bond (奥术共鸣) maxHp bonus is effective in battle simulation', () => {
    // 敌方每回合造成 2 点伤害（攻击 13 - 艾拉防御 11）：
    // 115hp 无加成 → 第 58 回合阵亡（重伤）；+10% 生命（127hp）→ 存活至 60 回合上限（平局）
    const healer = createInitialHero('healer');
    const enemy = { id: 'e', name: '强敌', emoji: '👹', hp: 9999, maxHp: 9999, attack: 13, defense: 0 };
    const without = simulateBattle([heroToCombatant('healer', healer)], [enemy]);
    expect(without.partyWiped).toBe(true);
    const withBond = simulateBattle([heroToCombatant('healer', healer, { maxHpPercent: 10 })], [enemy]);
    expect(withBond.partyWiped).toBe(false);
    expect(withBond.victory).toBe(false); // 打不死 → 回合上限平局，说明是"存活"而非"反杀"
  });

  it('faction bond triggers through the real chain: getActiveBonds → aggregateBonus → heroToCombatant', () => {
    // 不手动注入加成：bonus 完全由羁绊表 + 触发判定得出
    const party = ['mei', 'healer'];
    const bonus = aggregateBonus(party);
    expect(bonus).toEqual({ maxHpPercent: 10 });
    const combatant = heroToCombatant('mei', createInitialHero('mei'), bonus);
    expect(combatant.maxHp).toBe(Math.round(120 * 1.1)); // 132
    expect(combatant.hp).toBe(Math.round(120 * 1.1));
  });

  it('startBossBattleUpdate: bond bonus applies on the boss battle path too', () => {
    const zone = COMBAT_ZONES.wasteland_entrance;
    const state = makeState({
      ...owned(['nova', 'roy'], ['nova', 'roy']),
      stamina: 100
    });
    const { result } = startBossBattleUpdate(state, zone.id);
    // 机械搭档：诺娃 39 - BOSS 防 5 = 34
    expect(result.settlement?.battle.actions[0]).toMatchObject({ actorId: 'nova', damage: 34 });

    // 对照组：单诺娃无羁绊 → 35 - 5 = 30
    const solo = makeState({ ...owned(['nova'], ['nova']), stamina: 100 });
    const { result: soloOutcome } = startBossBattleUpdate(solo, zone.id);
    expect(soloOutcome.settlement?.battle.actions[0]).toMatchObject({ actorId: 'nova', damage: 30 });
  });
});
