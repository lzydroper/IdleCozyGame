import React, { useMemo, useState, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { useToast } from './ToastSystem';
import { HEROES_CONFIG, HERO_CLASS_LABELS } from '../data/heroes';
import { formatTalentEffect, buildTalentTree } from '../data/talents';
import type { TalentNodeConfig } from '../data/talents';
import { getTalentLevel, getTalentBonus, getInvestedPoints } from '../state/talents';
import { Lock, TreeDeciduous, Star, Shield, Sword, Sparkles, Move } from 'lucide-react';

const ROW_H = 90;    // 行高（px）
const COL_W = 120;   // 槽位列宽（px）
const NODE_R = 22;   // 节点半径
const PAD_X = 60;    // 横向内边距
const PAD_Y = 40;    // 纵向内边距

interface Placed {
  node: TalentNodeConfig;
  x: number;
  y: number;
}

function layoutTree(tree: TalentNodeConfig[]): Placed[] {
  const byId = new Map(tree.map(n => [n.id, n]));
  const placed = new Map<string, Placed>();
  const roots = tree.filter(n => !n.requires || n.requires.length === 0);

  const place = (node: TalentNodeConfig, x: number, row: number) => {
    placed.set(node.id, { node, x, y: row * ROW_H + PAD_Y });
    const kids = (node.children || []).map(id => byId.get(id)).filter((k): k is TalentNodeConfig => !!k);
    const slots = kids.length <= 1 ? [0] : kids.length === 2 ? [-1, 1] : [-1, 0, 1];
    kids.forEach((k, i) => place(k, x + (slots[i] ?? 0) * COL_W, row + 1));
  };
  roots.forEach((r, i) => place(r, i * COL_W * 2, 0));

  if (placed.size > 0) {
    const minX = Math.min(...[...placed.values()].map(p => p.x));
    const shift = PAD_X - minX;
    placed.forEach(p => { p.x += shift; });
  }
  return [...placed.values()];
}

const HeroTalentPanel: React.FC<{ heroId: string }> = ({ heroId }) => {
  const { state, allocateTalent, unallocateTalent, resetTalents } = useGame();
  const { showToast } = useToast();

  const hero = state.heroes[heroId];
  const config = HEROES_CONFIG[heroId];
  const [selectedId, setSelectedId] = useState<string | null>(() => buildTalentTree(heroId)[0]?.id ?? null);
  const tree = useMemo(() => buildTalentTree(heroId), [heroId]);
  const placed = useMemo(() => layoutTree(tree), [tree]);
  const byId = useMemo(() => new Map(tree.map(n => [n.id, n])), [tree]);

  // === 画布拖拽逻辑 ===
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  if (!hero || !config) return null;

  const points = hero.talentPoints || 0;
  const invested = getInvestedPoints(hero);
  const bonus = getTalentBonus(heroId, hero);

  const selected = selectedId ? byId.get(selectedId) : undefined;
  const selLevel = selected ? getTalentLevel(hero, selected.id) : 0;
  const selLocked = selected
    ? (selected.requires || []).some(pid => getTalentLevel(hero, pid) < 1)
    : false;
  const selParents = selected
    ? (selected.requires || []).map(pid => byId.get(pid)?.name).filter(Boolean).join('、')
    : '';

  const handleAllocate = (nodeId: string) => {
    const result = allocateTalent(heroId, nodeId);
    if (result === true) return;
    if (result === 'no_points') showToast('天赋点不足 —— 战斗升级可获得天赋点。', 'error');
    else if (result === 'maxed') showToast('该节点已满级。', 'warning');
    else if (result === 'locked') showToast('需先点亮前置节点。', 'warning');
  };

  const handleUnallocate = (nodeId: string) => {
    const result = unallocateTalent(heroId, nodeId);
    if (result === true) return;
    if (result === 'has_dependents') showToast('下游节点已投入，请先撤销下游节点。', 'warning');
  };

  const handleReset = () => {
    if (invested === 0) return;
    if (resetTalents(heroId)) {
      showToast(`天赋已重置，返还 ${invested} 点。`, 'success');
      setPan({ x: 0, y: 0 }); // 重置视口
    }
  };

  // 画布平移事件 handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // 只有点击空白画布区域才触发拖拽
    if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // 计算最大画布物理尺寸
  const maxX = placed.length ? Math.max(...placed.map(p => p.x)) + NODE_R + PAD_X : 300;
  const maxY = placed.length ? Math.max(...placed.map(p => p.y)) + NODE_R + PAD_Y : 300;

  const nodeIcon = (n: TalentNodeConfig) =>
    n.id.startsWith('hero_') ? (
      <Star className={`w-4 h-4 ${getTalentLevel(hero, n.id) > 0 ? 'fill-amber-400 text-amber-400' : 'text-zinc-500'}`} />
    ) : (
      (config.heroClass === 'guardian' && <Shield className="w-4 h-4 text-sky-400" />) ||
      (config.heroClass === 'attacker' && <Sword className="w-4 h-4 text-rose-400" />) ||
      <Sparkles className="w-4 h-4 text-emerald-400" />
    );

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3 flex flex-col gap-2 shadow-2xl">
      {/* 顶部：标题 + 天赋点 + 重置 */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
        <span className="text-xs font-black text-emerald-300 tracking-wide flex items-center gap-1.5">
          <TreeDeciduous className="w-4 h-4 text-emerald-400" /> 【{HERO_CLASS_LABELS[config.heroClass]} · 职阶星盘】
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-amber-400 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-full">
            天赋点 ×{points}
          </span>
          <button
            onClick={handleReset}
            disabled={invested === 0}
            className={`text-xs font-bold px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${invested > 0
                ? 'border-rose-500/40 bg-rose-950/30 text-rose-300 hover:bg-rose-900/50'
                : 'border-zinc-800 bg-zinc-900/50 text-zinc-600 cursor-not-allowed'
              }`}
          >
            重置
          </button>
        </div>
      </div>

      {tree.length === 0 ? (
        <p className="text-xs text-zinc-600 font-bold p-4 text-center">该英雄暂无天赋配置。</p>
      ) : (
        <>
          {/* 画布视口（可拖拽区域） */}
          <div
            className={`relative h-[260px] w-full overflow-hidden rounded-xl border border-zinc-900 bg-zinc-950 select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'
              }`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* 网格点缀背景 */}
            <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none opacity-60" />

            {/* 拖拽操作微弱提示 */}
            <div className="absolute top-2 right-2 text-[10px] text-zinc-600 font-bold flex items-center gap-1 pointer-events-none z-10 bg-zinc-950/80 px-2 py-0.5 rounded-full border border-zinc-900">
              <Move className="w-3 h-3" /> 按住空白区拖动
            </div>

            {/* 移动平移主容器 */}
            <div
              className="absolute inset-0 transition-transform duration-75 ease-out flex items-center justify-center"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px)`,
              }}
            >
              <div className="relative" style={{ width: maxX, height: maxY }}>
                {/* SVG 连线 */}
                <svg
                  width={maxX}
                  height={maxY}
                  className="absolute inset-0 pointer-events-none overflow-visible"
                >
                  {placed.map(p =>
                    (p.node.children || []).map(cid => {
                      const c = placed.find(q => q.node.id === cid);
                      if (!c) return null;
                      const parentUnlocked = getTalentLevel(hero, p.node.id) > 0;
                      return (
                        <line
                          key={cid}
                          x1={p.x}
                          y1={p.y}
                          x2={c.x}
                          y2={c.y}
                          stroke={parentUnlocked ? '#f59e0b' : '#3f3f46'}
                          strokeWidth={parentUnlocked ? '2' : '1.5'}
                          strokeDasharray={parentUnlocked ? 'none' : '4 4'}
                          className="transition-colors duration-300"
                        />
                      );
                    })
                  )}
                </svg>

                {/* 天赋节点 */}
                {placed.map(p => {
                  const level = getTalentLevel(hero, p.node.id);
                  const locked = (p.node.requires || []).some(pid => getTalentLevel(hero, pid) < 1);
                  const isSel = selectedId === p.node.id;
                  return (
                    <button
                      key={p.node.id}
                      onClick={() => setSelectedId(p.node.id)}
                      className="absolute flex flex-col items-center cursor-pointer group -translate-x-1/2 -translate-y-1/2 transition-transform active:scale-95"
                      style={{ left: p.x, top: p.y }}
                    >
                      <div
                        className={`w-10 h-10 rounded-full border-2 flex items-center justify-center relative transition-all duration-200 ${isSel
                            ? 'border-amber-400 bg-amber-950/80 ring-4 ring-amber-400/20 shadow-lg shadow-amber-500/20 scale-110'
                            : level > 0
                              ? 'border-amber-500/80 bg-zinc-900 hover:border-amber-400'
                              : locked
                                ? 'border-zinc-800 bg-zinc-950 opacity-40'
                                : 'border-zinc-700 bg-zinc-900 group-hover:border-zinc-500'
                          }`}
                      >
                        {nodeIcon(p.node)}
                        {locked && (
                          <Lock className="w-3 h-3 text-zinc-500 absolute -top-1 -right-1 bg-zinc-950 rounded-full p-0.5 box-content border border-zinc-800" />
                        )}
                        {level > 0 && (
                          <span className="absolute -bottom-1 -right-1 text-[9px] font-black text-amber-200 bg-amber-950 border border-amber-500/60 rounded-full px-1.5 leading-3 shadow">
                            {level}
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[10px] font-bold mt-1.5 whitespace-nowrap px-1.5 py-0.5 rounded ${isSel
                            ? 'text-amber-300 bg-amber-950/60 border border-amber-500/30'
                            : 'text-zinc-400 bg-zinc-950/80'
                          }`}
                      >
                        {p.node.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 底部：选中节点详情控制卡片 */}
          {selected ? (
            <div className={`rounded-xl border p-2.5 flex flex-col gap-1.5 transition-colors ${selLocked ? 'border-zinc-800/80 bg-zinc-900/30' : 'border-amber-500/30 bg-amber-950/10'
              }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs font-black text-zinc-100 truncate flex items-center gap-1">
                    {selLocked && <Lock className="w-3 h-3 text-zinc-500 shrink-0" />}
                    {selected.name}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950 px-1.5 py-0.2 rounded border border-amber-500/30">
                    {selLevel}/{selected.maxLevel} 级
                  </span>
                </div>

                {/* 加点 / 减点按钮 */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleUnallocate(selected.id)}
                    disabled={selLevel <= 0}
                    className="w-6 h-6 rounded-lg border text-xs font-black flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-20 border-rose-500/40 bg-rose-950/40 text-rose-300 hover:bg-rose-900/60"
                    title="撤销 1 点"
                  >
                    −
                  </button>
                  <button
                    onClick={() => handleAllocate(selected.id)}
                    disabled={selLocked || selLevel >= selected.maxLevel || points < 1}
                    className="w-6 h-6 rounded-lg border text-xs font-black flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-20 border-emerald-500/40 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60"
                    title={selLocked ? `被【${selParents}】阻塞` : selLevel >= selected.maxLevel ? '已满级' : points < 1 ? '天赋点不足' : '投入 1 点'}
                  >
                    +
                  </button>
                </div>
              </div>

              <p className="text-[10px] text-zinc-400 font-medium leading-normal">{selected.description}</p>

              <div className="flex items-center justify-between text-[10px] pt-1 border-t border-zinc-800/60">
                <span className="font-bold text-emerald-400">
                  效果：{formatTalentEffect(selected.effect)} / 级
                </span>
                {selLocked && (
                  <span className="font-bold text-amber-500/90">
                    需解锁前置：【{selParents}】
                  </span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-zinc-600 font-bold p-2 text-center">点击节点查看详情</p>
          )}
        </>
      )}
    </div>
  );
};

export default HeroTalentPanel;
