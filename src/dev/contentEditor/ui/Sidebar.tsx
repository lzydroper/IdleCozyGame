/** 左侧文件树：域 → 组 → 文件 三层；组可折叠、聚合错误徽标、域头挂「新建」动作 */
import React, { useMemo, useState } from 'react';
import type { Issue, JsonValue } from '../types';
import { buildSideTree, type NewAction, type SideGroup } from '../sideTree';
import { Badge, inputCls } from './primitives';

interface Props {
  paths: string[];
  docs: Record<string, JsonValue>;
  dirty: Set<string>;
  issues: Issue[];
  selected: string | null;
  onSelect: (path: string) => void;
  onNewEntity: (action: NewAction) => void;
}

const countIssues = (issues: Issue[], paths: string[]): { err: number; warn: number } => {
  const set = new Set(paths);
  let err = 0;
  let warn = 0;
  for (const x of issues) {
    if (!set.has(x.path)) continue;
    if (x.level === 'error') err += 1;
    else warn += 1;
  }
  return { err, warn };
};

const Badges: React.FC<{ path: string; issues: Issue[]; dirty: Set<string> }> = ({ path, issues, dirty }) => {
  const { err, warn } = countIssues(issues, [path]);
  return (
    <>
      {dirty.has(path) && <Badge tone="dirty">●</Badge>}
      {err > 0 && <Badge tone="error">{err}</Badge>}
      {warn > 0 && <Badge tone="warn">{warn}</Badge>}
    </>
  );
};

const FileRow: React.FC<Props & { path: string; title: string; indent?: boolean }> = ({ path, title, indent, selected, dirty, issues, onSelect }) => (
  <button
    onClick={() => onSelect(path)}
    className={`flex items-center gap-1.5 w-full text-left px-2 py-1.5 rounded-lg text-[11px] transition-colors cursor-pointer border ${
      selected === path
        ? 'bg-purple-950/40 text-purple-200 border-purple-500/30'
        : `text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 border-transparent ${indent ? 'ml-3 w-[calc(100%-0.75rem)]' : ''}`
    }`}
  >
    <span className="truncate flex-1">{title}</span>
    <Badges path={path} issues={issues} dirty={dirty} />
  </button>
);

const GroupHeader: React.FC<{ group: SideGroup; collapsed: boolean; onToggle: () => void; issues: Issue[] }> = ({ group, collapsed, onToggle, issues }) => {
  const childPaths = group.children.map((c) => c.path);
  const { err, warn } = countIssues(issues, childPaths);
  return (
    <button onClick={onToggle} className="flex items-center gap-1.5 w-full text-left px-1.5 py-1 rounded-lg text-[11px] font-black text-zinc-300 hover:bg-zinc-900 cursor-pointer">
      <span className="text-[9px] text-zinc-600 w-2">{collapsed ? '▸' : '▾'}</span>
      <span className="truncate flex-1">{group.label}</span>
      {err > 0 && <Badge tone="error">{err}</Badge>}
      {warn > 0 && <Badge tone="warn">{warn}</Badge>}
      <span className="text-[9px] text-zinc-600 font-normal">{childPaths.length}</span>
    </button>
  );
};

export const Sidebar: React.FC<Props> = ({ paths, docs, dirty, issues, selected, onSelect, onNewEntity }) => {
  const [q, setQ] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const domains = useMemo(() => {
    const tree = buildSideTree(paths, docs);
    const query = q.trim().toLowerCase();
    if (!query) return tree;
    // 搜索：过滤文件；组内有匹配文件则保留整组并展开
    const match = (f: { path: string; title: string }): boolean => f.path.toLowerCase().includes(query) || f.title.toLowerCase().includes(query);
    return tree
      .map((d) => ({
        ...d,
        files: d.files.filter(match),
        groups: d.groups.map((g) => ({ ...g, children: g.children.filter(match) })).filter((g) => g.children.length > 0)
      }))
      .filter((d) => d.files.length > 0 || d.groups.length > 0);
  }, [paths, docs, q]);

  const isCollapsed = (g: SideGroup): boolean => {
    if (q.trim() !== '') return false; // 搜索时全展开
    return collapsedGroups.has(g.key) ? !g.defaultCollapsed : g.defaultCollapsed;
  };
  const toggleGroup = (key: string): void =>
    setCollapsedGroups((prev) => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });

  const ACTION_LABEL: Record<NewAction, string> = {
    newEnemy: '敌人',
    newAbility: '能力',
    newBuff: 'Buff',
    newHero: '英雄',
    newRegion: '区域'
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-2.5 border-b border-zinc-800/80">
        <input className={inputCls} placeholder="搜索文件…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {domains.map((d) => (
          <div key={d.domain} className="mb-3">
            <div className="flex items-center gap-1 px-1.5 mb-1">
              <span className="text-[9px] uppercase tracking-widest text-zinc-600 font-black flex-1">
                {d.domain}
                <span className="text-zinc-700"> ({d.files.length + d.groups.reduce((n, g) => n + g.children.length, 0)})</span>
              </span>
              {d.action && (
                <button
                  onClick={() => onNewEntity(d.action as NewAction)}
                  title={`新建${ACTION_LABEL[d.action]}`}
                  className="text-[10px] leading-none px-1.5 py-0.5 rounded-md border border-purple-500/30 bg-purple-950/30 text-purple-300 hover:bg-purple-900/50 cursor-pointer font-black"
                >
                  ＋
                </button>
              )}
            </div>
            <div className="flex flex-col gap-0.5">
              {d.files.map((f) => (
                <FileRow key={f.path} {...{ paths, docs, dirty, issues, selected, onSelect, onNewEntity }} path={f.path} title={f.title} />
              ))}
              {d.groups.map((g) => {
                const collapsed = isCollapsed(g);
                return (
                  <div key={g.key}>
                    <div className="flex items-center gap-1">
                      <div className="flex-1 min-w-0">
                        <GroupHeader group={g} collapsed={collapsed} onToggle={() => toggleGroup(g.key)} issues={issues} />
                      </div>
                      {g.action && (
                        <button
                          onClick={() => onNewEntity(g.action as NewAction)}
                          title={`新建${ACTION_LABEL[g.action]}`}
                          className="text-[10px] leading-none px-1.5 py-0.5 rounded-md border border-purple-500/30 bg-purple-950/30 text-purple-300 hover:bg-purple-900/50 cursor-pointer font-black shrink-0"
                        >
                          ＋
                        </button>
                      )}
                    </div>
                    {!collapsed &&
                      g.children.map((f) => <FileRow key={f.path} {...{ paths, docs, dirty, issues, selected, onSelect, onNewEntity }} path={f.path} title={f.title} indent />)}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {domains.length === 0 && <div className="text-center text-[10px] text-zinc-600 py-6">无匹配文件</div>}
      </div>
    </div>
  );
};
