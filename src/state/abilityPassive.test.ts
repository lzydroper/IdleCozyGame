import { describe, it, expect } from 'vitest';
import { createBattleContext } from './battleContext';
import {
  compilePassiveBuffConfig,
  collectPassiveBuffConfigs,
  applyPassiveAbilities,
  passiveBuffId
} from './abilityPassive';
import { resolveAbilityConfig, type ResolvedAbility } from './abilityTypes';
import type { TurnRuntime, BattleUnitRuntime } from './turnEngine';
import { makeFakeRuntime } from './testFixtures/battleRuntime';

const makeUnit = (id: string, abilities: ResolvedAbility[] = []): BattleUnitRuntime => ({
  id,
  name: id,
  side: 'hero',
  hp: 100,
  maxHp: 100,
  initiative: 0,
  abilities: abilities as unknown as BattleUnitRuntime['abilities'],
  stats: { attack: 10, defense: 0, maxHp: 100, maxMp: 0, critRate: 0, critDmg: 1.5 },
  entryOrder: 1
});

// 共享工厂（combat-assembly 04 / E#7）。
const fakeRuntime = (units: BattleUnitRuntime[]): TurnRuntime => makeFakeRuntime(units).runtime;

const passiveAbility = (): ResolvedAbility =>
  resolveAbilityConfig({
    id: 'lifesteal',
    name: '吸血',
    description: '',
    activation: 'passive',
    passive: {
      triggers: [{ timing: 'attackAfter', unitRef: 'source' }],
      effects: [{ kind: 'heal', params: { amount: { kind: 'flat', value: 5 } } }]
    }
  });

describe('compilePassiveBuffConfig', () => {
  it('编译为不可驱散的 forever Buff，并保留触发与效果', () => {
    const config = compilePassiveBuffConfig(passiveAbility());
    expect(config.buffId).toBe(passiveBuffId('lifesteal'));
    expect(config.durationKind).toBe('forever');
    expect(config.removable).toBe(false);
    expect(config.triggers).toEqual([{ timing: 'attackAfter', unitRef: 'source' }]);
  });

  it('effects 直载模板（批次③数据驱动：公式由物化器结算时解析）', () => {
    const ability = passiveAbility();
    const config = compilePassiveBuffConfig(ability);
    expect(config.effects).toEqual([
      { kind: 'heal', params: { amount: { kind: 'flat', value: 5 } } }
    ]);
  });
});

describe('applyPassiveAbilities', () => {
  it('把被动挂到目标单位，且被动 Buff 不可驱散', () => {
    const ability = passiveAbility();
    const unit = makeUnit('hero1', [ability]);
    const config = compilePassiveBuffConfig(ability);
    const battle = createBattleContext(fakeRuntime([unit]), { [config.buffId]: config });

    applyPassiveAbilities(battle, [unit]);

    const applied = battle.getBuff('hero1', passiveBuffId('lifesteal'));
    expect(applied).toBeDefined();
    expect(battle.removeBuff('hero1', passiveBuffId('lifesteal'))).toBe(false);
  });

  it('collectPassiveBuffConfigs 只收集被动能力', () => {
    const active = resolveAbilityConfig({
      id: 'basic_attack',
      name: '普通攻击',
      description: '',
      activation: 'active',
      effects: []
    });
    const passive = passiveAbility();
    const configs = collectPassiveBuffConfigs([active, passive]);
    expect(Object.keys(configs)).toEqual([passiveBuffId('lifesteal')]);
  });
});