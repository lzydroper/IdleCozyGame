import { describe, it, expect } from 'vitest';
import { selectTargets, type AbilityTargetContext } from './abilityTargeting';
import type { BattleUnitRuntime } from './turnEngine';

const unit = (
  id: string,
  side: 'hero' | 'enemy',
  hp: number,
  maxHp = hp,
  entryOrder = Number(id.replace(/\D/g, ''))
): BattleUnitRuntime => ({
  id,
  name: id,
  side,
  hp,
  maxHp,
  initiative: 0,
  abilities: [],
  stats: { attack: 1, defense: 0, maxHp, maxMp: 0, critRate: 0, critDmg: 1.5 },
  entryOrder
});

const makeCtx = (
  units: BattleUnitRuntime[],
  flags: Record<string, Record<string, number>> = {}
): AbilityTargetContext => ({
  getLivingUnits: (side) =>
    units
      .filter((u) => u.hp > 0 && (side === undefined || u.side === side))
      .sort((a, b) => a.entryOrder - b.entryOrder),
  getFlag: (id, flag) => flags[id]?.[flag] ?? 0
});

describe('selectTargets', () => {
  it('enemy:first 取入场序最小的存活敌人', () => {
    const hero = unit('hero1', 'hero', 10, 10, 1);
    const e2 = unit('e2', 'enemy', 10, 10, 2);
    const e3 = unit('e3', 'enemy', 10, 10, 3);
    expect(selectTargets(hero, makeCtx([hero, e3, e2]), 'enemy:first')).toEqual([e2]);
  });

  it('enemy:all 取全部存活敌人，按入场序', () => {
    const hero = unit('hero1', 'hero', 10, 10, 1);
    const e2 = unit('e2', 'enemy', 10, 10, 2);
    const e3 = unit('e3', 'enemy', 10, 10, 3);
    expect(selectTargets(hero, makeCtx([hero, e3, e2]), 'enemy:all')).toEqual([e2, e3]);
  });

  it('enemy:lowestHp 取最低生命，同生命按入场序', () => {
    const hero = unit('hero1', 'hero', 10, 10, 1);
    const e2 = unit('e2', 'enemy', 5, 10, 2);
    const e3 = unit('e3', 'enemy', 3, 10, 3);
    const e4 = unit('e4', 'enemy', 3, 10, 4);
    expect(selectTargets(hero, makeCtx([hero, e2, e3, e4]), 'enemy:lowestHp')).toEqual([e3]);
  });

  it('ally:self 返回自己', () => {
    const hero = unit('hero1', 'hero', 10, 10, 1);
    expect(selectTargets(hero, makeCtx([hero]), 'ally:self')).toEqual([hero]);
  });

  it('ally:lowestHpPercent 取生命百分比最低的友方', () => {
    const hero = unit('hero1', 'hero', 10, 10, 1);
    const h2 = unit('h2', 'hero', 3, 10, 2);
    const h3 = unit('h3', 'hero', 9, 10, 3);
    expect(selectTargets(hero, makeCtx([hero, h2, h3]), 'ally:lowestHpPercent')).toEqual([h2]);
  });

  it('ally:all 取全部存活友方，按入场序', () => {
    const hero = unit('hero1', 'hero', 10, 10, 1);
    const h2 = unit('h2', 'hero', 10, 10, 2);
    const e = unit('e3', 'enemy', 10, 10, 3);
    expect(selectTargets(hero, makeCtx([hero, h2, e]), 'ally:all')).toEqual([hero, h2]);
  });

  it('单目标敌方策略受嘲讽覆盖：选嘲讽值最高者，同值按入场序', () => {
    const hero = unit('hero1', 'hero', 10, 10, 1);
    const e2 = unit('e2', 'enemy', 10, 10, 2);
    const e3 = unit('e3', 'enemy', 10, 10, 3);
    const e4 = unit('e4', 'enemy', 10, 10, 4);
    const ctx = makeCtx([hero, e2, e3, e4], {
      e3: { taunt: 5 },
      e4: { taunt: 5 }
    });
    expect(selectTargets(hero, ctx, 'enemy:first')).toEqual([e3]);
    expect(selectTargets(hero, ctx, 'enemy:lowestHp')).toEqual([e3]);
  });

  it('enemy:all 不受嘲讽覆盖', () => {
    const hero = unit('hero1', 'hero', 10, 10, 1);
    const e2 = unit('e2', 'enemy', 10, 10, 2);
    const e3 = unit('e3', 'enemy', 10, 10, 3);
    const ctx = makeCtx([hero, e2, e3], { e2: { taunt: 5 } });
    expect(selectTargets(hero, ctx, 'enemy:all')).toEqual([e2, e3]);
  });


  it('enemy:first 对敌方单位取对手阵营首个存活英雄', () => {
    const hero1 = unit('hero1', 'hero', 10, 10, 1);
    const hero2 = unit('hero2', 'hero', 10, 10, 2);
    const enemy = unit('e3', 'enemy', 10, 10, 3);
    expect(selectTargets(enemy, makeCtx([hero1, hero2, enemy]), 'enemy:first')).toEqual([hero1]);
  });

  it('无有效目标返回空数组', () => {
    const hero = unit('hero1', 'hero', 10, 10, 1);
    expect(selectTargets(hero, makeCtx([hero]), 'enemy:first')).toEqual([]);
    expect(selectTargets(hero, makeCtx([hero]), 'ally:all')).toEqual([hero]);
  });
});