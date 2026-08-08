// 职阶天赋树配置（ticket 11 → 09 树形重设计）：职阶公共主干 + 每英雄专属节点，各英雄天赋树独立。
// 升级获得天赋点（经验仅来自战斗），投入节点获得百分比战斗加成（生效于战斗数值）。
// 数据驱动：新增内容只需追加本文件配置，无需改动战斗逻辑。
//
// 树形数据结构（09）：
// - `pos: { row, col }` —— 相对坐标：row = 行（根为第 0 行，子节点行 = 父节点行 + 1），col = 该行从左到右的序号（0 起）。
// - `children?: string[]` —— 子节点 id 列表（顺序 = 槽位顺序，从左到右）。布局引擎按子节点数自动定槽位：
//   1 个 → 正下（直线）；2 个 → 左下、右下；3 个 → 左下、正下、右下；同一父节点的子节点在同一水平线上。
//   （职阶主干在配置中只声明主干链子节点；英雄专属节点由 `buildTalentTree` 挂到其 `requires` 父节点的 children 末尾；
//     也可写 `gate` 而不写 `requires` 构成独立竖线——该节点仍在树中，但独立布局、不画连线。）
// - `requires?: string[]` —— 父节点（阻塞来源）：父节点已投入点数 ≥1 时子节点才可升级；查看信息不受限。
// - `gate?: TalentGate[]` —— 通用解锁门控（07 号）：一组条件全部满足（AND）才可升级；只阻塞、不画线
//   （与 requires 的画线语义解耦——独立竖线节点可写 gate 而不写 requires）。
import type { HeroClass } from '../types/game';
import type { CombatBonus } from './bonds';
import { formatBonus } from './bonds';
import { HEROES_CONFIG } from './heroes';

// 天赋门控条件（07 号）：各条件均为布尔判定，全部满足才解锁节点。
// talent 条件用 operator 直观表达投入关系（含互斥）：
//   greater → 投入 > value（正向依赖：greater 0 即已投入，整数点）
//   equal   → 投入 = value（equal 0 即未投入，用于互斥分支）
//   less    → 投入 < value（整数点下 < N 等价 ≤ N-1）
export type TalentGate =
  | { type: 'talent'; nodeId: string; operator: 'greater' | 'equal' | 'less'; value: number }
  | { type: 'awakened' }                                   // 英雄已觉醒
  | { type: 'heroLevel'; minLevel: number }                // 角色等级 ≥ minLevel
  | { type: 'star'; minLevel: number };                    // 星级 ≥ minLevel

export interface TalentNodeConfig {
  id: string;             // 全局唯一节点 id
  name: string;
  maxLevel: number;
  effect: CombatBonus;    // 每级效果（百分比加成，按投入点数线性叠加）；描述由 formatBonus 自动导出，无需手写
  pos: { row: number; col: number }; // 相对坐标（09：row 行、col 行内序号 0 起）
  requires?: string[];    // 父节点（阻塞来源 + 画线来源）：需父节点已投入 ≥1 点
  children?: string[];    // 子节点列表（09：布局画线来源；顺序 = 槽位顺序）
  gate?: TalentGate[];    // 额外解锁门控（07 号）：全部满足才可点；只阻塞不画线
}

// 职阶公共主干：同职阶所有英雄共享，节点按顺序递进（后置节点依赖前置）
export const TALENT_TRUNKS: Record<HeroClass, TalentNodeConfig[]> = {
  guardian: [
    {
      id: 'trunk_guardian_bulwark',
      name: '钢铁壁垒',
      maxLevel: 3,
      effect: { maxHpPercent: 3 },
      pos: { row: 0, col: 0 },
      children: ['trunk_guardian_bedrock']
    },
    {
      id: 'trunk_guardian_bedrock',
      name: '磐石身躯',
      maxLevel: 3,
      effect: { defensePercent: 2 },
      pos: { row: 1, col: 0 },
      requires: ['trunk_guardian_bulwark'],
      children: ['trunk_guardian_commander']
    },
    {
      id: 'trunk_guardian_commander',
      name: '战场统帅',
      maxLevel: 2,
      effect: { maxHpPercent: 2, defensePercent: 1 },
      pos: { row: 2, col: 0 },
      requires: ['trunk_guardian_bedrock']
    }
  ],
  attacker: [
    {
      id: 'trunk_attacker_edge',
      name: '锋芒毕露',
      maxLevel: 3,
      effect: { attackPercent: 3 },
      pos: { row: 0, col: 0 },
      children: ['trunk_attacker_flurry']
    },
    {
      id: 'trunk_attacker_flurry',
      name: '连环攻势',
      maxLevel: 3,
      effect: { attackPercent: 2 },
      pos: { row: 1, col: 0 },
      requires: ['trunk_attacker_edge'],
      children: ['trunk_attacker_armor_break']
    },
    {
      id: 'trunk_attacker_armor_break',
      name: '破甲重击',
      maxLevel: 2,
      effect: { attackPercent: 3 },
      pos: { row: 2, col: 0 },
      requires: ['trunk_attacker_flurry']
    }
  ],
  conductor: [
    {
      id: 'trunk_conductor_resonance',
      name: '心灵共鸣',
      maxLevel: 3,
      effect: { maxHpPercent: 2 },
      pos: { row: 0, col: 0 },
      children: ['trunk_conductor_inspire']
    },
    {
      id: 'trunk_conductor_inspire',
      name: '鼓舞士气',
      maxLevel: 3,
      effect: { attackPercent: 2 },
      pos: { row: 1, col: 0 },
      requires: ['trunk_conductor_resonance'],
      children: ['trunk_conductor_chord']
    },
    {
      id: 'trunk_conductor_chord',
      name: '守护和弦',
      maxLevel: 2,
      effect: { defensePercent: 2 },
      pos: { row: 2, col: 0 },
      requires: ['trunk_conductor_inspire']
    }
  ]
};

// 每英雄专属节点：各英雄天赋树独立，专属分支挂载在对应职阶主干入口之后（buildTalentTree 组装 children）
export const HERO_TALENTS: Record<string, TalentNodeConfig[]> = {
  nova: [
    {
      id: 'hero_nova_overdrive',
      name: '过载引擎',
      maxLevel: 3,
      effect: { attackPercent: 2 },
      pos: { row: 1, col: 1 },
      // requires: ['trunk_attacker_edge'],
      gate: [
        { type: 'awakened' },                    // 英雄已觉醒
        { type: 'talent', nodeId: 'hero_nova_booster', operator: 'equal', value: 0 },
      ],
    },
    {
      id: 'hero_nova_booster',
      name: '澎湃激发',
      maxLevel: 3,
      effect: { attackPercent: 2 },
      pos: { row: 1, col: 2 },
      // requires: ['trunk_attacker_edge'],
      gate: [
        { type: 'awakened' },                    // 英雄已觉醒
        { type: 'talent', nodeId: 'hero_nova_overdrive', operator: 'equal', value: 0 },
      ],
    }
  ],
  buster: [
    {
      id: 'hero_buster_hunter',
      name: '废土猎手',
      maxLevel: 3,
      effect: { attackPercent: 2 },
      pos: { row: 1, col: 1 },
      requires: ['trunk_attacker_edge']
    }
  ],
  soldier: [
    {
      id: 'hero_soldier_fortress',
      name: '阵地防御',
      maxLevel: 3,
      effect: { defensePercent: 3 },
      pos: { row: 1, col: 1 },
      requires: ['trunk_guardian_bulwark']
    }
  ],
  catherine: [
    {
      id: 'hero_catherine_radiation',
      name: '辐射抗性',
      maxLevel: 3,
      effect: { maxHpPercent: 3 },
      pos: { row: 1, col: 1 },
      requires: ['trunk_guardian_bulwark']
    }
  ],
  roy: [
    {
      id: 'hero_roy_synergy',
      name: '机械协同',
      maxLevel: 3,
      effect: { attackPercent: 2 },
      pos: { row: 1, col: 1 },
      requires: ['trunk_conductor_resonance']
    }
  ],
  mei: [
    {
      id: 'hero_mei_bounty',
      name: '自然馈赠',
      maxLevel: 3,
      effect: { maxHpPercent: 2, defensePercent: 1 },
      pos: { row: 1, col: 1 },
      requires: ['trunk_conductor_resonance']
    }
  ],
  zero: [
    {
      id: 'hero_zero_seal',
      name: '魂印疾行',
      maxLevel: 3,
      effect: { attackPercent: 2 },
      pos: { row: 1, col: 1 },
      requires: ['trunk_conductor_resonance']
    }
  ],
  healer: [
    {
      id: 'hero_healer_blessing',
      name: '净化祝福',
      maxLevel: 3,
      effect: { maxHpPercent: 3 },
      pos: { row: 1, col: 1 },
      requires: ['trunk_conductor_resonance']
    }
  ],
  apprentice: [
    {
      id: 'hero_apprentice_craft',
      name: '星野巧思',
      maxLevel: 3,
      effect: { defensePercent: 2, attackPercent: 1 },
      pos: { row: 1, col: 1 },
      requires: ['trunk_conductor_resonance']
    }
  ]
};

// 效果文案（UI 共用）：复用数据驱动的 formatBonus（百分比加成 → 描述），单一描述来源
// （手写 description 已移除——效果描述一律由 effect 数据导出，新增属性只需扩展 COMBAT_BONUS_META）
export const formatTalentEffect = (effect: CombatBonus): string => formatBonus(effect);

// 门控可读文案（07 号，UI 选中节点展示）：nameOf 解析节点 id → 名称
// talent 的 equal 0 渲染为「未投入」（互斥语义友好化）
export const formatTalentGate = (gate: TalentGate[] | undefined, nameOf: (id: string) => string): string[] =>
  (gate || []).map(g => {
    switch (g.type) {
      case 'talent': {
        const node = `「${nameOf(g.nodeId)}」`;
        if (g.operator === 'equal' && g.value === 0) return `${node}未投入`;
        if (g.operator === 'equal') return `投入${node}=${g.value} 点`;
        return `投入${node}${g.operator === 'greater' ? '>' : '<'}${g.value} 点`;
      }
      case 'awakened': return '英雄已觉醒';
      case 'heroLevel': return `角色等级 ≥${g.minLevel}`;
      case 'star': return `星级 ≥${g.minLevel}`;
      default: {
        // 穷尽性：新增条件类型时 TS 在此报错
        const exhaustive: never = g;
        return exhaustive;
      }
    }
  });

// 组装某英雄的完整天赋树：职阶主干 + 英雄专属，并把专属节点挂到其 requires 父节点的 children 末尾
// （children 顺序 = 槽位顺序：主干链子在前、专属分支在后，布局引擎据此自动定 1/2/3 槽位方向）
export const buildTalentTree = (heroId: string): TalentNodeConfig[] => {
  const config = HEROES_CONFIG[heroId];
  if (!config) return [];
  const trunkNodes = TALENT_TRUNKS[config.heroClass] || [];

  const nodes: TalentNodeConfig[] = [...trunkNodes];
  const childrenById: Record<string, string[]> = {};
  nodes.forEach(n => { childrenById[n.id] = [...(n.children || [])]; });

  (HERO_TALENTS[heroId] || []).forEach(o => {
    nodes.push(o);
    (o.requires || []).forEach(pid => {
      if (childrenById[pid] && !childrenById[pid].includes(o.id)) childrenById[pid].push(o.id);
    });
  });

  return nodes.map(n => ({ ...n, children: childrenById[n.id] }));
};
