import { describe, it, expect } from 'vitest';
import { simulateBattle, type CombatantState } from './combat';

const hero: CombatantState = {
  id: 'hero1',
  name: '英雄',
  hp: 100000,
  maxHp: 100000,
  attack: 0,
  defense: 0
};

describe('敌人能力入口', () => {
  it('配置了能力的敌人与英雄共用同一 Ability 执行器', () => {
    const enemy: CombatantState = {
      id: 'e1',
      name: '敌人',
      hp: 1000,
      maxHp: 1000,
      attack: 10,
      defense: 0,
      abilities: ['awaken_buster']
    };
    const battle = simulateBattle([hero], [enemy]);

    const enemyUsed = battle.events.find(
      (event) => event.key === 'abilityUsed' && event.sourceId === 'e1'
    );
    expect(enemyUsed).toBeDefined();
    expect(enemyUsed?.data.abilityId).toBe('awaken_buster');
  });

  it('未配置能力的敌人默认使用普通攻击', () => {
    const enemy: CombatantState = {
      id: 'e1',
      name: '敌人',
      hp: 1000,
      maxHp: 1000,
      attack: 10,
      defense: 0
    };
    const battle = simulateBattle([hero], [enemy]);

    const enemyUsed = battle.events.find(
      (event) => event.key === 'abilityUsed' && event.sourceId === 'e1'
    );
    expect(enemyUsed).toBeDefined();
    expect(enemyUsed?.data.abilityId).toBe('basic_attack');
  });
});
