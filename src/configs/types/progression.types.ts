/**
 * progression 养成域类型（config-json-migration 批次④ 收口）。
 */
import type { HeroFaction } from '../../types/game';
import type { StatModifier } from '../../state/statSystem';
import type { EffectTemplate } from '../../state/abilityTypes';

// 羁绊配置（ticket 09）：队伍构筑策略层 —— 特定英雄组合 / 阵营条件上阵触发数值加成，
// 生效于战斗数值，由 state/bonds.ts 计算，combat.ts 应用。
export interface BondConfig {
  id: string;
  name: string;
  description: string;
  heroes: string[];                            // 必须同时上阵的英雄（可空：纯阵营条件）
  factions: Partial<Record<HeroFaction, number>>; // 阵营要求：该阵营至少 N 名上阵（可空：纯英雄组合）
  bonus: StatModifier[];                      // 触发后给予的加成数值（修饰符）
}

// === 天赋树（ticket 11 → 09 树形重设计） ===

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

// 天赋重写（heroes-skills 工单 05）：部分替换既有主动技能——只重写不追加，三槽皆可（含觉醒技）。
// effects 键 = 效果索引（如 "0"），未提及的效果原样保留；descriptions 同索引供预览展示。
// description = 主描述模板整体替换（占位符照常渲染）——效果种类被改写时原模板可能失效。
export interface TalentRewrite {
  targetAbilityId: string;
  priority?: number;
  description?: string;
  effects?: Record<string, EffectTemplate>;
  descriptions?: Record<string, string>;
}

export interface TalentNodeConfig {
  id: string;             // 全局唯一节点 id
  name: string;
  maxLevel: number;
  effect: StatModifier[];  // 每级效果（修饰符，按投入点数线性叠加）；描述由 formatModifiers 自动导出，无需手写
  pos: { row: number; col: number }; // 相对坐标（09：row 行、col 行内序号 0 起）
  requires?: string[];    // 父节点（阻塞来源 + 画线来源）：需父节点已投入 ≥1 点
  children?: string[];    // 子节点列表（09：布局画线来源；顺序 = 槽位顺序）
  gate?: TalentGate[];    // 额外解锁门控（07 号）：全部满足才可点；只阻塞不画线
  rewrites?: TalentRewrite[]; // 投入 ≥1 点后生效的重写补丁（压轴应用，赢过 growth/milestones）
}
