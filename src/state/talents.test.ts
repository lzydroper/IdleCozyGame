import { describe, it, expect } from 'vitest';
import type { GameState } from '../types/game';
import { INITIAL_STATE, createInitialHero } from '../data/initialState';
import { HEROES_CONFIG, HERO_CLASS_LABELS } from '../data/heroes';
import { TALENT_TRUNKS, HERO_TALENTS, buildTalentTree, formatTalentGate } from '../data/talents';
import {
  getTalentNodes,
  getTalentBonus,
  getInvestedPoints,
  allocateTalentUpdate,
  unallocateTalentUpdate,
  resetTalentsUpdate,
  evaluateTalentGate,
  isTalentNodeUnlocked
} from './talents';
import type { TalentNodeConfig } from '../data/talents';
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
const BOOSTER = 'hero_nova_booster';

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

  it('每位英雄都有专属节点，且挂职阶主干入口之后（或独立 gate 竖线）', () => {
    Object.keys(HEROES_CONFIG).forEach(heroId => {
      const own = HERO_TALENTS[heroId];
      expect(own, heroId).toBeDefined();
      expect(own.length).toBeGreaterThanOrEqual(1);
      const trunk = TALENT_TRUNKS[HEROES_CONFIG[heroId].heroClass];
      own.forEach(node => {
        // 07 号 gate 系统：专属节点可挂主干入口（requires）或独立竖线（无 requires + gate 解锁）
        const attached = node.requires?.length === 1 && node.requires[0] === trunk[0].id;
        expect(attached || !!node.gate?.length, `${heroId}/${node.id}`).toBe(true);
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
    expect(nova.map(n => n.id)).toEqual([EDGE, FLURRY, 'trunk_attacker_armor_break', OVERDRIVE, BOOSTER]);
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
    // OVERDRIVE 已改为独立竖线（gate：等级 ≥20 + 已觉醒）——requires 点亮不解锁，仍 gate 锁定
    expect(allocateTalentUpdate(opened, 'nova', OVERDRIVE).result).toBe('locked');
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

describe('天赋门控 gate（07 号：觉醒/等级/天赋点等条件列表解锁）', () => {
  const hero = createInitialHero('nova'); // level 1, star 1, awakened false

  it('evaluateTalentGate：无/空 gate 放行，各条件独立判定', () => {
    expect(evaluateTalentGate(hero, undefined)).toBe(true);
    expect(evaluateTalentGate(hero, [])).toBe(true);
    // awakened
    expect(evaluateTalentGate(hero, [{ type: 'awakened' }])).toBe(false);
    expect(evaluateTalentGate({ ...hero, awakened: true }, [{ type: 'awakened' }])).toBe(true);
    // heroLevel
    expect(evaluateTalentGate(hero, [{ type: 'heroLevel', minLevel: 5 }])).toBe(false);
    expect(evaluateTalentGate({ ...hero, level: 10 }, [{ type: 'heroLevel', minLevel: 10 }])).toBe(true);
    // star
    expect(evaluateTalentGate(hero, [{ type: 'star', minLevel: 5 }])).toBe(false);
    expect(evaluateTalentGate({ ...hero, star: 5 }, [{ type: 'star', minLevel: 5 }])).toBe(true);
    // talent（节点投入，operator：greater / equal / less——严格 > / = / <）
    // 正向依赖：greater 0（整数点下投入 > 0 即已投入）
    expect(evaluateTalentGate(hero, [{ type: 'talent', nodeId: EDGE, operator: 'greater', value: 0 }])).toBe(false);
    expect(
      evaluateTalentGate({ ...hero, talents: { [EDGE]: 1 } }, [{ type: 'talent', nodeId: EDGE, operator: 'greater', value: 0 }])
    ).toBe(true);
    // less：投入 < N（整数点下 < 3 等价 ≤2）
    expect(
      evaluateTalentGate({ ...hero, talents: { [EDGE]: 3 } }, [{ type: 'talent', nodeId: EDGE, operator: 'less', value: 3 }])
    ).toBe(false);
    expect(
      evaluateTalentGate({ ...hero, talents: { [EDGE]: 2 } }, [{ type: 'talent', nodeId: EDGE, operator: 'less', value: 3 }])
    ).toBe(true);
    // equal 0：互斥（未投入该分支才解锁）
    expect(
      evaluateTalentGate({ ...hero, talents: { [EDGE]: 1 } }, [{ type: 'talent', nodeId: EDGE, operator: 'equal', value: 0 }])
    ).toBe(false);
    expect(evaluateTalentGate(hero, [{ type: 'talent', nodeId: EDGE, operator: 'equal', value: 0 }])).toBe(true);
    // equal N>0：恰好 N 点
    expect(
      evaluateTalentGate({ ...hero, talents: { [EDGE]: 2 } }, [{ type: 'talent', nodeId: EDGE, operator: 'equal', value: 2 }])
    ).toBe(true);
    expect(
      evaluateTalentGate({ ...hero, talents: { [EDGE]: 1 } }, [{ type: 'talent', nodeId: EDGE, operator: 'equal', value: 2 }])
    ).toBe(false);
  });

  it('formatTalentGate：各条件可读文案', () => {
    const nameOf = (id: string) => (id === EDGE ? '进攻者·边锋' : id);
    expect(
      formatTalentGate([{ type: 'talent', nodeId: EDGE, operator: 'greater', value: 0 }], nameOf)
    ).toEqual(['投入「进攻者·边锋」>0 点']);
    expect(
      formatTalentGate([{ type: 'talent', nodeId: EDGE, operator: 'less', value: 3 }], nameOf)
    ).toEqual(['投入「进攻者·边锋」<3 点']);
    expect(
      formatTalentGate([{ type: 'talent', nodeId: EDGE, operator: 'equal', value: 2 }], nameOf)
    ).toEqual(['投入「进攻者·边锋」=2 点']);
    // equal 0 → 互斥友好文案「未投入」
    expect(
      formatTalentGate([{ type: 'talent', nodeId: EDGE, operator: 'equal', value: 0 }], nameOf)
    ).toEqual(['「进攻者·边锋」未投入']);
    expect(
      formatTalentGate(
        [
          { type: 'awakened' },
          { type: 'heroLevel', minLevel: 10 },
          { type: 'star', minLevel: 5 }
        ],
        nameOf
      )
    ).toEqual(['英雄已觉醒', '角色等级 ≥10', '星级 ≥5']);
  });

  it('evaluateTalentGate：多条件 AND，任一不满足即不放行', () => {
    const gate = [
      { type: 'awakened' as const },
      { type: 'heroLevel' as const, minLevel: 10 },
      { type: 'talent' as const, nodeId: EDGE, operator: 'greater' as const, value: 0 }
    ];
    const full = { ...hero, awakened: true, level: 12, talents: { [EDGE]: 1 } };
    expect(evaluateTalentGate(full, gate)).toBe(true);
    expect(evaluateTalentGate({ ...full, level: 9 }, gate)).toBe(false);
    expect(evaluateTalentGate({ ...full, awakened: false }, gate)).toBe(false);
    expect(evaluateTalentGate({ ...full, talents: {} }, gate)).toBe(false);
    // 互斥：exactly 0 与 atLeast 组合（投入 A 分支则 B 分支解锁失败）
    const mutual = [
      { type: 'talent' as const, nodeId: EDGE, operator: 'equal' as const, value: 0 }
    ];
    expect(evaluateTalentGate(full, mutual)).toBe(false); // 已投入 EDGE → 互斥条件失败
    expect(evaluateTalentGate({ ...full, talents: {} }, mutual)).toBe(true);
  });

  it('isTalentNodeUnlocked：requires 与 gate 都满足才解锁（AND）', () => {
    const gated: TalentNodeConfig = {
      id: 'test_gated',
      name: '测试门控',
      maxLevel: 1,
      effect: {},
      pos: { row: 0, col: 0 },
      gate: [{ type: 'awakened' }]
    };
    expect(isTalentNodeUnlocked(hero, gated)).toBe(false);
    expect(isTalentNodeUnlocked({ ...hero, awakened: true }, gated)).toBe(true);

    // requires + gate 组合
    const both: TalentNodeConfig = { ...gated, requires: [EDGE] };
    expect(isTalentNodeUnlocked({ ...hero, awakened: true }, both)).toBe(false); // requires 不满足
    expect(isTalentNodeUnlocked({ ...hero, awakened: true, talents: { [EDGE]: 1 } }, both)).toBe(true);
  });

  it('allocateTalentUpdate：gate 未满足时 locked（集成）', () => {
    const state = novaWithPoints(3, { [EDGE]: 1 });
    // 临时注入一个带觉醒 gate 的专属节点（测试后移除，不污染配置）
    HERO_TALENTS.nova.push({
      id: 'hero_nova_test_gate',
      name: '测试·觉醒',
      maxLevel: 1,
      effect: { attackPercent: 1 },
      pos: { row: 2, col: 1 },
      gate: [{ type: 'awakened' }]
    });
    try {
      expect(allocateTalentUpdate(state, 'nova', 'hero_nova_test_gate').result).toBe('locked');
      const awakenedState = {
        ...state,
        heroes: { nova: { ...state.heroes.nova, awakened: true } }
      };
      expect(allocateTalentUpdate(awakenedState, 'nova', 'hero_nova_test_gate').result).toBe(true);
    } finally {
      HERO_TALENTS.nova = HERO_TALENTS.nova.filter(n => n.id !== 'hero_nova_test_gate');
    }
  });
});

describe('buildTalentTree（09 树形组装：pos + children）', () => {
  it('把英雄专属节点挂到其 requires 父节点的 children 末尾（主干链子在前）', () => {
    const tree = buildTalentTree('nova');
    const byId = new Map(tree.map(n => [n.id, n]));
    // 锋芒毕露（根）：链子连环攻势为子；过载引擎改独立竖线（无 requires + gate）不再挂 root
    expect(byId.get(EDGE)?.children).toEqual([FLURRY]);
    expect(byId.get(OVERDRIVE)?.requires).toBeUndefined();
    expect(byId.get(OVERDRIVE)).toBeDefined();
    // 连环攻势唯一子 → 破甲重击（正下直线）
    expect(byId.get(FLURRY)?.children).toEqual(['trunk_attacker_armor_break']);
    // 根节点 pos 为第 0 行第 0 个；链子与专属同属第 1 行（配置值）
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
      // 专属节点在树中即可（07 号 gate 系统：可独立竖线而不挂主干入口）
      ownIds.forEach(oid => expect(treeIds).toContain(oid));
      // 每个节点都有相对坐标
      tree.forEach(n => {
        expect(n.pos).toBeDefined();
        expect(Number.isInteger(n.pos.row)).toBe(true);
        expect(Number.isInteger(n.pos.col)).toBe(true);
      });
    });
  });
});
