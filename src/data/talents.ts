// 职阶天赋树配置（ticket 11）：职阶公共主干 + 每英雄专属节点，各英雄天赋树独立。
// 升级获得天赋点（经验仅来自战斗），投入节点获得百分比战斗加成（生效于战斗数值）。
// 数据驱动：新增内容只需追加本文件配置，无需改动战斗逻辑。
import type { HeroClass } from '../types/game';
import type { CombatBonus } from './bonds';

export interface TalentNodeConfig {
  id: string;             // 全局唯一节点 id
  name: string;
  description: string;    // 每级效果描述
  maxLevel: number;
  effect: CombatBonus;    // 每级效果（百分比加成，按投入点数线性叠加）
  requires?: string[];    // 前置节点：需至少投入 1 点（缺省 = 无前置）
}

// 职阶公共主干：同职阶所有英雄共享，节点按顺序递进（后置节点依赖前置）
export const TALENT_TRUNKS: Record<HeroClass, TalentNodeConfig[]> = {
  guardian: [
    {
      id: 'trunk_guardian_bulwark',
      name: '钢铁壁垒',
      description: '生命上限 +3%/级',
      maxLevel: 3,
      effect: { maxHpPercent: 3 }
    },
    {
      id: 'trunk_guardian_bedrock',
      name: '磐石身躯',
      description: '防御 +2%/级',
      maxLevel: 3,
      effect: { defensePercent: 2 },
      requires: ['trunk_guardian_bulwark']
    },
    {
      id: 'trunk_guardian_commander',
      name: '战场统帅',
      description: '生命上限 +2%、防御 +1%/级',
      maxLevel: 2,
      effect: { maxHpPercent: 2, defensePercent: 1 },
      requires: ['trunk_guardian_bedrock']
    }
  ],
  attacker: [
    {
      id: 'trunk_attacker_edge',
      name: '锋芒毕露',
      description: '攻击 +3%/级',
      maxLevel: 3,
      effect: { attackPercent: 3 }
    },
    {
      id: 'trunk_attacker_flurry',
      name: '连环攻势',
      description: '攻击 +2%/级',
      maxLevel: 3,
      effect: { attackPercent: 2 },
      requires: ['trunk_attacker_edge']
    },
    {
      id: 'trunk_attacker_armor_break',
      name: '破甲重击',
      description: '攻击 +3%/级',
      maxLevel: 2,
      effect: { attackPercent: 3 },
      requires: ['trunk_attacker_flurry']
    }
  ],
  conductor: [
    {
      id: 'trunk_conductor_resonance',
      name: '心灵共鸣',
      description: '生命上限 +2%/级',
      maxLevel: 3,
      effect: { maxHpPercent: 2 }
    },
    {
      id: 'trunk_conductor_inspire',
      name: '鼓舞士气',
      description: '攻击 +2%/级',
      maxLevel: 3,
      effect: { attackPercent: 2 },
      requires: ['trunk_conductor_resonance']
    },
    {
      id: 'trunk_conductor_chord',
      name: '守护和弦',
      description: '防御 +2%/级',
      maxLevel: 2,
      effect: { defensePercent: 2 },
      requires: ['trunk_conductor_inspire']
    }
  ]
};

// 每英雄专属节点：各英雄天赋树独立，专属分支挂载在对应职阶主干入口之后
export const HERO_TALENTS: Record<string, TalentNodeConfig[]> = {
  nova: [
    {
      id: 'hero_nova_overdrive',
      name: '过载引擎',
      description: '攻击 +2%/级',
      maxLevel: 3,
      effect: { attackPercent: 2 },
      requires: ['trunk_attacker_edge']
    }
  ],
  buster: [
    {
      id: 'hero_buster_hunter',
      name: '废土猎手',
      description: '攻击 +2%/级',
      maxLevel: 3,
      effect: { attackPercent: 2 },
      requires: ['trunk_attacker_edge']
    }
  ],
  soldier: [
    {
      id: 'hero_soldier_fortress',
      name: '阵地防御',
      description: '防御 +3%/级',
      maxLevel: 3,
      effect: { defensePercent: 3 },
      requires: ['trunk_guardian_bulwark']
    }
  ],
  catherine: [
    {
      id: 'hero_catherine_radiation',
      name: '辐射抗性',
      description: '生命上限 +3%/级',
      maxLevel: 3,
      effect: { maxHpPercent: 3 },
      requires: ['trunk_guardian_bulwark']
    }
  ],
  roy: [
    {
      id: 'hero_roy_synergy',
      name: '机械协同',
      description: '攻击 +2%/级',
      maxLevel: 3,
      effect: { attackPercent: 2 },
      requires: ['trunk_conductor_resonance']
    }
  ],
  mei: [
    {
      id: 'hero_mei_bounty',
      name: '自然馈赠',
      description: '生命上限 +2%、防御 +1%/级',
      maxLevel: 3,
      effect: { maxHpPercent: 2, defensePercent: 1 },
      requires: ['trunk_conductor_resonance']
    }
  ],
  zero: [
    {
      id: 'hero_zero_seal',
      name: '魂印疾行',
      description: '攻击 +2%/级',
      maxLevel: 3,
      effect: { attackPercent: 2 },
      requires: ['trunk_conductor_resonance']
    }
  ],
  healer: [
    {
      id: 'hero_healer_blessing',
      name: '净化祝福',
      description: '生命上限 +3%/级',
      maxLevel: 3,
      effect: { maxHpPercent: 3 },
      requires: ['trunk_conductor_resonance']
    }
  ],
  apprentice: [
    {
      id: 'hero_apprentice_craft',
      name: '星野巧思',
      description: '防御 +2%、攻击 +1%/级',
      maxLevel: 3,
      effect: { defensePercent: 2, attackPercent: 1 },
      requires: ['trunk_conductor_resonance']
    }
  ]
};

// 效果文案（UI 共用）：百分比加成 → 描述
export const formatTalentEffect = (effect: CombatBonus): string => {
  const parts: string[] = [];
  if (effect.attackPercent) parts.push(`攻击 +${effect.attackPercent}%`);
  if (effect.defensePercent) parts.push(`防御 +${effect.defensePercent}%`);
  if (effect.maxHpPercent) parts.push(`生命 +${effect.maxHpPercent}%`);
  return parts.join('、');
};
