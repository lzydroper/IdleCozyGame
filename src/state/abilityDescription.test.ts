import { describe, it, expect, vi } from 'vitest';
import { renderAbilityDescription, descriptionTokenValue } from './abilityDescription';
import { resolveAbilityConfig, type AbilityConfig } from './abilityTypes';

const ab = (over: Partial<AbilityConfig> = {}): AbilityConfig => ({
  id: 't_desc',
  name: '描述测试',
  description: '',
  activation: 'active',
  effects: [{ kind: 'damage', params: { amount: { kind: 'attack', multiplier: 0.9 } } }],
  ...over
});

describe('renderAbilityDescription（heroes-skills spec §4.1）', () => {
  it('{attackPct} → 公式叶倍率百分数', () => {
    const resolved = resolveAbilityConfig(ab({ description: '对单个敌人造成 {attackPct} 攻击伤害。' }));
    expect(renderAbilityDescription(resolved.description, resolved)).toBe('对单个敌人造成 90% 攻击伤害。');
  });

  it('{maxHpPct} 与 {value} 词表', () => {
    const heal = resolveAbilityConfig(
      ab({ description: '恢复 {maxHpPct} 生命', effects: [{ kind: 'heal', params: { amount: { kind: 'maxHp', percent: 0.4 } } }] })
    );
    expect(renderAbilityDescription(heal.description, heal)).toBe('恢复 40% 生命');

    const flat = resolveAbilityConfig(
      ab({ description: '造成 {value} 点伤害', effects: [{ kind: 'damage', params: { amount: { kind: 'flat', value: 40.6 } } }] })
    );
    expect(renderAbilityDescription(flat.description, flat)).toBe('造成 41 点伤害');
  });

  it('烘焙后的烘焙值优先：growth 缩放反映在渲染里', () => {
    const resolved = {
      ...resolveAbilityConfig(ab({ description: '造成 {attackPct} 攻击伤害' })),
      effects: [{ kind: 'damage' as const, params: { amount: { kind: 'attack', multiplier: 1.08 } } }]
    };
    expect(descriptionTokenValue(resolved, 'attackPct')).toBe('108%');
  });

  it('无匹配公式时占位符原样保留', () => {
    const resolved = resolveAbilityConfig(ab({ description: '数值 {attackPct}' }));
    // effects 里没有 attack 公式 → 无值可填，原样保留
    expect(renderAbilityDescription('数值 {value}', resolved)).toBe('数值 {value}');
  });

  it('未登记占位符原样保留且 DEV 告警', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const resolved = resolveAbilityConfig(ab({ description: '神秘 {unknownKey} 占位' }));
    expect(renderAbilityDescription(resolved.description, resolved)).toBe('神秘 {unknownKey} 占位');
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('ability 为 null 时原文返回（锁定态基准模板）', () => {
    expect(renderAbilityDescription('造成 {attackPct} 伤害', null)).toBe('造成 {attackPct} 伤害');
  });
});
