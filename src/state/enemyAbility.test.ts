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

const hero = makeEntity('hero1', '英雄', 'hero', 100000, 0);

describe('敌人能力入口', () => {
  it('配置了能力的敌人与英雄共用同一 Ability 执行器', () => {
    const enemy = makeEntity('e1', '敌人', 'enemy', 1000, 10, ['awaken_buster']);
    const battle = simulateBattle([hero], [enemy]);

    const enemyUsed = battle.events.find(
      (event) => event.key === 'abilityUsed' && event.sourceId === 'e1'
    );
    expect(enemyUsed).toBeDefined();
    expect(enemyUsed?.data.abilityId).toBe('awaken_buster');
  });

  it('未配置能力的敌人默认使用普通攻击', () => {
    const enemy = makeEntity('e1', '敌人', 'enemy', 1000, 10);
    const battle = simulateBattle([hero], [enemy]);

    const enemyUsed = battle.events.find(
      (event) => event.key === 'abilityUsed' && event.sourceId === 'e1'
    );
    expect(enemyUsed).toBeDefined();
    expect(enemyUsed?.data.abilityId).toBe('basic_attack');
  });
});
