/**
 * Ability 配置注册表（combat-ability 01）：能力配置的唯一来源。
 *
 * 本文件只描述内容与数值；运行时解析见 src/state/abilityTypes.ts。
 * 觉醒技能与普通攻击在此统一为 AbilityConfig；旧 AwakenSkillConfig 的迁移在
 * combat-ability 实现票 06/09 完成，本票先建立注册表并保留旧数据不动。
 */

import type { AbilityConfig } from '../state/abilityTypes';

const strike = (
  id: string,
  name: string,
  description: string,
  multiplier: number,
  cooldown: number
): AbilityConfig => ({
  id,
  name,
  description,
  activation: 'active',
  targeting: 'enemy:first',
  cooldown,
  priority: 1,
  effects: [
    {
      kind: 'damage',
      params: { amount: { kind: 'attack', multiplier } }
    }
  ]
});

const aoe = (
  id: string,
  name: string,
  description: string,
  multiplier: number,
  cooldown: number
): AbilityConfig => ({
  id,
  name,
  description,
  activation: 'active',
  targeting: 'enemy:all',
  cooldown,
  priority: 1,
  effects: [
    {
      kind: 'damage',
      params: { amount: { kind: 'attack', multiplier } }
    }
  ]
});

const heal = (
  id: string,
  name: string,
  description: string,
  percent: number,
  cooldown: number
): AbilityConfig => ({
  id,
  name,
  description,
  activation: 'active',
  targeting: 'ally:self',
  cooldown,
  priority: 1,
  effects: [
    {
      kind: 'heal',
      params: { amount: { kind: 'maxHp', percent } }
    }
  ]
});

export const BASIC_ATTACK: AbilityConfig = {
  id: 'basic_attack',
  name: '普通攻击',
  description: '对单个敌人造成 100% 攻击伤害。',
  activation: 'active',
  targeting: 'enemy:first',
  cooldown: 0,
  priority: 0,
  effects: [
    {
      kind: 'damage',
      params: { amount: { kind: 'attack', multiplier: 1 } }
    }
  ]
};

export const ABILITY_CONFIGS: Record<string, AbilityConfig> = {
  basic_attack: BASIC_ATTACK,

  awaken_nova: aoe('awaken_nova', '电涌过载', '对全部敌人造成 80% 攻击的群体电击伤害。', 0.8, 3),
  awaken_buster: strike('awaken_buster', '拆解重击', '对单个敌人造成 220% 攻击的重击。', 2.2, 3),
  awaken_soldier: strike('awaken_soldier', '铁壁盾击', '对单个敌人造成 180% 攻击的盾击。', 1.8, 3),
  awaken_catherine: heal('awaken_catherine', '应急治疗', '恢复自身 40% 最大生命。', 0.4, 4),
  awaken_roy: strike('awaken_roy', '磁轨炮击', '对单个敌人造成 200% 攻击的炮击。', 2, 3),
  awaken_mei: heal('awaken_mei', '藤蔓再生', '恢复自身 35% 最大生命。', 0.35, 4),
  awaken_zero: strike('awaken_zero', '魂印突刺', '对单个敌人造成 200% 攻击的突刺。', 2, 3),
  awaken_healer: heal('awaken_healer', '净化之泉', '恢复自身 50% 最大生命。', 0.5, 4),
  awaken_apprentice: aoe('awaken_apprentice', '星屑散射', '对全部敌人造成 70% 攻击的星屑伤害。', 0.7, 3)
};

export const getAbilityConfig = (abilityId: string): AbilityConfig | undefined =>
  ABILITY_CONFIGS[abilityId];
