import { describe, it, expect } from 'vitest';
import { guardSkillRows } from './entities.loader';

// 守卫仅在 DEV 生效（与生产树摇零开销约定一致）；vitest 运行于 DEV 模式。
const baseRow = (over: Record<string, unknown> = {}) => ({
  id: 't_skill_1',
  slot: 1,
  abilityId: 'basic_attack',
  ...over
});

const validRows = () => [
  baseRow(),
  { id: 't_skill_2', slot: 2, abilityId: 'basic_attack' },
  { id: 't_skill_3', slot: 3, abilityId: 'basic_attack' }
];

describe('guardSkillRows（heroes-skills spec §1.1）', () => {
  it('合法三行原样通过', () => {
    const rows = validRows();
    expect(guardSkillRows('nova', rows)).toBe(rows);
  });

  it('行数不是 3 即拒绝（恒三行契约）', () => {
    expect(() => guardSkillRows('nova', validRows().slice(0, 2))).toThrow(/恰好 3 行/);
  });

  it('slot 越界 / 重复槽位即拒绝', () => {
    expect(() =>
      guardSkillRows('nova', [
        { id: 'a', slot: 1, abilityId: 'basic_attack' },
        { id: 'b', slot: 4, abilityId: 'basic_attack' },
        { id: 'c', slot: 3, abilityId: 'basic_attack' }
      ])
    ).toThrow(/slot 必须是 1\|2\|3/);
    expect(() =>
      guardSkillRows('nova', [
        { id: 'a', slot: 1, abilityId: 'basic_attack' },
        { id: 'b', slot: 1, abilityId: 'basic_attack' },
        { id: 'c', slot: 3, abilityId: 'basic_attack' }
      ])
    ).toThrow(/槽位 1 出现多行/);
  });

  it('引用未注册能力即拒绝', () => {
    expect(() =>
      guardSkillRows('nova', [
        { id: 'a', slot: 1, abilityId: 'no_such_ability' },
        { id: 'b', slot: 2, abilityId: 'basic_attack' },
        { id: 'c', slot: 3, abilityId: 'basic_attack' }
      ])
    ).toThrow(/不在全局注册表/);
  });

  it('unlock 条件白名单：未知键与非正整数等级即拒绝', () => {
    expect(() =>
      guardSkillRows('nova', [
        baseRow({ unlock: { levelx: 5 } }),
        { id: 'b', slot: 2, abilityId: 'basic_attack' },
        { id: 'c', slot: 3, abilityId: 'basic_attack' }
      ])
    ).toThrow(/未知条件键/);
    expect(() =>
      guardSkillRows('nova', [
        baseRow({ unlock: { level: 0 } }),
        { id: 'b', slot: 2, abilityId: 'basic_attack' },
        { id: 'c', slot: 3, abilityId: 'basic_attack' }
      ])
    ).toThrow(/≥1 的整数/);
  });

  it('growth 键白名单与非负数值校验', () => {
    expect(() =>
      guardSkillRows('nova', [
        baseRow({ growth: { perLevelx: 0.1 } }),
        { id: 'b', slot: 2, abilityId: 'basic_attack' },
        { id: 'c', slot: 3, abilityId: 'basic_attack' }
      ])
    ).toThrow(/growth 未知键/);
    expect(() =>
      guardSkillRows('nova', [
        baseRow({ growth: { perStar: -0.1 } }),
        { id: 'b', slot: 2, abilityId: 'basic_attack' },
        { id: 'c', slot: 3, abilityId: 'basic_attack' }
      ])
    ).toThrow(/非负有限数/);
  });

  it('milestones patch 白名单外字段即拒绝（效果数值必须走 growth）', () => {
    expect(() =>
      guardSkillRows('nova', [
        baseRow({ milestones: [{ at: { level: 20 }, patch: { effects: [] } }] }),
        { id: 'b', slot: 2, abilityId: 'basic_attack' },
        { id: 'c', slot: 3, abilityId: 'basic_attack' }
      ])
    ).toThrow(/白名单外字段 'effects'/);
  });

  it('milestones patch 空对象 / 非整数冷却 / 坏 cost 形状即拒绝', () => {
    const rowsWith = (patch: Record<string, unknown>) => [
      baseRow({ milestones: [{ at: { level: 20 }, patch }] }),
      { id: 'b', slot: 2, abilityId: 'basic_attack' },
      { id: 'c', slot: 3, abilityId: 'basic_attack' }
    ];
    expect(() => guardSkillRows('nova', rowsWith({}))).toThrow(/不能为空对象/);
    expect(() => guardSkillRows('nova', rowsWith({ cooldown: 1.5 }))).toThrow(/必须是整数/);
    expect(() => guardSkillRows('nova', rowsWith({ cost: { amount: 10 } }))).toThrow(/\{resource:string, amount:正整数\}/);
  });

  it('合法里程碑全形状通过', () => {
    const rows = [
      baseRow({
        unlock: { star: 2 },
        growth: { perStar: 0.05 },
        milestones: [
          { at: { level: 20 }, patch: { cooldown: 2 } },
          { at: { awakened: true }, patch: { cost: { resource: 'mp', amount: 60 }, priority: 3, targeting: 'enemy:all' } }
        ]
      }),
      { id: 'b', slot: 2, abilityId: 'basic_attack', unlock: { level: 10 } },
      { id: 'c', slot: 3, abilityId: 'basic_attack', unlock: { awakened: true } }
    ];
    expect(guardSkillRows('nova', rows)).toBe(rows);
  });
});
