import { describe, it, expect } from 'vitest';
import { createBattleContext } from './battleContext';
import {
  compilePassiveBuffConfig,
  collectPassiveBuffConfigs,
  applyPassiveAbilities,
  passiveBuffId
} from './abilityPassive';
import { resolveAbilityConfig, type ResolvedAbility } from './abilityTypes';
import type { TurnRuntime, BattleUnitRuntime, TurnTimingContext } from './turnEngine';
import type { BuffInstance } from './battleContext';
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

  it('createEffects 生成来源→目标的被动效果', () => {
    const ability = passiveAbility();
    const config = compilePassiveBuffConfig(ability);
    const source = makeUnit('hero1', [ability]);
    const target = makeUnit('enemy1');
    const instance: BuffInstance = {
      id: 'passive:hero1:lifesteal',
      buffId: passiveBuffId('lifesteal'),
      sourceId: 'hero1',
      targetId: 'hero1',
      stacks: 1,
      duration: null,
      values: {}
    };
    const runtime = fakeRuntime([source, target]);
    const timingCtx = {
      key: 'attackAfter',
      round: 1,
      unit: source,
      source,
      target,
      runtime,
      data: {}
    } as TurnTimingContext;

    const effects = config.createEffects(instance, timingCtx);
    expect(effects).toHaveLength(1);
    expect(effects[0].kind).toBe('heal');
    expect(effects[0].sourceId).toBe('hero1');
    expect(effects[0].targetId).toBe('enemy1');
    expect(effects[0].params).toEqual({ amount: 5 });
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