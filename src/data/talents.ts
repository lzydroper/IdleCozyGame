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

// 职阶公共主干已迁 data/progression/talentTrunks.json（config-json-migration 批次②）。
export { TALENT_TRUNKS } from '../configs/loaders/progression.loader';

import type { StatModifier } from '../state/statSystem';

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
  effect: StatModifier[];  // 每级效果（修饰符，按投入点数线性叠加）；描述由 formatModifiers 自动导出，无需手写
  pos: { row: number; col: number }; // 相对坐标（09：row 行、col 行内序号 0 起）
  requires?: string[];    // 父节点（阻塞来源 + 画线来源）：需父节点已投入 ≥1 点
  children?: string[];    // 子节点列表（09：布局画线来源；顺序 = 槽位顺序）
  gate?: TalentGate[];    // 额外解锁门控（07 号）：全部满足才可点；只阻塞不画线
}

// 职阶公共主干：同职阶所有英雄共享，节点按顺序递进（后置节点依赖前置）


// 英雄专属节点已迁 data/entities/heroes/<id>/talent.json（config-json-migration 批次③ 工单4）。
export { HERO_TALENTS } from '../configs/loaders/entities.loader';

// 组装与文案格式化属运行时逻辑，已归位 src/state/talentsTree.ts（config-json-migration 批次②）。
export { formatTalentGate, buildTalentTree } from '../state/talentsTree';