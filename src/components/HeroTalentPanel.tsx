import React from 'react';
import { useGame } from '../context/GameContext';
import { useToast } from './ToastSystem';
import { HEROES_CONFIG, HERO_CLASS_LABELS } from '../data/heroes';
import { formatTalentEffect } from '../data/talents';
import { getTalentNodes, getTalentLevel, getTalentBonus, getInvestedPoints } from '../state/talents';

// 英雄天赋面板（ticket 11）：职阶公共主干 + 英雄专属节点，加点/撤点/重置，效果计入战斗数值
const HeroTalentPanel: React.FC<{ heroId: string }> = ({ heroId }) => {
  const { state, allocateTalent, unallocateTalent, resetTalents } = useGame();
  const { showToast } = useToast();

  const hero = state.heroes[heroId];
  const config = HEROES_CONFIG[heroId];
  if (!hero || !config) return null;

  const nodes = getTalentNodes(heroId);
  const trunk = nodes.filter(n => n.id.startsWith('trunk_'));
  const own = nodes.filter(n => n.id.startsWith('hero_'));
  const points = hero.talentPoints || 0;
  const invested = getInvestedPoints(hero);
  const bonus = getTalentBonus(heroId, hero);

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
      showToast(`🌱 天赋已重置，返还 ${invested} 点。`, 'success');
    }
  };

  const renderNode = (node: (typeof nodes)[number]) => {
    const level = getTalentLevel(hero, node.id);
    const maxed = level >= node.maxLevel;
    const locked = (node.requires || []).some(req => getTalentLevel(hero, req) < 1);
    const hasDependents = nodes.some(
      other => other.id !== node.id && (other.requires || []).includes(node.id) && getTalentLevel(hero, other.id) >= 1
    );
    const canAllocate = !locked && !maxed && points > 0;
    const canUnallocate = level > 0 && !hasDependents;

    return (
      <div key={node.id} className={`rounded-lg border px-2 py-1.5 ${locked ? 'border-zinc-800/60 bg-zinc-900/20 opacity-60' : 'border-zinc-800/80 bg-zinc-900/40'}`}>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-black text-zinc-200 flex-1 truncate">
            {locked && <span className="mr-1">🔒</span>}
            {node.name}
          </span>
          <span className="text-[8px] font-bold text-emerald-400/90">
            {'★'.repeat(level)}{'☆'.repeat(Math.max(0, node.maxLevel - level))}
          </span>
          <span className="text-[8px] font-bold text-zinc-600">{level}/{node.maxLevel}</span>
          <button
            onClick={() => handleUnallocate(node.id)}
            disabled={!canUnallocate}
            className="w-5 h-5 rounded border text-[10px] font-black leading-none transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-25 border-rose-500/40 bg-rose-950/40 text-rose-300 hover:bg-rose-950/60"
            title="撤销 1 点"
          >
            −
          </button>
          <button
            onClick={() => handleAllocate(node.id)}
            disabled={!canAllocate}
            className="w-5 h-5 rounded border text-[10px] font-black leading-none transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-25 border-emerald-500/40 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-950/60"
            title={locked ? '前置未解锁' : maxed ? '已满级' : points < 1 ? '天赋点不足' : '投入 1 点'}
          >
            +
          </button>
        </div>
        <div className="text-[8px] text-zinc-500 font-bold mt-0.5">{formatTalentEffect(node.effect)}/级</div>
      </div>
    );
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-2 flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-black text-emerald-300/90 tracking-wide">🌳 天赋</span>
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

      {nodes.length === 0 ? (
        <p className="text-[8px] text-zinc-600 font-bold">该英雄暂无天赋配置。</p>
      ) : (
        <div className="flex flex-col gap-1">
          <span className="text-[8px] font-black text-zinc-500 tracking-wider">
            【{HERO_CLASS_LABELS[config.heroClass]} · 职阶主干】
          </span>
          <div className="flex flex-col gap-1">{trunk.map(renderNode)}</div>

          {own.length > 0 && (
            <>
              <span className="text-[8px] font-black text-zinc-500 tracking-wider mt-1">【英雄专属】</span>
              <div className="flex flex-col gap-1">{own.map(renderNode)}</div>
            </>
          )}

          {(Object.keys(bonus).length > 0 || invested > 0) && (
            <p className="text-[8px] font-bold text-emerald-500/80 mt-0.5">
              当前加成：{formatTalentEffect(bonus) || '—'}（已投入 {invested} 点）
            </p>
          )}
          {points === 0 && invested === 0 && (
            <p className="text-[8px] text-zinc-600 font-bold">战斗升级获得天赋点，投入后效果在战斗中生效。</p>
          )}
        </div>
      )}
    </div>
  );
};

export default HeroTalentPanel;
