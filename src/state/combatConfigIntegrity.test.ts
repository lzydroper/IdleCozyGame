// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { validateCombatConfigIntegrity } from './entityFactory';
import { getAbilityConfig, ABILITY_CONFIGS } from '../configs/loaders/combat.loader';

describe('战斗配置完整性（combat-hygiene 05 / En#4/#9 seam）', () => {
  it('basic_attack 必存在且可解析', () => {
    expect(getAbilityConfig('basic_attack')).toBeTruthy();
  });

  it('能力注册表非空', () => {
    expect(Object.keys(ABILITY_CONFIGS).length).toBeGreaterThan(0);
  });

  it('全量敌人配置的能力引用均可解析（validateCombatConfigIntegrity 通过）', () => {
    expect(validateCombatConfigIntegrity()).toEqual([]);
  });
});
