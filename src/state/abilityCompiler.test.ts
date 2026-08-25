import { describe, it, expect } from 'vitest';
import { evaluateFormula, compileAbilityEffects } from './abilityCompiler';
import { resolveAbilityConfig, type EffectTemplate } from './abilityTypes';
import type { BattleUnitRuntime } from './turnEngine';
import type { BattleUnitStats } from './battleTypes';

const stats: BattleUnitStats = {
  attack: 100,
  defense: 0,
  maxHp: 1000,
  maxMp: 0,
  critRate: 0,
  critDmg: 1.5
};

const unit = (id: string, side: 'hero' | 'enemy' = 'enemy'): BattleUnitRuntime => ({
  id,
  name: id,
  side,
  hp: 100,
  maxHp: 100,
  initiative: 0,
  abilities: [],
  stats,
  entryOrder: Number(id.replace(/\D/g, '')) || 1
});

const ability = (effects: EffectTemplate[]) =>
  resolveAbilityConfig({
    id: 'test_ability',
    name: '测试能力',
    description: '',
    activation: 'active',
    targeting: 'enemy:first',
    effects
  });

describe('evaluateFormula', () => {
  it('attack 模板：攻击 × 倍率', () => {
    expect(evaluateFormula({ kind: 'attack', multiplier: 1.2 }, stats)).toBe(120);
  });

  it('maxHp 模板：最大生命 × 百分比', () => {
    expect(evaluateFormula({ kind: 'maxHp', percent: 0.4 }, stats)).toBe(400);
  });

  it('flat 模板：固定值', () => {
    expect(evaluateFormula({ kind: 'flat', value: 7 }, stats)).toBe(7);
  });
});

describe('compileAbilityEffects', () => {
  it('把公式求值后展开为单个伤害效果', () => {
    const source = unit('src');
    const target = unit('t2');
    const result = compileAbilityEffects(
      ability([{ kind: 'damage', params: { amount: { kind: 'attack', multiplier: 1.2 } } }]),
      source,
      [target],
      stats,
      () => 'effect-1'
    );

    expect(result.fireCount).toBe(1);
    expect(result.effects).toHaveLength(1);
    expect(result.effects[0]).toMatchObject({
      id: 'effect-1',
      effectId: 'test_ability:damage',
      kind: 'damage',
      sourceId: 'src',
      targetId: 't2',
      origin: { kind: 'ability', id: 'test_ability' },
      params: { amount: 120 }
    });
  });

  it('多目标拆成单目标效果', () => {
    const source = unit('src');
    const t2 = unit('t2');
    const t3 = unit('t3');
    const result = compileAbilityEffects(
      ability([{ kind: 'damage', params: { amount: { kind: 'flat', value: 10 } } }]),
      source,
      [t2, t3],
      stats,
      (() => { let i = 0; return () => 'effect-' + ++i; })()
    );

    expect(result.effects).toHaveLength(2);
    expect(result.effects.map((e) => e.targetId)).toEqual(['t2', 't3']);
    expect(result.effects.map((e) => e.id)).toEqual(['effect-1', 'effect-2']);
  });

  it('fireCount 复制效果并生成唯一 id', () => {
    const source = unit('src');
    const target = unit('t2');
    const result = compileAbilityEffects(
      ability([{ kind: 'heal', params: { amount: { kind: 'maxHp', percent: 0.4 } }, fireCount: 2 }]),
      source,
      [target],
      stats,
      (() => { let i = 0; return () => 'effect-' + ++i; })()
    );

    expect(result.fireCount).toBe(2);
    expect(result.effects).toHaveLength(2);
    expect(result.effects[0].params).toEqual({ amount: 400 });
    expect(result.effects[0].id).not.toBe(result.effects[1].id);
  });

  it('applyBuff 模板构造 Buff 实例', () => {
    const source = unit('src');
    const target = unit('t2');
    const result = compileAbilityEffects(
      ability([
        {
          kind: 'applyBuff',
          params: { buffId: 'burn', duration: 3, stacks: 1, values: { amount: 30 } }
        }
      ]),
      source,
      [target],
      stats,
      () => 'effect-1'
    );

    expect(result.effects).toHaveLength(1);
    const effect = result.effects[0];
    expect(effect.kind).toBe('applyBuff');
    expect(effect.params).toMatchObject({
      buffInstance: {
        buffId: 'burn',
        sourceId: 'src',
        targetId: 't2',
        stacks: 1,
        duration: 3,
        values: { amount: 30 }
      }
    });
  });
});
