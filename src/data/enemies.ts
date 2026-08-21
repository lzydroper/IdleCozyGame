/**
 * 敌人实体配置注册表（combat-entity ticket 01）。
 *
 * 所有参战敌人（普通敌人 / BOSS / 梦魇泄露体）统一为 EnemyConfig；
 * 战斗区域与探索事件只引用这里的敌人 id，不再内嵌敌人对象。
 * 完全 JSON 化与 Level 破坏性重构留给后续 effort。
 */

import type { EnemyConfig } from './entityConfig';

export const ENEMY_CONFIGS: Record<string, EnemyConfig> = {
  // 测试专用
  test_dummy: {
    id: 'test_dummy',
    name: '测试靶机',
    description: '军备测试场中的靶机。',
    kind: 'enemy',
    role: 'normal',
    faction: 'mechanical',
    baseAttributes: { maxHp: 10, attack: 1, defense: 0 }
  },
  test_boss: {
    id: 'test_boss',
    name: '测试领主',
    description: '军备测试场的领主。',
    kind: 'enemy',
    role: 'boss',
    faction: 'mechanical',
    baseAttributes: { maxHp: 20, attack: 2, defense: 0 }
  },

  // 废土边缘
  wasteland_hound: {
    id: 'wasteland_hound',
    name: '废土鬣狗',
    description: '饥饿的变异鬣狗。',
    kind: 'enemy',
    role: 'normal',
    faction: 'nightmare',
    baseAttributes: { maxHp: 45, attack: 9, defense: 3 }
  },
  mutant_rat: {
    id: 'mutant_rat',
    name: '变异鼠群',
    description: '成群的变异鼠。',
    kind: 'enemy',
    role: 'normal',
    faction: 'nightmare',
    baseAttributes: { maxHp: 30, attack: 7, defense: 1 }
  },
  mutant_rat_elite: {
    id: 'mutant_rat_elite',
    name: '变异鼠群',
    description: '旧城废墟中更凶悍的变异鼠群。',
    kind: 'enemy',
    role: 'normal',
    faction: 'nightmare',
    baseAttributes: { maxHp: 35, attack: 8, defense: 1 }
  },
  wasteland_hound_king: {
    id: 'wasteland_hound_king',
    name: '废土鬣狗王',
    description: '废土边缘的鬣狗首领。',
    kind: 'enemy',
    role: 'boss',
    faction: 'nightmare',
    baseAttributes: { maxHp: 90, attack: 13, defense: 5 }
  },

  // 旧城废墟
  ruin_scavenger: {
    id: 'ruin_scavenger',
    name: '废墟拾荒者',
    description: '盘踞旧城街区的拾荒匪徒。',
    kind: 'enemy',
    role: 'normal',
    faction: 'mechanical',
    baseAttributes: { maxHp: 80, attack: 16, defense: 4 }
  },
  ruin_overlord: {
    id: 'ruin_overlord',
    name: '废墟霸主',
    description: '旧城废墟的霸主。',
    kind: 'enemy',
    role: 'boss',
    faction: 'nightmare',
    baseAttributes: { maxHp: 150, attack: 20, defense: 8 }
  },

  // 辐射车间
  radiation_mutant: {
    id: 'radiation_mutant',
    name: '辐射变异体',
    description: '被辐射侵蚀的变异体。',
    kind: 'enemy',
    role: 'normal',
    faction: 'nightmare',
    baseAttributes: { maxHp: 130, attack: 20, defense: 6 }
  },
  rogue_machine: {
    id: 'rogue_machine',
    name: '失控机器仆从',
    description: '失控的自动化机器。',
    kind: 'enemy',
    role: 'normal',
    faction: 'mechanical',
    baseAttributes: { maxHp: 90, attack: 15, defense: 8 }
  },
  aberrant_subject: {
    id: 'aberrant_subject',
    name: '畸变实验体',
    description: '畸变的人造实验体。',
    kind: 'enemy',
    role: 'normal',
    faction: 'nightmare',
    baseAttributes: { maxHp: 70, attack: 18, defense: 5 }
  },
  workshop_abomination: {
    id: 'workshop_abomination',
    name: '车间之主·畸变聚合体',
    description: '辐射车间深处的畸变聚合体。',
    kind: 'enemy',
    role: 'boss',
    faction: 'nightmare',
    baseAttributes: { maxHp: 260, attack: 26, defense: 10 }
  },

  // 梦魇泄露体（属性中的 maxHp 为占位，战斗前按泄露血量覆盖）
  dream_leak_nightmare: {
    id: 'dream_leak_nightmare',
    name: '梦魇侵入体',
    description: '梦境污染达到 100% 时逸出的梦魇实体。',
    kind: 'enemy',
    role: 'nightmare',
    faction: 'nightmare',
    baseAttributes: { maxHp: 60, attack: 14, defense: 4 }
  }
};
