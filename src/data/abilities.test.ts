import { describe, it, expect } from 'vitest';
import { resolveAbilityConfig } from '../state/abilityTypes';
import { ABILITY_CONFIGS, getAbilityConfig } from './abilities';

describe('Ability 配置解析', () => {
  it('resolveAbilityConfig 填充默认值', () => {
    expect(
      resolveAbilityConfig({ id: 'x', name: 'X', description: '', activation: 'active' })
    ).toEqual({
      id: 'x',
      abilityId: 'x',
      name: 'X',
      description: '',
      activation: 'active',
      targeting: undefined,
      cost: undefined,
      cooldown: 0,
      priority: 0,
      formula: undefined,
      effects: [],
      passive: undefined
    });
  });

  it('resolveAbilityConfig 保留显式字段', () => {
    const cost = { resource: 'mp', amount: 12 };
    const formula = { kind: 'attack' as const, multiplier: 1.5 };
    expect(
      resolveAbilityConfig({
        id: 'y',
        name: 'Y',
        description: 'desc',
        activation: 'active',
        targeting: 'enemy:first',
        cost,
        cooldown: 3,
        priority: 2,
        formula,
        effects: [{ kind: 'damage', params: { amount: formula } }]
      })
    ).toMatchObject({
      id: 'y',
      abilityId: 'y',
      targeting: 'enemy:first',
      cost,
      cooldown: 3,
      priority: 2,
      formula,
      effects: [{ kind: 'damage', params: { amount: formula } }]
    });
  });
});

describe('能力注册表', () => {
  it('basic_attack 是显式普通攻击', () => {
    const basic = getAbilityConfig('basic_attack');
    expect(basic).toBeDefined();
    const resolved = resolveAbilityConfig(basic!);
    expect(resolved.activation).toBe('active');
    expect(resolved.targeting).toBe('enemy:first');
    expect(resolved.cost).toBeUndefined();
    expect(resolved.cooldown).toBe(0);
    expect(resolved.priority).toBe(0);
    expect(resolved.effects).toHaveLength(1);
    expect(resolved.effects[0]).toMatchObject({
      kind: 'damage',
      params: { amount: { kind: 'attack', multiplier: 1 } }
    });
  });

  it('觉醒技能全部迁入注册表', () => {
    const awakenIds = Object.keys(ABILITY_CONFIGS).filter((id) => id.startsWith('awaken_'));
    expect(awakenIds).toHaveLength(9);

    const nova = resolveAbilityConfig(getAbilityConfig('awaken_nova')!);
    expect(nova.targeting).toBe('enemy:all');
    expect(nova.cooldown).toBe(3);
    expect(nova.effects[0].params.amount).toEqual({ kind: 'attack', multiplier: 0.8 });

    const catherine = resolveAbilityConfig(getAbilityConfig('awaken_catherine')!);
    expect(catherine.targeting).toBe('ally:self');
    expect(catherine.effects[0].kind).toBe('heal');
    expect(catherine.effects[0].params.amount).toEqual({ kind: 'maxHp', percent: 0.4 });
  });
});
  it('所有觉醒技能解析结果与旧数值一致', () => {
    const expected: Array<{
      id: string;
      targeting: 'enemy:first' | 'enemy:all' | 'ally:self';
      cooldown: number;
      kind: 'damage' | 'heal';
      value: { kind: 'attack'; multiplier: number } | { kind: 'maxHp'; percent: number };
    }> = [
      { id: 'awaken_nova', targeting: 'enemy:all', cooldown: 3, kind: 'damage', value: { kind: 'attack', multiplier: 0.8 } },
      { id: 'awaken_buster', targeting: 'enemy:first', cooldown: 3, kind: 'damage', value: { kind: 'attack', multiplier: 2.2 } },
      { id: 'awaken_soldier', targeting: 'enemy:first', cooldown: 3, kind: 'damage', value: { kind: 'attack', multiplier: 1.8 } },
      { id: 'awaken_catherine', targeting: 'ally:self', cooldown: 4, kind: 'heal', value: { kind: 'maxHp', percent: 0.4 } },
      { id: 'awaken_roy', targeting: 'enemy:first', cooldown: 3, kind: 'damage', value: { kind: 'attack', multiplier: 2 } },
      { id: 'awaken_mei', targeting: 'ally:self', cooldown: 4, kind: 'heal', value: { kind: 'maxHp', percent: 0.35 } },
      { id: 'awaken_zero', targeting: 'enemy:first', cooldown: 3, kind: 'damage', value: { kind: 'attack', multiplier: 2 } },
      { id: 'awaken_healer', targeting: 'ally:self', cooldown: 4, kind: 'heal', value: { kind: 'maxHp', percent: 0.5 } },
      { id: 'awaken_apprentice', targeting: 'enemy:all', cooldown: 3, kind: 'damage', value: { kind: 'attack', multiplier: 0.7 } }
    ];

    for (const entry of expected) {
      const resolved = resolveAbilityConfig(getAbilityConfig(entry.id)!);
      expect(resolved.targeting).toBe(entry.targeting);
      expect(resolved.cooldown).toBe(entry.cooldown);
      expect(resolved.effects).toHaveLength(1);
      expect(resolved.effects[0].kind).toBe(entry.kind);
      expect(resolved.effects[0].params.amount).toEqual(entry.value);
    }
  });