// PROTOTYPE（天赋树 UI 原型，非生产代码）
// 问题：天赋树弹窗应该是怎样的"树"？三个结构不同的变体，通过 ?variant=A|B|C 切换。
// 数据来自真实 talents.ts / hero state，交互为本地模拟（不落库，UI 只读原型）。
import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { HEROES_CONFIG } from '../../data/heroes';
import { formatTalentEffect, type TalentNodeConfig } from '../../data/talents';
import { getTalentNodes, getTalentLevel, getInvestedPoints } from '../../state/talents';
import { Lock, Star, Shield, Sword, Sparkles, Minus, Plus } from 'lucide-react';

const TRUNK_ICON: Record<string, React.ReactNode> = {
  guardian: <Shield className="w-4 h-4 text-sky-400" />,
  attacker: <Sword className="w-4 h-4 text-rose-400" />,
  conductor: <Sparkles className="w-4 h-4 text-emerald-400" />,
};

// 锁定计算：requires 中任一节点 level < 1 即锁定（跨变体共用）
function isLocked(node: TalentNodeConfig, levels: Record<string, number>): boolean {
  return (node.requires || []).some(r => (levels[r] ?? 0) < 1);
}

interface TreeData {
  nodes: TalentNodeConfig[];
  trunk: TalentNodeConfig[];
  own: TalentNodeConfig[];
  levels: Record<string, number>;
  pointsLeft: number;
  onAdd: (id: string) => void;
  onSub: (id: string) => void;
}

// 共享数据 hook：真实节点/投入 + 本地模拟加点（不改存档）
function useTreeData(heroId: string): TreeData | null {
  const { state } = useGame();
  const hero = state.heroes[heroId];
  const config = HEROES_CONFIG[heroId];
  const [sim, setSim] = useState<Record<string, number> | null>(null);
  if (!hero || !config) return null;

  const nodes = getTalentNodes(heroId);
  const trunk = nodes.filter(n => n.id.startsWith('trunk_'));
  const own = nodes.filter(n => n.id.startsWith('hero_'));
  const base = getInvestedPoints(hero);
  const levels = sim ?? Object.fromEntries(nodes.map(n => [n.id, getTalentLevel(hero, n.id)]));
  const simInvested = nodes.reduce((s, n) => s + (levels[n.id] ?? 0), 0);
  const pointsLeft = hero.talentPoints + base - simInvested;

  const onAdd = (id: string) => {
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    const lv = levels[id] ?? 0;
    if (isLocked(node, levels) || lv >= node.maxLevel || pointsLeft <= 0) return;
    setSim({ ...levels, [id]: lv + 1 });
  };
  const onSub = (id: string) => {
    const lv = levels[id] ?? 0;
    if (lv <= 0) return;
    const dependents = nodes.filter(n => (n.requires || []).includes(id) && (levels[n.id] ?? 0) >= 1);
    if (dependents.length > 0) return;
    setSim({ ...levels, [id]: lv - 1 });
  };

  return { nodes, trunk, own, levels, pointsLeft, onAdd, onSub };
}

interface ChipProps {
  node: TalentNodeConfig;
  level: number;
  pointsLeft: number;
  locked: boolean;
  onAdd: () => void;
  onSub: () => void;
  compact?: boolean;
}

// 共享节点卡片（叶子，跨变体复用；布局由各变体决定）
const NodeChip: React.FC<ChipProps> = ({ node, level, pointsLeft, locked, onAdd, onSub, compact }) => {
  const maxed = level >= node.maxLevel;
  const canAdd = !locked && !maxed && pointsLeft > 0;
  return (
    <div
      title={`${formatTalentEffect(node.effect)}/级`}
      className={`rounded-lg border px-2 py-1.5 w-full ${
        maxed
          ? 'border-amber-500/50 bg-amber-950/30'
          : locked
          ? 'border-zinc-800/60 bg-zinc-900/20 opacity-55'
          : 'border-zinc-800/80 bg-zinc-900/40'
      }`}
    >
      <div className="flex items-center gap-1">
        <span className="text-[10px] font-black text-zinc-200 flex-1 truncate">
          {locked && <span className="mr-0.5"><Lock className="w-2.5 h-2.5 inline-block" /></span>}
          {node.name}
        </span>
        {!compact && (
          <span className="text-[8px] font-bold text-zinc-600 shrink-0">
            {Array.from({ length: node.maxLevel }, (_, i) => (
              <Star key={i} className={`w-2 h-2 inline-block ${i < level ? 'fill-amber-400 text-amber-400' : 'text-zinc-700'}`} />
            ))}
          </span>
        )}
        <button
          onClick={onSub}
          disabled={level <= 0}
          className="w-4.5 h-4.5 rounded border text-[9px] font-black leading-none transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-25 border-rose-500/40 bg-rose-950/40 text-rose-300 shrink-0"
          title="撤销 1 点"
        >
          <Minus className="w-2.5 h-2.5 mx-auto" />
        </button>
        <button
          onClick={onAdd}
          disabled={!canAdd}
          className="w-4.5 h-4.5 rounded border text-[9px] font-black leading-none transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-25 border-emerald-500/40 bg-emerald-950/40 text-emerald-300 shrink-0"
          title={locked ? '前置未解锁' : maxed ? '已满级' : pointsLeft < 1 ? '天赋点不足' : '投入 1 点'}
        >
          <Plus className="w-2.5 h-2.5 mx-auto" />
        </button>
      </div>
      <div className="text-[8px] text-zinc-500 font-bold mt-0.5 truncate">{formatTalentEffect(node.effect)}/级</div>
    </div>
  );
};

// ============ 变体 A：横向树（主干左列 + 专属右分支，主线贯穿） ============
export const VariantA: React.FC<{ heroId: string }> = ({ heroId }) => {
  const d = useTreeData(heroId);
  if (!d) return null;
  return (
    <div>
      <div className="relative pl-5">
        {/* 贯穿主干列的竖线（轨道在 pl-5 内，不穿过卡片） */}
        <div className="absolute left-2 top-2 bottom-2 w-px bg-zinc-600/70" />
        <div className="flex flex-col gap-2.5">
          {d.trunk.map(node => {
            const branches = d.own.filter(o => (o.requires || []).includes(node.id));
            return (
              <div key={node.id} className="relative flex items-center">
                {/* 主线 → 本行横线 */}
                <div className="absolute -left-5 top-1/2 w-5 h-px bg-zinc-600/70" />
                <div className="flex-1 min-w-0">
                  <NodeChip
                    node={node}
                    level={d.levels[node.id] ?? 0}
                    pointsLeft={d.pointsLeft}
                    locked={isLocked(node, d.levels)}
                    onAdd={() => d.onAdd(node.id)}
                    onSub={() => d.onSub(node.id)}
                  />
                </div>
                {branches.map(b => (
                  <div key={b.id} className="flex items-center shrink-0">
                    <div className="w-2.5 h-px bg-zinc-600/70" />
                    <NodeChip
                      node={b}
                      level={d.levels[b.id] ?? 0}
                      pointsLeft={d.pointsLeft}
                      locked={isLocked(b, d.levels)}
                      onAdd={() => d.onAdd(b.id)}
                      onSub={() => d.onSub(b.id)}
                      compact
                    />
                  </div>
                ))}
              </div>
            );
          })}
          {d.own.filter(o => !d.trunk.some(t => (o.requires || []).includes(t.id))).map(o => (
            <div key={o.id} className="relative flex items-center pl-5">
              <NodeChip node={o} level={d.levels[o.id] ?? 0} pointsLeft={d.pointsLeft} locked={isLocked(o, d.levels)} onAdd={() => d.onAdd(o.id)} onSub={() => d.onSub(o.id)} compact />
            </div>
          ))}
        </div>
      </div>
      <p className="text-[8px] text-zinc-600 font-bold mt-2">
        变体 A：横向树 —— 主干左列贯穿竖线，专属从主干横向伸出。剩余天赋点 ×{d.pointsLeft}
      </p>
    </div>
  );
};

// ============ 变体 B：技能网图（SVG 贝塞尔连线 + 圆形图标节点） ============
// 容器固定 320×320，SVG viewBox 与容器 1:1，HTML 节点用相同 px 坐标保证对齐
const TRUNK_Y = [60, 150, 240];
const OWN_X = 215;
export const VariantB: React.FC<{ heroId: string }> = ({ heroId }) => {
  const d = useTreeData(heroId);
  const config = HEROES_CONFIG[heroId];
  if (!d || !config) return null;
  const ownY = 150;
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[320px] h-[320px]">
        <svg viewBox="0 0 320 320" className="absolute inset-0 w-full h-full">
          {/* 主干链连线 */}
          {d.trunk.slice(1).map((n, i) => (
            <path
              key={n.id}
              d={`M 70 ${TRUNK_Y[i]} C 70 ${TRUNK_Y[i] + 45} 70 ${TRUNK_Y[i + 1] - 45} 70 ${TRUNK_Y[i + 1]}`}
              fill="none"
              stroke="#3f3f46"
              strokeWidth="1.5"
            />
          ))}
          {/* 主干 → 专属连线（虚线） */}
          {d.own.map(o => {
            const dep = d.trunk.find(t => (o.requires || []).includes(t.id));
            const sy = dep ? TRUNK_Y[d.trunk.indexOf(dep)] : TRUNK_Y[0];
            return (
              <path key={o.id} d={`M 70 ${sy} C 145 ${sy} 145 ${ownY} 200 ${ownY}`} fill="none" stroke="#6d28d9" strokeWidth="1.5" strokeDasharray="4 3" />
            );
          })}
        </svg>
        {/* 主干节点 */}
        {d.trunk.map((node, i) => {
          const y = TRUNK_Y[i];
          const locked = isLocked(node, d.levels);
          return (
            <div key={node.id} className="absolute" style={{ left: 70 - 22, top: y - 22 }}>
              <div className={`w-11 h-11 rounded-full border-2 flex items-center justify-center ${locked ? 'border-zinc-700 opacity-55' : 'border-amber-500/50 bg-zinc-900'}`}>
                {TRUNK_ICON[config.heroClass]}
              </div>
              <div className="text-center text-[8px] font-black text-zinc-300 mt-0.5 max-w-[80px] truncate mx-auto">{node.name}</div>
              <div className="flex justify-center gap-1 mt-0.5">
                <button onClick={() => d.onSub(node.id)} className="w-4 h-4 rounded border border-rose-500/40 bg-rose-950/40 text-rose-300 cursor-pointer"><Minus className="w-2 h-2 mx-auto" /></button>
                <span className="text-[8px] text-zinc-500 font-bold">{d.levels[node.id] ?? 0}/{node.maxLevel}</span>
                <button onClick={() => d.onAdd(node.id)} className="w-4 h-4 rounded border border-emerald-500/40 bg-emerald-950/40 text-emerald-300 cursor-pointer"><Plus className="w-2 h-2 mx-auto" /></button>
              </div>
            </div>
          );
        })}
        {/* 专属节点 */}
        {d.own.map(o => (
          <div key={o.id} className="absolute" style={{ left: OWN_X - 22, top: ownY - 22 }}>
            <div className={`w-11 h-11 rounded-xl border-2 flex items-center justify-center ${(d.levels[o.id] ?? 0) > 0 ? 'border-purple-500/60 bg-purple-950/40' : 'border-zinc-700 bg-zinc-900'}`}>
              <Star className={`w-5 h-5 ${(d.levels[o.id] ?? 0) > 0 ? 'fill-purple-400 text-purple-400' : 'text-zinc-600'}`} />
            </div>
            <div className="text-center text-[8px] font-black text-zinc-300 mt-0.5 max-w-[80px] truncate mx-auto">{o.name}</div>
            <div className="flex justify-center gap-1 mt-0.5">
              <button onClick={() => d.onSub(o.id)} className="w-4 h-4 rounded border border-rose-500/40 bg-rose-950/40 text-rose-300 cursor-pointer"><Minus className="w-2 h-2 mx-auto" /></button>
              <span className="text-[8px] text-zinc-500 font-bold">{d.levels[o.id] ?? 0}/{o.maxLevel}</span>
              <button onClick={() => d.onAdd(o.id)} className="w-4 h-4 rounded border border-emerald-500/40 bg-emerald-950/40 text-emerald-300 cursor-pointer"><Plus className="w-2 h-2 mx-auto" /></button>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[8px] text-zinc-600 font-bold mt-1 self-start">
        变体 B：技能网图 —— SVG 贝塞尔连线 + 圆形图标节点，虚线连专属。剩余天赋点 ×{d.pointsLeft}
      </p>
    </div>
  );
};

// ============ 变体 C：缩进树（纵向列表 + └ 形连接线，信息密度最高） ============
export const VariantC: React.FC<{ heroId: string }> = ({ heroId }) => {
  const d = useTreeData(heroId);
  if (!d) return null;
  return (
    <div>
      <div className="flex flex-col gap-1">
        {d.trunk.map((node, i) => {
          const branches = d.own.filter(o => (o.requires || []).includes(node.id));
          const hasMore = i < d.trunk.length - 1;
          return (
            <div key={node.id}>
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full shrink-0 ${hasMore ? 'bg-zinc-500' : 'bg-zinc-700'}`} />
                <div className="flex-1 min-w-0">
                  <NodeChip node={node} level={d.levels[node.id] ?? 0} pointsLeft={d.pointsLeft} locked={isLocked(node, d.levels)} onAdd={() => d.onAdd(node.id)} onSub={() => d.onSub(node.id)} />
                </div>
              </div>
              {branches.map(b => (
                <div key={b.id} className="relative flex items-center pl-5">
                  {/* 竖线（父节点圆点 → 分支行）+ 横线 */}
                  <div className="absolute left-[3px] top-0 bottom-1/2 w-px bg-zinc-700" />
                  <div className="absolute left-[3px] top-1/2 w-3.5 h-px bg-zinc-700" />
                  <div className="flex-1 min-w-0">
                    <NodeChip node={b} level={d.levels[b.id] ?? 0} pointsLeft={d.pointsLeft} locked={isLocked(b, d.levels)} onAdd={() => d.onAdd(b.id)} onSub={() => d.onSub(b.id)} compact />
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
      <p className="text-[8px] text-zinc-600 font-bold mt-1">
        变体 C：缩进树 —— 纵向列表 + └ 形连接线，最紧凑。剩余天赋点 ×{d.pointsLeft}
      </p>
    </div>
  );
};
