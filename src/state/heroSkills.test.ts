import { describe, it, expect } from 'vitest';
import {
  isSkillConditionMet,
  growthFactor,
  scaleFormulaLeaves,
  applyGrowthToAbility,
  applyMilestonesToAbility,
  applyRewritesToAbility,
  resolveSkillRow,
  resolveHeroSkills
} from './heroSkills';
import { collectHeroAbilities } from './combat';
import { resolveAbilityConfig, type AbilityConfig } from './abilityTypes';
import type { TalentRewrite } from '../configs/types/progression.types';
import type { HeroState } from '../types/game';

const makeHero = (over: Partial<HeroState> = {}): HeroState => ({
  level: 1,
  exp: 0,
  hp: 100,
  maxHp: 100,
  star: 1,
  wounded: false,
  talentPoints: 0,
  talents: {},
  awakened: false,
  logisticsFacilityId: null,
  ...over
});

// 合成能力：伤害公式叶（吃 growth）+ 眩晕时长常量（不吃 growth，正交边界）
const cfg: AbilityConfig = {
  id: 't_strike',
  name: '试作技',
  description: '测试用',
  activation: 'active',
  targeting: 'enemy:first',
  cooldown: 4,
  priority: 1,
  cost: { resource: 'mp', amount: 20 },
  effects: [
    { kind: 'damage', params: { amount: { kind: 'attack', multiplier: 0.8 } } },
    { kind: 'stun', params: { duration: 2 } }
  ]
};

describe('isSkillConditionMet（解锁过滤）', () => {
  it('缺省条件 = 出生即解锁', () => {
    expect(isSkillConditionMet(undefined, makeHero())).toBe(true);
    expect(isSkillConditionMet({}, makeHero())).toBe(true);
  });

  it('AND 语义：任一不满足即锁', () => {
    const hero = makeHero({ level: 9, star: 3, awakened: false });
    expect(isSkillConditionMet({ level: 10 }, hero)).toBe(false);
    expect(isSkillConditionMet({ level: 10, star: 3 }, hero)).toBe(false); // 等级差一票否决
    expect(isSkillConditionMet({ level: 9, star: 3, awakened: true }, hero)).toBe(false);
    expect(isSkillConditionMet({ level: 10, star: 3, awakened: true }, makeHero({ level: 10, star: 3, awakened: true }))).toBe(true);
  });
});

describe('growth 烘焙（两维独立乘算、只乘公式叶）', () => {
  it('growthFactor：×(1+perLevel×(等级−1)) ×(1+perStar×星数)', () => {
    expect(growthFactor(undefined, makeHero())).toBe(1);
    expect(growthFactor({ perLevel: 0.02 }, makeHero({ level: 11 }))).toBeCloseTo(1.2);
    expect(growthFactor({ perStar: 0.05 }, makeHero({ star: 3 }))).toBeCloseTo(1.15);
    expect(growthFactor({ perLevel: 0.02, perStar: 0.05 }, makeHero({ level: 11, star: 3 }))).toBeCloseTo(1.38);
  });

  it('scaleFormulaLeaves 只乘公式叶，嵌套结构完整保留', () => {
    const scaled = scaleFormulaLeaves(
      { amount: { kind: 'attack', multiplier: 0.8 }, note: { deep: [{ kind: 'flat', value: 100 }] }, duration: 2 },
      1.5
    ) as { amount: { multiplier: number }; note: { deep: Array<{ value: number }> }; duration: number };
    expect(scaled.amount.multiplier).toBeCloseTo(1.2);
    expect(scaled.note.deep[0].value).toBeCloseTo(150);
    expect(scaled.duration).toBe(2); // 非公式数值是内容常量
  });

  it('applyGrowthToAbility：公式叶缩放而结构字段原样', () => {
    const grown = applyGrowthToAbility(resolveAbilityConfig(cfg), { perLevel: 0.02 }, makeHero({ level: 11 }));
    expect((grown.effects[0].params.amount as { multiplier: number }).multiplier).toBeCloseTo(0.96);
    expect(grown.effects[1].params.duration).toBe(2);
    expect(grown.cooldown).toBe(4);
  });
});

describe('milestones 补丁（绝对值替换、后者覆盖）', () => {
  const milestones = [
    { at: { level: 5 }, patch: { cooldown: 3, priority: 2 } },
    { at: { level: 20 }, patch: { cooldown: 2 } },
    { at: { awakened: true }, patch: { cost: { resource: 'mp', amount: 60 }, targeting: 'enemy:all' as const } }
  ];

  it('命中项依声明顺序应用，同字段后者赢', () => {
    const patched = applyMilestonesToAbility(resolveAbilityConfig(cfg), milestones, makeHero({ level: 30 }));
    expect(patched.cooldown).toBe(2);
    expect(patched.priority).toBe(2); // 只有第一个里程碑改了 priority
  });

  it('未达门槛的里程碑不生效', () => {
    const patched = applyMilestonesToAbility(resolveAbilityConfig(cfg), milestones, makeHero({ level: 6 }));
    expect(patched.cooldown).toBe(3);
    expect(patched.cost).toEqual({ resource: 'mp', amount: 20 }); // 未觉醒不改费用
  });

  it('觉醒后 cost 整对象替换 + targeting 替换', () => {
    const patched = applyMilestonesToAbility(
      resolveAbilityConfig(cfg),
      milestones,
      makeHero({ level: 30, awakened: true })
    );
    expect(patched.cost).toEqual({ resource: 'mp', amount: 60 });
    expect(patched.targeting).toBe('enemy:all');
  });
});

describe('天赋重写（索引定位部分替换、树序合成、压轴）', () => {
  const rwA: TalentRewrite = { targetAbilityId: 't_strike', priority: 5, effects: { '0': { kind: 'damage', params: { amount: { kind: 'flat', value: 50 } } } } };
  const rwB: TalentRewrite = { targetAbilityId: 't_strike', priority: 7 };
  const rwOther: TalentRewrite = { targetAbilityId: 'other_skill', priority: 99 };

  it('priority 覆盖 + 指定索引替换、未提及效果保留', () => {
    const out = applyRewritesToAbility(resolveAbilityConfig(cfg), [rwA]);
    expect(out.priority).toBe(5);
    expect(out.effects[0].kind).toBe('damage');
    expect(out.effects[0].params.amount).toEqual({ kind: 'flat', value: 50 });
    expect(out.effects[1]).toEqual((cfg.effects ?? [])[1]); // 眩晕原样保留
  });

  it('多天赋重写同一技能按顺序合成（后者覆盖前者），他技能重写不串扰', () => {
    const out = applyRewritesToAbility(resolveAbilityConfig(cfg), [rwA, rwB, rwOther]);
    expect(out.priority).toBe(7);
    expect(out.effects[0].params.amount).toEqual({ kind: 'flat', value: 50 });
  });

  it('resolveSkillRow 全流程：growth → milestones → rewrites 压轴（天赋赢过成长）', () => {
    const row = {
      id: 'row',
      slot: 1 as const,
      ability: cfg,
      growth: { perStar: 5 },
      milestones: [{ at: {}, patch: { priority: 2 } }]
    };
    const out = resolveSkillRow(row, makeHero({ star: 3 }), [rwB]);
    expect(out.priority).toBe(7); // 天赋压轴覆盖 milestone 的 2
    // 公式叶经 perStar=5 × 星3 = ×16 缩放
    expect((out.effects[0].params.amount as { multiplier: number }).multiplier).toBeCloseTo(12.8);
  });
});

describe('编排与战斗接入', () => {
  it('无 skills.json 内容时 resolveHeroSkills 返回空数组', () => {
    expect(resolveHeroSkills('buster', makeHero())).toEqual([]);
  });

  it('collectHeroAbilities：有内容英雄走三槽解析；无内容英雄保持旧回退路径', () => {
    // 诺娃（样板内容）：1 级仅槽 1 解锁；觉醒后槽 3 经 skills.json 行产出（无需兜底）
    const lv1 = collectHeroAbilities('nova', makeHero());
    expect(lv1.map(a => a.abilityId)).toEqual(['basic_attack', 'nova_arc_bolt']);

    const awakenedNova = collectHeroAbilities('nova', makeHero({ awakened: true }));
    expect(awakenedNova.map(a => a.abilityId)).toEqual(['basic_attack', 'nova_arc_bolt', 'awaken_nova']);

    // 无内容英雄（buster）保持旧「普攻 + 觉醒技」行为
    const busterAwake = collectHeroAbilities('buster', makeHero({ awakened: true }));
    expect(busterAwake.map(a => a.abilityId)).toEqual(['basic_attack', 'awaken_buster']);
    const busterBase = collectHeroAbilities('buster', makeHero());
    expect(busterBase.map(a => a.abilityId)).toEqual(['basic_attack']);
  });
});
