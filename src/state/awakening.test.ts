import { describe, it, expect } from 'vitest';
import type { GameState, HeroState } from '../types/game';
import { INITIAL_STATE, createInitialHero } from '../data/initialState';
import { HEROES_CONFIG } from '../data/heroes';
import { AWAKEN_CONFIG, STAR_MAX, starUpShardCost, STAR_STATS_PER_STAR } from '../data/awakening';
import { ITEMS_CONFIG } from '../data/items';
import { COMBAT_ZONES } from '../data/combatZones';
import {
  starUpUpdate,
  awakenUpdate,
  getStarBonus,
  getAwakenedPassive,
  getAwakenSkill,
  getAwakenedName,
  getAwakenBonus
} from './awakening';
import { simulateBattle, heroToCombatant } from './combat';
import { mergeSavedState } from './persistence';

const makeState = (overrides: Partial<GameState> = {}): GameState => {
  const s = JSON.parse(JSON.stringify(INITIAL_STATE)) as GameState;
  s.heroes.nova = createInitialHero('nova');
  return { ...s, ...overrides, heroes: { ...s.heroes, ...(overrides.heroes || {}) } };
};

const novaAt = (star: number, awakened = false): GameState =>
  makeState({ heroes: { nova: { ...createInitialHero('nova'), star, awakened } } });

describe('升星/觉醒配置完整性（ticket 12）', () => {
  it('每位英雄都有觉醒配置：更名、强化被动、专属技能', () => {
    Object.keys(HEROES_CONFIG).forEach(heroId => {
      const cfg = AWAKEN_CONFIG[heroId];
      expect(cfg, heroId).toBeDefined();
      expect(cfg.awakenedName).toContain('觉醒');
      expect(Object.keys(cfg.passive).length).toBeGreaterThan(0);
      expect(['strike', 'aoe', 'heal']).toContain(cfg.skill.type);
      expect(cfg.skill.cooldown).toBeGreaterThan(0);
      if (cfg.skill.type === 'heal') {
        expect(cfg.skill.healPercent).toBeGreaterThan(0);
      } else {
        expect(cfg.skill.multiplier).toBeGreaterThan(0);
      }
    });
  });

  it('奥术星体有物品定义，且由辐射车间 BOSS 掉落（终局素材）', () => {
    expect(ITEMS_CONFIG.arcane_orb).toBeDefined();
    const bossDrops = COMBAT_ZONES.radiated_workshop.boss.drops;
    expect(bossDrops.some(d => d.itemId === 'arcane_orb')).toBe(true);
    // 前两区 BOSS 不掉落（终局分层）
    expect(COMBAT_ZONES.wasteland_entrance.boss.drops.some(d => d.itemId === 'arcane_orb')).toBe(false);
    expect(COMBAT_ZONES.old_town_ruins.boss.drops.some(d => d.itemId === 'arcane_orb')).toBe(false);
  });
});

describe('升星', () => {
  it('消耗灵魂碎片升星，先扣专属碎片', () => {
    const state = makeState({ inventory: { shard_nova: 10, resonance_shard: 0 } });
    const r = starUpUpdate(state, 'nova');
    expect(r.result).toBe(true);
    expect(r.state.heroes.nova.star).toBe(2);
    expect(r.state.inventory.shard_nova).toBe(10 - starUpShardCost(1)); // cost(1)=5
  });

  it('专属碎片不足时用共鸣碎片补齐', () => {
    const state = makeState({ inventory: { shard_nova: 3, resonance_shard: 10 } });
    const r = starUpUpdate(state, 'nova');
    expect(r.result).toBe(true);
    expect(r.state.heroes.nova.star).toBe(2);
    expect(r.state.inventory.shard_nova).toBeUndefined(); // 3 张专属全用掉
    expect(r.state.inventory.resonance_shard).toBe(10 - (5 - 3)); // 补 2 张共鸣
  });

  it('拒绝：碎片不足 / 已满星 / 未知英雄', () => {
    expect(starUpUpdate(makeState(), 'nova').result).toBe('no_shards');
    expect(starUpUpdate(novaAt(STAR_MAX), 'nova').result).toBe('max_star');
    expect(starUpUpdate(makeState({ inventory: { shard_nova: 99 } }), 'ghost').result).toBe('unknown_hero');
  });

  it('星级越高消耗越多（cost = 当前星级 × 5）', () => {
    expect(starUpShardCost(1)).toBe(5);
    expect(starUpShardCost(4)).toBe(20);
  });

  it('星级属性加成：每颗星（1 星以上）× 配置百分比', () => {
    expect(getStarBonus(createInitialHero('nova'))).toEqual({}); // 1 星无加成
    const star3: HeroState = { ...createInitialHero('nova'), star: 3 };
    expect(getStarBonus(star3)).toEqual({
      attackPercent: STAR_STATS_PER_STAR.attackPercent! * 2,
      defensePercent: STAR_STATS_PER_STAR.defensePercent! * 2,
      maxHpPercent: STAR_STATS_PER_STAR.maxHpPercent! * 2
    });
  });
});

describe('觉醒', () => {
  it('满星消耗奥术星体觉醒：状态标记、素材扣除、更名', () => {
    const state = novaAt(STAR_MAX, false);
    state.inventory.arcane_orb = 1;
    const r = awakenUpdate(state, 'nova');
    expect(r.result).toBe(true);
    expect(r.state.heroes.nova.awakened).toBe(true);
    expect(r.state.inventory.arcane_orb).toBe(0);
    expect(getAwakenedName('nova', r.state.heroes.nova)).toBe(AWAKEN_CONFIG.nova.awakenedName);
  });

  it('拒绝：未满星 / 无奥术星体 / 已觉醒 / 未知英雄', () => {
    expect(awakenUpdate(novaAt(3), 'nova').result).toBe('not_max_star');
    expect(awakenUpdate(novaAt(STAR_MAX), 'nova').result).toBe('no_orb');
    const done = novaAt(STAR_MAX, true);
    done.inventory.arcane_orb = 1;
    expect(awakenUpdate(done, 'nova').result).toBe('already_awakened');
    expect(awakenUpdate(makeState(), 'ghost').result).toBe('unknown_hero');
    // 无觉醒配置的英雄 → no_config（防御性：临时摘除配置再恢复，try/finally 保证任何失败路径都还原）
    const noCfg = novaAt(STAR_MAX);
    noCfg.inventory.arcane_orb = 1;
    const origConfig = AWAKEN_CONFIG.nova;
    try {
      delete (AWAKEN_CONFIG as Record<string, unknown>).nova;
      expect(awakenUpdate(noCfg, 'nova').result).toBe('no_config');
    } finally {
      (AWAKEN_CONFIG as Record<string, unknown>).nova = origConfig;
    }
  });

  it('觉醒强化被动与专属技能仅在觉醒后生效', () => {
    const before = createInitialHero('nova');
    expect(getAwakenedPassive('nova', before)).toEqual({});
    expect(getAwakenSkill('nova', before)).toBeUndefined();

    const after: HeroState = { ...before, star: STAR_MAX, awakened: true };
    expect(getAwakenedPassive('nova', after)).toEqual(AWAKEN_CONFIG.nova.passive);
    expect(getAwakenSkill('nova', after)?.name).toBe('电涌过载');
  });

  it('总加成 = 星级加成 + 觉醒被动', () => {
    const hero: HeroState = { ...createInitialHero('nova'), star: STAR_MAX, awakened: true };
    const bonus = getAwakenBonus('nova', hero);
    expect(bonus.attackPercent).toBe(STAR_STATS_PER_STAR.attackPercent! * 4 + AWAKEN_CONFIG.nova.passive.attackPercent!);
  });
});

describe('觉醒技能纳入轮询回合制战斗（ticket 12 → 05）', () => {
  // 简单敌人：低防御便于验证伤害公式
  const dummyEnemies = () => [
    { id: 'e1', name: '靶子甲', hp: 500, maxHp: 500, attack: 1, defense: 0 },
    { id: 'e2', name: '靶子乙', hp: 500, maxHp: 500, attack: 1, defense: 0 }
  ];

  it('strike 技能：单体重击 + 冷却节奏（用后 3 回合普通攻击再发动）', () => {
    const buster: HeroState = { ...createInitialHero('buster'), star: STAR_MAX, awakened: true }; // 拆解重击 ×2.2
    const combatant = heroToCombatant('buster', buster);
    // 攻击 = round(32 × (1 + 星级 8% + 觉醒被动 12%)) = round(38.4) = 38
    expect(combatant.attack).toBe(38);
    const heroes = [combatant];
    const result = simulateBattle(heroes, dummyEnemies(), 8);
    const skills = result.actions.filter(a => a.kind === 'skill');
    // 回合 1 发动；冷却 3 → 回合 5 再发动（自身行动轮）
    expect(skills.map(a => a.round)).toEqual([1, 5]);
    expect(skills[0].skillName).toBe('拆解重击');
    // 伤害 = 攻击 ×2.2（防御 0）：round(38 × 2.2) = 84
    expect(skills[0].damage).toBe(Math.round(38 * 2.2));
  });

  it('aoe 技能：一次行动对全部存活敌人造成伤害', () => {
    const nova: HeroState = { ...createInitialHero('nova'), star: STAR_MAX, awakened: true }; // 电涌过载 ×0.8
    const combatant = heroToCombatant('nova', nova);
    // 攻击 = round(35 × (1 + 星级 8% + 觉醒被动 10%)) = round(41.3) = 41
    expect(combatant.attack).toBe(41);
    const heroes = [combatant];
    const result = simulateBattle(heroes, dummyEnemies(), 3);
    const round1Skills = result.actions.filter(a => a.round === 1 && a.kind === 'skill');
    expect(round1Skills).toHaveLength(2); // 两个敌人都吃到
    expect(round1Skills.every(a => a.skillName === '电涌过载')).toBe(true);
    expect(round1Skills[0].damage).toBe(Math.round(41 * 0.8));
  });

  it('heal 技能：恢复自身生命且不超过上限', () => {
    const healer: HeroState = { ...createInitialHero('healer'), star: STAR_MAX, awakened: true, hp: 50 }; // 净化之泉 50%
    const combatant = heroToCombatant('healer', healer);
    // maxHp = round(115 × (1 + 星级 16% + 觉醒被动 15%)) = round(150.65) = 151
    expect(combatant.maxHp).toBe(151);
    const heroes = [combatant];
    const enemies = [{ id: 'e1', name: '靶子', hp: 500, maxHp: 500, attack: 1, defense: 0 }];
    const result = simulateBattle(heroes, enemies, 2);
    const healAction = result.actions.find(a => a.kind === 'heal');
    expect(healAction).toBeDefined();
    // 治疗量 = maxHp 的 50% = round(151 × 0.5) = 76，上限内全额
    expect(healAction!.damage).toBe(Math.round(151 * 0.5));
    expect(healAction!.targetName).toBe('艾拉');
  });

  it('heal 治疗量受生命上限约束', () => {
    const catherine: HeroState = { ...createInitialHero('catherine'), star: STAR_MAX, awakened: true, hp: 149 }; // maxHp 150，缺 1
    const heroes = [heroToCombatant('catherine', catherine)];
    const enemies = [{ id: 'e1', name: '靶子', hp: 500, maxHp: 500, attack: 1, defense: 0 }];
    const result = simulateBattle(heroes, enemies, 2);
    const healAction = result.actions.find(a => a.kind === 'heal');
    expect(healAction!.damage).toBe(1); // 只补缺的 1 点
  });

  it('未觉醒英雄战斗行为与之前一致（普通攻击，无技能）', () => {
    const nova: HeroState = createInitialHero('nova');
    const heroes = [heroToCombatant('nova', nova)];
    const result = simulateBattle(heroes, dummyEnemies(), 3);
    expect(result.actions.some(a => a.kind === 'skill')).toBe(false);
    expect(result.actions.every(a => a.kind === 'attack')).toBe(true);
  });

  it('升星/觉醒百分比加成计入战斗数值（与天赋叠加）', () => {
    const hero: HeroState = { ...createInitialHero('nova'), star: 3, awakened: true, talents: { trunk_attacker_edge: 2 } };
    const c = heroToCombatant('nova', hero);
    // 攻击 = round(35 × (1 + (4 + 10 + 6)/100)) = round(35 × 1.2) = 42
    //   star 3: attack +2%×2=4%；觉醒被动 +10%；天赋锋芒 ×2 = +6%
    expect(c.attack).toBe(42);
    expect(c.skill?.name).toBe('电涌过载');
  });
});

describe('存档迁移（ticket 12）', () => {
  it('旧存档英雄缺 awakened 字段时补 false', () => {
    const save = JSON.parse(JSON.stringify(INITIAL_STATE)) as GameState;
    const { awakened: _omit, ...legacy } = createInitialHero('nova');
    save.heroes.nova = legacy as never;
    const merged = mergeSavedState(save, INITIAL_STATE);
    expect(merged.heroes.nova.awakened).toBe(false);
  });

  it('已觉醒英雄的标记在迁移后保留', () => {
    const save = JSON.parse(JSON.stringify(INITIAL_STATE)) as GameState;
    save.heroes.nova = { ...createInitialHero('nova'), star: STAR_MAX, awakened: true };
    const merged = mergeSavedState(save, INITIAL_STATE);
    expect(merged.heroes.nova.awakened).toBe(true);
  });
});
