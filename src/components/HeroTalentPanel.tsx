import React, { useMemo, useState } from 'react';
import { useGame } from '../context/GameContext';
import { useToast } from './ToastSystem';
import { HEROES_CONFIG, HERO_CLASS_LABELS } from '../data/heroes';
import { formatTalentEffect, buildTalentTree } from '../data/talents';
import type { TalentNodeConfig } from '../data/talents';
import { getTalentLevel, getTalentBonus, getInvestedPoints } from '../state/talents';
import { Lock, TreeDeciduous, Star, Shield, Sword, Sparkles } from 'lucide-react';

// 天赋树（09 树形重设计）：数据驱动布局 —— 节点配置 pos(相对坐标) + children(子节点列表)，
// 布局引擎按子节点数自动定槽位（1=正下直线、2=左下右下、3=左下正下右下），同父节点子节点同一水平线，
// SVG 直线自动连线；选中节点下方显示描述/增益；子节点被父节点阻塞（父已投入点数 ≥1 才可升级）。

// === 布局常量 ===
const ROW_H = 100;   // 行高（px）
const COL_W = 128;   // 槽位列宽（px）
const NODE_R = 22;   // 节点半径
const PAD_X = 34;    // 横向内边距
const PAD_Y = 34;    // 纵向内边距

interface Placed {
  node: TalentNodeConfig;
  x: number;
  y: number;
}

// 布局引擎：以根为锚递归，子节点按数量取槽位偏移 [-1,0,+1]；整体平移到非负
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
  // 默认选中根节点（职阶主干入口），保证信息面板与加点按钮立即可用
  const [selectedId, setSelectedId] = useState<string | null>(() => buildTalentTree(heroId)[0]?.id ?? null);
  const tree = useMemo(() => buildTalentTree(heroId), [heroId]);
  const placed = useMemo(() => layoutTree(tree), [tree]);
  const byId = useMemo(() => new Map(tree.map(n => [n.id, n])), [tree]);
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
    if (resetTalents(heroId)) showToast(`天赋已重置，返还 ${invested} 点。`, 'success');
  };

  // SVG 尺寸
  const maxX = placed.length ? Math.max(...placed.map(p => p.x)) + NODE_R + PAD_X : 200;
  const maxY = placed.length ? Math.max(...placed.map(p => p.y)) + NODE_R + PAD_Y : 200;

  const nodeIcon = (n: TalentNodeConfig) =>
    n.id.startsWith('hero_') ? (
      <Star className={`w-5 h-5 ${getTalentLevel(hero, n.id) > 0 ? 'fill-purple-400 text-purple-400' : 'text-zinc-600'}`} />
    ) : (
      (config.heroClass === 'guardian' && <Shield className="w-5 h-5 text-sky-400" />) ||
      (config.heroClass === 'attacker' && <Sword className="w-5 h-5 text-rose-400" />) ||
      <Sparkles className="w-5 h-5 text-emerald-400" />
    );

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-2 flex flex-col gap-1.5">
      {/* 顶部：标题 + 天赋点 + 重置 */}
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-black text-emerald-300/90 tracking-wide flex items-center gap-1">
          <TreeDeciduous className="w-3 h-3" /> 【{HERO_CLASS_LABELS[config.heroClass]} · 职阶主干】
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[8px] font-bold text-emerald-400">天赋点 ×{points}</span>
          <button
            onClick={handleReset}
            disabled={invested === 0}
            className={`text-[8px] font-bold px-1.5 py-0.5 rounded border transition-all cursor-pointer ${
              invested > 0
                ? 'border-amber-500/40 bg-amber-950/40 text-amber-300 hover:bg-amber-950/60'
                : 'border-zinc-800 bg-zinc-900 text-zinc-600 cursor-not-allowed'
            }`}
            title="重置全部天赋并返还点数"
          >
            重置
          </button>
        </div>
      </div>

      {tree.length === 0 ? (
        <p className="text-[8px] text-zinc-600 font-bold">该英雄暂无天赋配置。</p>
      ) : (
        <>
          {/* 树图：SVG 直线连线 + 绝对定位节点 */}
          <div className="relative" style={{ height: maxY }}>
            <svg viewBox={`0 0 ${maxX} ${maxY}`} className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="xMidYMin meet" shapeRendering="crispEdges">
              {placed.map(p =>
                (p.node.children || []).map(cid => {
                  const c = placed.find(q => q.node.id === cid);
                  if (!c) return null;
                  return (
                    <line
                      key={cid}
                      x1={p.x}
                      y1={p.y}
                      x2={c.x}
                      y2={c.y}
                      stroke="#3f3f46"
                      strokeWidth="1.5"
                    />
                  );
                })
              )}
            </svg>
            {placed.map(p => {
              const level = getTalentLevel(hero, p.node.id);
              const locked = (p.node.requires || []).some(pid => getTalentLevel(hero, pid) < 1);
              const isSel = selectedId === p.node.id;
              return (
                <button
                  key={p.node.id}
                  onClick={() => setSelectedId(p.node.id)}
                  className="absolute flex flex-col items-center cursor-pointer group select-none"
                  style={{ left: p.x - NODE_R, top: p.y - NODE_R }}
                  title={`${p.node.name}：${p.node.description}`}
                >
                  <div
                    className={`w-11 h-11 rounded-full border-2 flex items-center justify-center relative transition-transform duration-150 ${
                      isSel
                        ? 'border-amber-400 ring-2 ring-amber-400/30 shadow-lg shadow-amber-950/40 scale-110'
                        : locked
                        ? 'border-zinc-800 bg-zinc-900/60 opacity-50'
                        : 'border-zinc-700 bg-zinc-900 group-hover:border-amber-500/60'
                    }`}
                  >
                    {nodeIcon(p.node)}
                    {locked && (
                      <Lock className="w-3 h-3 text-zinc-500 absolute -top-1 -right-1 bg-zinc-950 rounded-full p-0.5 box-content" />
                    )}
                    {level > 0 && (
                      <span className="absolute -bottom-1 -right-1 text-[7px] font-black text-amber-200 bg-amber-950 border border-amber-500/60 rounded-full px-1 leading-3">
                        {level}
                      </span>
                    )}
                  </div>
                  <span className={`text-[8px] font-black mt-1 max-w-[76px] truncate ${isSel ? 'text-amber-300' : 'text-zinc-300'}`}>
                    {p.node.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 选中节点信息面板（描述 / 增益 / 升级 / 阻塞） */}
          {selected ? (
            <div className={`rounded-lg border px-2 py-1.5 flex flex-col gap-1 ${selLocked ? 'border-zinc-800 bg-zinc-900/20' : 'border-amber-500/30 bg-zinc-900/40'}`}>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black text-zinc-100 flex-1 truncate">
                  {selLocked && <Lock className="w-2.5 h-2.5 inline-block mr-1 text-zinc-500" />}
                  {selected.name}
                </span>
                <span className="text-[8px] font-bold text-amber-300">{selLevel}/{selected.maxLevel}</span>
                <button
                  onClick={() => handleUnallocate(selected.id)}
                  disabled={selLevel <= 0}
                  className="w-4.5 h-4.5 rounded border text-[9px] font-black leading-none transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-25 border-rose-500/40 bg-rose-950/40 text-rose-300 shrink-0"
                  title="撤销 1 点"
                >
                  −
                </button>
                <button
                  onClick={() => handleAllocate(selected.id)}
                  disabled={selLocked || selLevel >= selected.maxLevel || points < 1}
                  className="w-4.5 h-4.5 rounded border text-[9px] font-black leading-none transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-25 border-emerald-500/40 bg-emerald-950/40 text-emerald-300 shrink-0"
                  title={selLocked ? `被【${selParents}】阻塞` : selLevel >= selected.maxLevel ? '已满级' : points < 1 ? '天赋点不足' : '投入 1 点'}
                >
                  +
                </button>
              </div>
              <div className="text-[8px] text-zinc-400 font-bold">{selected.description}</div>
              <div className="text-[8px] font-bold text-emerald-500/80">增益：{formatTalentEffect(selected.effect)}/级</div>
              {selLocked && (
                <div className="text-[8px] font-bold text-amber-500/80">
                  被【{selParents}】阻塞：父节点已投入 {Math.max(...(selected.requires || []).map(pid => getTalentLevel(hero, pid)))} 点，需 ≥1 点后可升级（可查看信息）。
                </div>
              )}
            </div>
          ) : (
            <p className="text-[8px] text-zinc-600 font-bold">点击上方节点查看详情与投入天赋点。</p>
          )}

          {/* 汇总行 */}
          {(Object.keys(bonus).length > 0 || invested > 0) && (
            <p className="text-[8px] font-bold text-emerald-500/80 mt-0.5">
              当前加成：{formatTalentEffect(bonus) || '—'}（已投入 {invested} 点）
            </p>
          )}
          {points === 0 && invested === 0 && (
            <p className="text-[8px] text-zinc-600 font-bold">战斗升级获得天赋点，投入后效果在战斗中生效。</p>
          )}
          {tree.some(n => n.id.startsWith('hero_')) && (
            <p className="text-[8px] font-black text-zinc-600 tracking-wider mt-0.5">【英雄专属】星形节点为英雄专属天赋。</p>
          )}
        </>
      )}
    </div>
  );
};

export default HeroTalentPanel;
