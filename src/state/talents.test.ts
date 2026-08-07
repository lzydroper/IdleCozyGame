import { describe, it, expect } from 'vitest';
import type { GameState } from '../types/game';
import { INITIAL_STATE, createInitialHero } from '../data/initialState';
import { HEROES_CONFIG, HERO_CLASS_LABELS } from '../data/heroes';
import { TALENT_TRUNKS, HERO_TALENTS, buildTalentTree } from '../data/talents';
import {
  getTalentNodes,
  getTalentBonus,
  getInvestedPoints,
  allocateTalentUpdate,
  unallocateTalentUpdate,
  resetTalentsUpdate
} from './talents';
import { applyHeroExp, heroToCombatant } from './combat';
import { mergeSavedState } from './persistence';

const makeState = (overrides: Partial<GameState> = {}): GameState => {
  const s = JSON.parse(JSON.stringify(INITIAL_STATE)) as GameState;
  s.heroes.nova = createInitialHero('nova');
  return { ...s, ...overrides, heroes: { ...s.heroes, ...(overrides.heroes || {}) } };
};

const novaWithPoints = (points: number, talents: Record<string, number> = {}): GameState =>
  makeState({ heroes: { nova: { ...createInitialHero('nova'), talentPoints: points, talents } } });

// 进攻者主干：锋芒毕露 → 连环攻势 → 破甲重击；诺娃专属：过载引擎（需锋芒毕露）
const EDGE = 'trunk_attacker_edge';
const FLURRY = 'trunk_attacker_flurry';
const OVERDRIVE = 'hero_nova_overdrive';

describe('天赋树配置完整性（ticket 11）', () => {
  it('3 职阶各有一棵公共主干，主干按顺序递进', () => {
    (Object.keys(HERO_CLASS_LABELS) as Array<keyof typeof HERO_CLASS_LABELS>).forEach(cls => {
      const trunk = TALENT_TRUNKS[cls];
      expect(trunk, cls).toBeDefined();
      expect(trunk.length).toBeGreaterThanOrEqual(3);
      // 后置节点依赖前一节点
      trunk.forEach((node, i) => {
        expect(node.maxLevel).toBeGreaterThan(0);
        if (i > 0) {
          expect(node.requires).toEqual([trunk[i - 1].id]);
        } else {
          expect(node.requires).toBeUndefined();
        }
      });
    });
  });

  it('每位英雄都有专属节点，且挂在对应职阶主干入口之后', () => {
    Object.keys(HEROES_CONFIG).forEach(heroId => {
      const own = HERO_TALENTS[heroId];
      expect(own, heroId).toBeDefined();
      expect(own.length).toBeGreaterThanOrEqual(1);
      const trunk = TALENT_TRUNKS[HEROES_CONFIG[heroId].heroClass];
      own.forEach(node => {
        expect(node.requires, `${heroId}/${node.id}`).toEqual([trunk[0].id]);
      });
    });
  });

  it('英雄天赋树 = 职阶主干 + 专属节点，节点 id 全局唯一', () => {
    const allIds = new Set<string>();
    Object.values(TALENT_TRUNKS).flat().forEach(n => {
      expect(allIds.has(n.id)).toBe(false);
      allIds.add(n.id);
    });
    Object.values(HERO_TALENTS).flat().forEach(n => {
      expect(allIds.has(n.id)).toBe(false);
      allIds.add(n.id);
    });
    const nova = getTalentNodes('nova');
    expect(nova.map(n => n.id)).toEqual([EDGE, FLURRY, 'trunk_attacker_armor_break', OVERDRIVE]);
  });
});

describe('升级获得天赋点', () => {
  it('每次升级获得 1 天赋点（多级连升按级数累计）', () => {
    const hero = createInitialHero('nova'); // level 1, 0 点
    const leveled = applyHeroExp(hero, HEROES_CONFIG.nova, 100); // 升到 2 级
    expect(leveled.level).toBe(2);
    expect(leveled.talentPoints).toBe(1);

    const leveled2 = applyHeroExp(leveled, HEROES_CONFIG.nova, 500); // 2→3 需 200，3→4 需 300 → 升 2 级
    expect(leveled2.level).toBe(4);
    expect(leveled2.talentPoints).toBe(3);
  });

  it('经验不足时不升级不加点，天赋投入保留', () => {
    const hero = { ...createInitialHero('nova'), talentPoints: 2, talents: { [EDGE]: 1 } };
    const after = applyHeroExp(hero, HEROES_CONFIG.nova, 50); // 不足 100
    expect(after.level).toBe(1);
    expect(after.talentPoints).toBe(2);
    expect(after.talents[EDGE]).toBe(1);
  });
});

describe('加点 / 撤点 / 重置', () => {
  it('加点消耗 1 天赋点并投入节点', () => {
    const state = novaWithPoints(3);
    const r = allocateTalentUpdate(state, 'nova', EDGE);
    expect(r.result).toBe(true);
    expect(r.state.heroes.nova.talentPoints).toBe(2);
    expect(r.state.heroes.nova.talents[EDGE]).toBe(1);
  });

  it('拒绝：未知英雄 / 未知节点 / 无天赋点 / 节点满级', () => {
    expect(allocateTalentUpdate(makeState(), 'ghost', EDGE).result).toBe('unknown_hero');
    expect(allocateTalentUpdate(novaWithPoints(3), 'nova', 'not_a_node').result).toBe('unknown_node');
    expect(allocateTalentUpdate(novaWithPoints(0), 'nova', EDGE).result).toBe('no_points');
    const maxed = novaWithPoints(3, { [EDGE]: 3 });
    expect(allocateTalentUpdate(maxed, 'nova', EDGE).result).toBe('maxed');
  });

  it('前置未点亮时拒绝（锁定），点亮后解锁', () => {
    const state = novaWithPoints(3);
    expect(allocateTalentUpdate(state, 'nova', FLURRY).result).toBe('locked');
    expect(allocateTalentUpdate(state, 'nova', OVERDRIVE).result).toBe('locked');

    const opened = allocateTalentUpdate(state, 'nova', EDGE).state;
    expect(allocateTalentUpdate(opened, 'nova', FLURRY).result).toBe(true);
    expect(allocateTalentUpdate(opened, 'nova', OVERDRIVE).result).toBe(true);
  });

  it('撤点返还 1 天赋点；下游已投入时拒绝', () => {
    const state = novaWithPoints(1, { [EDGE]: 3, [FLURRY]: 1 });
    // 下游连环攻势已投入 → 不可撤锋芒毕露
    expect(unallocateTalentUpdate(state, 'nova', EDGE).result).toBe('has_dependents');
    // 撤连环攻势成功，返还 1 点
    const r = unallocateTalentUpdate(state, 'nova', FLURRY);
    expect(r.result).toBe(true);
    expect(r.state.heroes.nova.talentPoints).toBe(2);
    expect(r.state.heroes.nova.talents[FLURRY]).toBeUndefined();
    // 撤至 0 点后节点记录删除
    expect(unallocateTalentUpdate(state, 'nova', OVERDRIVE).result).toBe('no_investment');
  });

  it('重置返还全部投入点数并清空投入', () => {
    const state = novaWithPoints(2, { [EDGE]: 3, [FLURRY]: 2, [OVERDRIVE]: 1 });
    const r = resetTalentsUpdate(state, 'nova');
    expect(r.result).toBe(true);
    expect(r.state.heroes.nova.talentPoints).toBe(2 + 6);
    expect(r.state.heroes.nova.talents).toEqual({});
    // 无投入时重置为无操作
    expect(resetTalentsUpdate(makeState(), 'nova').result).toBe(false);
  });
});

describe('天赋加成计算与战斗生效', () => {
  it('加成 = 各节点每级效果 × 投入点数（线性叠加）', () => {
    const hero = { ...createInitialHero('nova'), talents: { [EDGE]: 2, [OVERDRIVE]: 3 } };
    expect(getTalentBonus('nova', hero)).toEqual({ attackPercent: 6 + 6 }); // 锋芒 3×2 + 过载 2×3
    expect(getInvestedPoints(hero)).toBe(5);
  });

  it('无投入时无加成', () => {
    expect(getTalentBonus('nova', createInitialHero('nova'))).toEqual({});
  });

  it('天赋百分比与羁绊、装备加成叠加生效于战斗数值', () => {
    const hero = { ...createInitialHero('nova'), talents: { [EDGE]: 2 } }; // 攻击 +6%
    const gear = {
      weapon: { itemId: 'wasteland_weapon', enhance: 0, mythic: false }, // 攻击 +10
      armor: null,
      trinket: null
    };
    const bond = { attackPercent: 10 };
    const c = heroToCombatant('nova', hero, bond, gear);
    // 攻击 = round((35 + 10) × 1.16) = round(52.2) = 52
    expect(c.attack).toBe(52);
  });

  it('守护者主干生命加成生效，当前血量按比例缩放', () => {
    const soldier = { ...createInitialHero('soldier'), talents: { trunk_guardian_bulwark: 3 }, hp: 80 }; // 生命 +9%
    const c = heroToCombatant('soldier', soldier);
    expect(c.maxHp).toBe(Math.round(160 * 1.09));
    expect(c.hp).toBe(Math.round(80 * 1.09)); // 已损比例保留
  });

  it('未加点英雄战斗属性与之前一致（回归）', () => {
    const c = heroToCombatant('nova', createInitialHero('nova'));
    expect(c.attack).toBe(35);
    expect(c.defense).toBe(8);
    expect(c.maxHp).toBe(100);
  });
});

describe('存档迁移（ticket 11）', () => {
  it('旧存档英雄缺天赋字段时补默认值', () => {
    const save = JSON.parse(JSON.stringify(INITIAL_STATE)) as GameState;
    save.heroes.nova = { level: 5, exp: 10, hp: 100, maxHp: 100, star: 1, wounded: false } as never;
    const merged = mergeSavedState(save, INITIAL_STATE);
    expect(merged.heroes.nova.talentPoints).toBe(0);
    expect(merged.heroes.nova.talents).toEqual({});
  });

  it('非法天赋点钳制为 0，投入记录保留', () => {
    const save = JSON.parse(JSON.stringify(INITIAL_STATE)) as GameState;
    save.heroes.nova = {
      ...createInitialHero('nova'),
      talentPoints: Number.NaN,
      talents: { [EDGE]: 2 }
    } as never;
    const merged = mergeSavedState(save, INITIAL_STATE);
    expect(merged.heroes.nova.talentPoints).toBe(0);
    expect(merged.heroes.nova.talents[EDGE]).toBe(2);
  });

  it('节点等级钳制到上限，未知/非法节点丢弃（防损坏存档撑爆 UI 与加成）', () => {
    const save = JSON.parse(JSON.stringify(INITIAL_STATE)) as GameState;
    save.heroes.nova = {
      ...createInitialHero('nova'),
      talents: {
        [EDGE]: 99,          // 超上限 → 钳制到 maxLevel(3)
        [FLURRY]: Number.NaN, // 非法 → 丢弃
        ghost_node: 3,       // 未知节点 → 丢弃
        [OVERDRIVE]: 1       // 合法保留
      }
    } as never;
    const merged = mergeSavedState(save, INITIAL_STATE);
    expect(merged.heroes.nova.talents).toEqual({ [EDGE]: 3, [OVERDRIVE]: 1 });
  });
});

describe('buildTalentTree（09 树形组装：pos + children）', () => {
  it('把英雄专属节点挂到其 requires 父节点的 children 末尾（主干链子在前）', () => {
    const tree = buildTalentTree('nova');
    const byId = new Map(tree.map(n => [n.id, n]));
    // 锋芒毕露（根）：2 个子 → 连环攻势（链子在前）+ 过载引擎（专属在后）→ 槽位 左下 / 右下
    expect(byId.get(EDGE)?.children).toEqual([FLURRY, OVERDRIVE]);
    // 连环攻势唯一子 → 破甲重击（正下直线）
    expect(byId.get(FLURRY)?.children).toEqual(['trunk_attacker_armor_break']);
    // 根节点 pos 为第 0 行第 0 个；专属与链子同属第 1 行
    expect(byId.get(EDGE)?.pos).toEqual({ row: 0, col: 0 });
    expect(byId.get(FLURRY)?.pos.row).toBe(1);
    expect(byId.get(OVERDRIVE)?.pos.row).toBe(1);
    // 树节点 id 不重复
    expect(new Set(tree.map(n => n.id)).size).toBe(tree.length);
  });

  it('9 位英雄的树都包含职阶主干三节点与各自专属节点，且专属挂在主干入口下', () => {
    Object.keys(HEROES_CONFIG).forEach(heroId => {
      const tree = buildTalentTree(heroId);
      const cls = HEROES_CONFIG[heroId].heroClass;
      const trunkIds = TALENT_TRUNKS[cls].map(n => n.id);
      const ownIds = HERO_TALENTS[heroId].map(n => n.id);
      const treeIds = tree.map(n => n.id);
      trunkIds.forEach(tid => expect(treeIds).toContain(tid));
      ownIds.forEach(oid => expect(treeIds).toContain(oid));
      // 专属节点必须挂到主干入口（trunk[0]）children
      const root = tree.find(n => n.id === trunkIds[0]);
      ownIds.forEach(oid => expect(root?.children).toContain(oid));
      // 每个节点都有相对坐标
      tree.forEach(n => {
        expect(n.pos).toBeDefined();
        expect(Number.isInteger(n.pos.row)).toBe(true);
        expect(Number.isInteger(n.pos.col)).toBe(true);
      });
    });
  });
});
