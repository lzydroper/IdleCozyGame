import { describe, it, expect } from 'vitest';
import type { GameState, BattleResult } from '../types/game';
import { INITIAL_STATE, createInitialHero } from '../data/initialState';
import { HEROES_CONFIG, HERO_FACTION_LABELS } from '../data/heroes';
import { BONDS } from '../data/bonds';
import { formatModifiers } from './statSystem';
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
      // 加成数值：至少一项有效（修饰符）
      expect(bond.bonus.length).toBeGreaterThan(0);
      expect(bond.bonus.every(m => m.kind === 'percent' && m.value > 0)).toBe(true);
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

  it('formatModifiers renders the bonus values', () => {
    expect(formatModifiers(BONDS.find(b => b.id === 'mechanical_partners')!.bonus)).toBe('攻击 +10%');
    expect(formatModifiers(BONDS.find(b => b.id === 'arcane_resonance')!.bonus)).toBe('生命 +10%');
    expect(formatModifiers(BONDS.find(b => b.id === 'wasteland_guardians')!.bonus)).toBe('防御 +10%');
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

  it('aggregateBonus collects modifiers of all active bonds', () => {
    expect(aggregateBonus(['nova', 'roy'])).toEqual([{ stat: 'attack', kind: 'percent', value: 0.10, source: '机械搭档' }]);
    expect(aggregateBonus(['mei', 'healer'])).toEqual([{ stat: 'maxHp', kind: 'percent', value: 0.10, source: '奥术共鸣' }]);
    expect(aggregateBonus(['buster', 'soldier'])).toEqual([{ stat: 'defense', kind: 'percent', value: 0.10, source: '废土守护' }]);
    expect(aggregateBonus(['nova'])).toEqual([]); // 无羁绊 → 空修饰符
  });
});

describe('Bond combat application (羁绊在战斗中生效)', () => {
  it('heroToCombatant applies attack/defense/maxHp percent bonuses', () => {
    const nova = createInitialHero('nova');
    const boosted = heroToCombatant('nova', nova, [
      { stat: 'attack', kind: 'percent', value: 0.10 },
      { stat: 'defense', kind: 'percent', value: 0.10 },
      { stat: 'maxHp', kind: 'percent', value: 0.10 }
    ]);
    expect(boosted.attack).toBe(Math.round((HEROES_CONFIG.nova.baseAttributes.attack + HEROES_CONFIG.nova.primaryAttributes.strength * 2) * 1.1)); // 54（含元属性折算）
    expect(boosted.defense).toBe(12); // round((8 + 体质 3) × 1.1)
    expect(boosted.maxHp).toBe(143); // round((100 + 体质 3×10) × 1.1)
    expect(boosted.hp).toBe(143); // 当前血量同比例缩放
    // 无加成时保持元属性折算后的值（回归）
    const plain = heroToCombatant('nova', nova);
    expect(plain.attack).toBe(49); // 35 + 力量 7×2
    expect(plain.maxHp).toBe(130); // 100 + 体质 3×10
  });

  it('startCombatUpdate: hero-combo bond boosts damage in the actual battle', () => {
    const zone = COMBAT_ZONES.wasteland_entrance;
    const state = makeState({
      ...owned(['nova', 'roy'], ['nova', 'roy']),
      stamina: 100
    });
    const { result } = startCombatUpdate(state, zone.id);
    // 机械搭档：诺娃攻击 54（含元属性），首击伤害 54 - 敌防 3 = 51
    expect(result.settlement?.battle.actions[0]).toMatchObject({ actorId: 'nova', damage: 51 });

    // 对照组：单诺娃无羁绊 → 49 - 3 = 46
    const solo = makeState({ ...owned(['nova'], ['nova']), stamina: 100 });
    const { result: soloOutcome } = startCombatUpdate(solo, zone.id);
    expect(soloOutcome.settlement?.battle.actions[0]).toMatchObject({ actorId: 'nova', damage: 46 });
  });

  it('faction bond (奥术共鸣) maxHp bonus is effective in battle simulation', () => {
    // 敌方每回合造成 5 点伤害（攻击 20 - 艾拉防御 15，含体质折算）：
    // 155hp 无加成 → 第 31 回合阵亡；+10% 生命（171hp）→ 第 35 回合阵亡（撑得更久）
    const healer = createInitialHero('healer');
    const enemy = { id: 'e', name: '强敌', hp: 9999, maxHp: 9999, attack: 20, defense: 0 };
    const lastEnemyHit = (r: BattleResult) =>
      Math.max(...r.actions.filter(a => a.actorSide === 'enemy' && a.kind === 'attack').map(a => a.round));
    const without = simulateBattle([heroToCombatant('healer', healer)], [enemy]);
    const withBond = simulateBattle([heroToCombatant('healer', healer, [{ stat: 'maxHp', kind: 'percent', value: 0.10 }])], [enemy]);
    expect(without.partyWiped).toBe(true);
    expect(withBond.partyWiped).toBe(true); // 打不死 9999 血 → 都会阵亡
    expect(withBond.victory).toBe(false);
    expect(lastEnemyHit(withBond)).toBeGreaterThan(lastEnemyHit(without)); // +10% 生命撑得更久（35 > 31）
  });

  it('faction bond triggers through the real chain: getActiveBonds → aggregateBonus → heroToCombatant', () => {
    // 不手动注入加成：bonus 完全由羁绊表 + 触发判定得出
    const party = ['mei', 'healer'];
    const bonus = aggregateBonus(party);
    expect(bonus).toEqual([{ stat: 'maxHp', kind: 'percent', value: 0.10, source: '奥术共鸣' }]);
    const combatant = heroToCombatant('mei', createInitialHero('mei'), bonus);
    expect(combatant.maxHp).toBe(176); // (120 + 体质 4×10) × 1.1
    expect(combatant.hp).toBe(176);
  });

  it('startBossBattleUpdate: bond bonus applies on the boss battle path too', () => {
    const zone = COMBAT_ZONES.wasteland_entrance;
    const state = makeState({
      ...owned(['nova', 'roy'], ['nova', 'roy']),
      stamina: 100
    });
    const { result } = startBossBattleUpdate(state, zone.id);
    // 机械搭档：诺娃 54 - BOSS 防 5 = 49
    expect(result.settlement?.battle.actions[0]).toMatchObject({ actorId: 'nova', damage: 49 });

    // 对照组：单诺娃无羁绊 → 49 - 5 = 44
    const solo = makeState({ ...owned(['nova'], ['nova']), stamina: 100 });
    const { result: soloOutcome } = startBossBattleUpdate(solo, zone.id);
    expect(soloOutcome.settlement?.battle.actions[0]).toMatchObject({ actorId: 'nova', damage: 44 });
  });
});
