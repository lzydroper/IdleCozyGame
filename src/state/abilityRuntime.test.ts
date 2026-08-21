import { describe, it, expect } from 'vitest';
import { simulateBattle, type CombatantState } from './combat';

describe('Ability 执行器与主动技能', () => {
  it('觉醒 AOE 技能经新 Ability 层首轮击杀多个敌人', () => {
    const hero: CombatantState = {
      id: 'nova',
      name: '诺娃',
      hp: 1000,
      maxHp: 1000,
      attack: 100,
      defense: 0,
      abilities: ['awaken_nova']
    };
    const enemies: CombatantState[] = [
      { id: 'e1', name: '敌1', hp: 80, maxHp: 80, attack: 0, defense: 0 },
      { id: 'e2', name: '敌2', hp: 80, maxHp: 80, attack: 0, defense: 0 },
      { id: 'e3', name: '敌3', hp: 80, maxHp: 80, attack: 0, defense: 0 }
    ];

    const battle = simulateBattle([hero], enemies);
    expect(battle.victory).toBe(true);
    expect(battle.rounds).toBe(1);
  });

  it('冷却按已过自身回合递减：高伤技能不能连续施放', () => {
    const hero: CombatantState = {
      id: 'buster',
      name: '巴斯特',
      hp: 100000,
      maxHp: 100000,
      attack: 500,
      defense: 0,
      abilities: ['awaken_buster']
    };
    const enemy: CombatantState = {
      id: 'e1',
      name: '敌1',
      hp: 5000,
      maxHp: 5000,
      attack: 0,
      defense: 0
    };

    const battle = simulateBattle([hero], [enemy]);
    expect(battle.victory).toBe(true);
    // 技能 1100，普通攻击 500；冷却 3：技能在第 1/5/8 回合，第 8 回合击杀。
    expect(battle.rounds).toBe(8);
  });

  it('每次能力激活写入 abilityUsed 事件，攻击型保留 attackAfter', () => {
    const hero: CombatantState = {
      id: 'nova',
      name: '诺娃',
      hp: 1000,
      maxHp: 1000,
      attack: 100,
      defense: 0,
      abilities: ['awaken_nova']
    };
    const enemy: CombatantState = { id: 'e1', name: '敌1', hp: 80, maxHp: 80, attack: 0, defense: 0 };
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