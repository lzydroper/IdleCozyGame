import { describe, it, expect } from 'vitest';
import { simulateBattle } from './combat';
import { buildEntity, type BattleEntity } from './battleEntity';
import { DEFAULT_PRIMARY_ATTRIBUTES, DEFAULT_SPECIAL_ATTRIBUTES } from '../configs/constants/statConfig';
import { getAbilityConfig } from '../configs/loaders/combat.loader';
import { resolveAbilityConfig } from './abilityTypes';

const makeEntity = (
  id: string,
  name: string,
  side: 'hero' | 'enemy',
  maxHp: number,
  attack: number,
  abilityIds: string[] = []
): BattleEntity => {
  const recipe = {
    baseAttributes: { attack, defense: 0, maxHp, maxMp: 0, critRate: 0, critDmg: 1.5 },
    primaryAttributes: { ...DEFAULT_PRIMARY_ATTRIBUTES },
    specialAttributes: { ...DEFAULT_SPECIAL_ATTRIBUTES },
    permanentModifiers: []
  };
  const abilities = [resolveAbilityConfig(getAbilityConfig('basic_attack')!)];
  for (const abilityId of abilityIds) {
    const config = getAbilityConfig(abilityId);
    if (config) abilities.push(resolveAbilityConfig(config));
  }
  return buildEntity({
    id,
    name,
    kind: side === 'hero' ? 'hero' : 'enemy',
    side,
    faction: side === 'hero' ? 'mechanical' : 'nightmare',
    recipe,
    abilities
  });
};

describe('Ability 执行器与主动技能', () => {
  it('觉醒 AOE 技能经新 Ability 层首轮击杀多个敌人', () => {
    const hero = makeEntity('nova', '诺娃', 'hero', 1000, 100, ['awaken_nova']);
    const enemies = [
      makeEntity('e1', '敌1', 'enemy', 80, 0),
      makeEntity('e2', '敌2', 'enemy', 80, 0),
      makeEntity('e3', '敌3', 'enemy', 80, 0)
    ];

    const battle = simulateBattle([hero], enemies);
    expect(battle.victory).toBe(true);
    expect(battle.rounds).toBe(1);
  });

  it('冷却按已过自身回合递减：高伤技能不能连续施放', () => {
    const hero = makeEntity('buster', '巴斯特', 'hero', 100000, 500, ['awaken_buster']);
    const enemy = makeEntity('e1', '敌1', 'enemy', 5000, 0);

    const battle = simulateBattle([hero], [enemy]);
    expect(battle.victory).toBe(true);
    // 技能 1100，普通攻击 500；冷却 3：技能在第 1/5/8 回合，第 8 回合击杀。
    expect(battle.rounds).toBe(8);
  });

  it('每次能力激活写入 abilityUsed 事件，攻击型保留 attackAfter', () => {
    const hero = makeEntity('nova', '诺娃', 'hero', 1000, 100, ['awaken_nova']);
    const enemy = makeEntity('e1', '敌1', 'enemy', 80, 0);
    const battle = simulateBattle([hero], [enemy]);

    const used = battle.events.find((e) => e.key === 'abilityUsed');
    expect(used).toBeDefined();
    expect(used?.data.abilityId).toBe('awaken_nova');
    expect(used?.data.targetIds).toEqual(['e1']);
    expect(used?.data.costPaid).toBeNull();
    expect(used?.data.cooldownSet).toBe(3);
    expect(battle.events.some((e) => e.key === 'attackAfter')).toBe(true);
  });
});
