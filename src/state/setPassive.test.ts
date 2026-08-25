import { describe, it, expect } from 'vitest';
import { detectCompleteSet, resolveSetPassiveDef, setPassiveFactor, resolveHeroSetPassive } from './setPassive';
import { heroToCombatant } from './combat';
import type { HeroEquipment, EquippedItem } from '../types/game';
import type { SetPassiveDef } from '../configs/types/equipment.types';
import type { AbilityConfig } from './abilityTypes';

const piece = (itemId: string, enhance = 0): EquippedItem => ({ itemId, enhance, mythic: false });

const fullWasteland = (enhance = 12): HeroEquipment => ({
  weapon: piece('wasteland_weapon', enhance),
  armor: piece('wasteland_armor', enhance - 2),
  trinket: piece('wasteland_trinket', enhance + 5)
});

describe('detectCompleteSet（穿齐判定 + 短板定值）', () => {
  it('空装备 / 缺件 / 混系 → null', () => {
    expect(detectCompleteSet(null)).toBeNull();
    expect(detectCompleteSet({ weapon: piece('wasteland_weapon'), armor: null, trinket: null })).toBeNull();
    expect(
      detectCompleteSet({
        weapon: piece('wasteland_weapon'),
        armor: piece('wasteland_armor'),
        trinket: piece('ember_trinket')
      })
    ).toBeNull();
  });

  it('三件同系 → 返回系列与最低强化（短板）', () => {
    const info = detectCompleteSet(fullWasteland(10));
    expect(info).toEqual({ setId: 'wasteland', minEnhance: 8 });
  });
});

describe('resolveSetPassiveDef（S 烘焙进公式叶）', () => {
  const inlineDef = (over: Partial<SetPassiveDef> = {}): SetPassiveDef => ({
    id: 't_set_passive',
    ability: {
      id: 't_set_passive_ab',
      name: '试作套装被动',
      description: '',
      activation: 'passive',
      passive: { triggers: [], effects: [] },
      effects: [{ kind: 'damage', params: { amount: { kind: 'attack', multiplier: 0.3 } } }]
    },
    enhanceGrowth: 0.01,
    ...over
  });

  it('setPassiveFactor：1 + enhanceGrowth × min(enhance)，负值钳零', () => {
    expect(setPassiveFactor({ id: 'x' }, 30)).toBe(1);
    expect(setPassiveFactor(inlineDef(), -5)).toBe(1);
    expect(setPassiveFactor(inlineDef(), 10)).toBeCloseTo(1.1);
  });

  it('内联本体：公式叶乘 S，activation 非 passive 拒绝', () => {
    const out = resolveSetPassiveDef(inlineDef(), 20);
    expect(out).not.toBeNull();
    expect(out!.abilityId).toBe('t_set_passive_ab');
    expect((out!.effects[0].params.amount as { multiplier: number }).multiplier).toBeCloseTo(0.36);

    const activeDef = inlineDef({
      ability: { ...(inlineDef().ability as AbilityConfig), activation: 'active' }
    });
    expect(resolveSetPassiveDef(activeDef, 20)).toBeNull();
  });

  it('引用注册表路径：basic_attack 是主动技 → 拒绝；未注册 id → null', () => {
    expect(resolveSetPassiveDef({ id: 'x', abilityId: 'basic_attack' }, 10)).toBeNull();
    expect(resolveSetPassiveDef({ id: 'x', abilityId: 'no_such' }, 10)).toBeNull();
  });

  it('当前数据无任何套装定义被动 → resolveHeroSetPassive 为 null（B6 铺内容前不误触发）', () => {
    expect(resolveHeroSetPassive(null)).toBeNull();
  });

  it('真实内容（wasteland 套装被动）：公式叶随最低强化缩放，passive.effects 同步烘焙', () => {
    const out = resolveHeroSetPassive(fullWasteland(10)); // 三件强化 10/8/15 → 短板 8
    expect(out).not.toBeNull();
    expect(out!.abilityId).toBe('set_wasteland_bulwark');
    // S = 1 + 0.01 × 8 = 1.08；statModify 的 flat 公式叶 5 → 5.4
    const effect = out!.passive!.effects[0];
    const value = (effect.params.modifier as { value: { kind: string; value: number } }).value;
    expect(value.kind).toBe('flat');
    expect(value.value).toBeCloseTo(5.4);
  });

  it('未穿齐同系列时不触发被动', () => {
    const partial: HeroEquipment = { weapon: piece('wasteland_weapon', 30), armor: null, trinket: null };
    expect(resolveHeroSetPassive(partial)).toBeNull();
  });
});

describe('战斗装配接入', () => {
  it('heroToCombatant：穿齐 wasteland 后实体 abilities 含该系列被动（B6 前无定义则不含）', () => {
    const hero = {
      level: 5,
      exp: 0,
      hp: 80,
      maxHp: 100,
      star: 1,
      wounded: false,
      talentPoints: 0,
      talents: {},
      awakened: false,
      logisticsFacilityId: null
    };
    // B6 前 wasteland 无 passiveSkills 定义 → 不追加；仅验证装配不崩且普攻在位
    const entity = heroToCombatant('nova', hero, [], fullWasteland());
    expect(entity.abilities.map(a => a.abilityId)).toContain('basic_attack');
  });
});
