/**
 * 天赋树运行时组装（config-json-migration 批次② 自 data/talents.ts 迁出——运行时逻辑归位 state）。
 * 数据源：职阶主干 = progression.loader（json）；英雄专属节点 = data/talents.ts HERO_TALENTS（批次③迁英雄 talent.json）。
 */
import type { TalentGate, TalentNodeConfig } from '../configs/types/progression.types';
import { TALENT_TRUNKS } from '../configs/loaders/progression.loader';
import { HERO_TALENTS, HEROES_CONFIG } from '../configs/loaders/entities.loader';

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
  const trunkNodes = (TALENT_TRUNKS[config.heroClass] || []) as TalentNodeConfig[];

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
