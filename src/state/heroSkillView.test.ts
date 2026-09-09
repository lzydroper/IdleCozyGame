import { describe, it, expect } from 'vitest';
import { buildHeroSkillViews, formatSkillCondition } from './heroSkillView';
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

// 真实内容驱动（nova/skills.json）：诺娃是样板英雄
describe('buildHeroSkillViews（nova 样板内容）', () => {
  it('1 级新星：槽1 解锁产出能力，槽2/3 锁定不产出', () => {
    const views = buildHeroSkillViews('nova', makeHero());
    expect(views.map(v => v.row.slot)).toEqual([1, 2, 3]);

    const [slot1, slot2, slot3] = views;
    expect(slot1.unlocked).toBe(true);
    expect(slot1.ability?.abilityId).toBe('nova_arc_bolt');
    expect(slot2.unlocked).toBe(false);
    expect(slot2.ability).toBeNull();
    expect(slot3.unlocked).toBe(false);
    expect(formatSkillCondition(slot2.row.unlock)).toBe('等级 ≥10');
    expect(formatSkillCondition(slot3.row.unlock)).toBe('完成觉醒');
  });

  it('解锁与成长：12 级槽2 解锁，flat 值 ×(1+0.02×11)=1.22', () => {
    const views = buildHeroSkillViews('nova', makeHero({ level: 12 }));
    const slot2 = views.find(v => v.row.slot === 2)!;
    expect(slot2.unlocked).toBe(true);
    const amount = slot2.ability!.effects[0].params.amount as { kind: string; value: number };
    expect(amount.kind).toBe('flat');
    expect(amount.value).toBeCloseTo(48.8);
  });

  it('里程碑：20 级冷却降为 3；觉醒后费用替换为 25', () => {
    const patched = buildHeroSkillViews('nova', makeHero({ level: 22 })).find(v => v.row.slot === 2)!;
    expect(patched.ability!.cooldown).toBe(3);

    const awakenedView = buildHeroSkillViews(
      'nova',
      makeHero({ level: 22, awakened: true })
    ).find(v => v.row.slot === 2)!;
    expect(awakenedView.ability!.cost).toEqual({ resource: 'mp', amount: 25 });
    // 槽3 觉醒技随觉醒解锁并进入视图
    expect(awakenedView && buildHeroSkillViews('nova', makeHero({ awakened: true })).find(v => v.row.slot === 3)!.ability?.abilityId).toBe('awaken_nova');
  });

  it('天赋重写压轴：投入「电弧重构」后槽2 效果被改写为 attack 公式且优先级 6', () => {
    const hero = makeHero({
      level: 12,
      awakened: true,
      talents: { hero_nova_rewire: 1 }
    });
    const slot2 = buildHeroSkillViews('nova', hero).find(v => v.row.slot === 2)!;
    expect(slot2.rewrites.length).toBe(1);

    const amount = slot2.ability!.effects[0].params.amount as { kind: string };
    expect(amount.kind).toBe('attack'); // flat 被重写为 attack 公式
    expect(slot2.ability!.priority).toBe(6); // 天赋覆盖里程碑的 priority 4? 未达星3 时里程碑不改——天赋直接赢

    // 重写效果同样吃 growth？否——重写在压轴整体替换，不再二次烘焙
    const multiplier = (slot2.ability!.effects[0].params.amount as { multiplier: number }).multiplier;
    expect(multiplier).toBeCloseTo(1.1);

    // 主描述模板被整体替换，占位符可正常渲染（110% 攻击伤害）
    expect(slot2.ability!.description).toContain('{attackPct}');
    expect(slot2.ability!.description).not.toContain('{value}');
  });

  it('未投入的重写节点不生效', () => {
    const slot2 = buildHeroSkillViews('nova', makeHero({ level: 12 })).find(v => v.row.slot === 2)!;
    expect(slot2.rewrites.length).toBe(0);
    expect(slot2.ability!.priority).toBe(3);
  });
});

describe('formatSkillCondition', () => {
  it('组合条件 AND 文案 / 缺省返回 null', () => {
    expect(formatSkillCondition(undefined)).toBeNull();
    expect(formatSkillCondition({})).toBeNull();
    expect(formatSkillCondition({ level: 10, star: 3, awakened: true })).toBe('等级 ≥10 且 星级 ≥3 且 完成觉醒');
  });
});
