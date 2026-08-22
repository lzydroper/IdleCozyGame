import React from 'react';
import type { CombatSettlement, BattleResult } from '../types/game';
import { formatBattleEvent } from '../state/battleEventPresentation';
import { CheckCircle2, AlertTriangle, Swords, Gem, Sparkles } from 'lucide-react';
import GameIcon from './GameIcon';
import { ITEMS_CONFIG } from '../data/items';

interface CombatEventLogProps {
  settlement: CombatSettlement;
  zoneName?: string;
}

const ResultCard: React.FC<{ battle: BattleResult }> = ({ battle }) => {
  const outcome = battle.outcome ?? (battle.victory ? 'victory' : battle.partyWiped ? 'defeat' : 'draw');
  if (outcome === 'victory') {
    return (
      <div className="rounded-xl border p-3 flex items-center gap-2 bg-emerald-950/40 border-emerald-500/40">
        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        <span className="text-xs font-black text-emerald-300">战斗胜利！</span>
      </div>
    );
  }
  if (outcome === 'defeat') {
    return (
      <div className="rounded-xl border p-3 flex items-center gap-2 bg-red-950/40 border-red-500/40">
        <AlertTriangle className="w-4 h-4 text-red-400" />
        <span className="text-xs font-black text-red-300">战斗失败！小队全员重伤。</span>
      </div>
    );
  }
  return (
    <div className="rounded-xl border p-3 flex items-center gap-2 bg-zinc-900/80 border-zinc-700/60">
      <Swords className="w-4 h-4 text-zinc-400" />
      <span className="text-xs font-black text-zinc-300">战斗平局（达到轮次上限）</span>
    </div>
  );
};

/**
 * 战斗信息轮播（combat-turn）：纯事件流展示，无血条步进回放。
 * 完整轮播 UI（逐条播放/倍速/停留）属 UI 模块后续工作。
 */
export const CombatEventLog: React.FC<CombatEventLogProps> = ({ settlement, zoneName = '战斗区域' }) => {
  const battle = settlement.battle;
  // 旧存档/损坏数据的运行时防御：旧回放形状（actions/hpTrack）已在存档归一化时丢弃，这里兜底不崩溃。
  const events = Array.isArray(battle.events) ? battle.events : [];
  const rounds = Number.isFinite(battle.rounds) ? battle.rounds : 0;
  const outcome = battle.outcome ?? (battle.victory ? 'victory' : battle.partyWiped ? 'defeat' : 'draw');

  return (
    <div className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-950 to-zinc-900 p-3 flex flex-col gap-3 shadow-xl overflow-hidden">
      <header className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
        <div className="flex items-center gap-2">
          <Swords className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-black text-zinc-100">
            {zoneName} <span className="text-zinc-500 font-mono">({rounds}轮)</span>
          </span>
        </div>
      </header>

      <ResultCard battle={battle} />

      {/* 胜利奖励摘要 */}
      {outcome === 'victory' && (
        <div className="flex flex-wrap gap-1.5 text-[9px] font-bold">
          {Object.entries(settlement.drops).map(([itemId, qty]) => (
            <span key={itemId} className="px-2 py-1 rounded-md border border-amber-500/40 bg-amber-950/50 text-amber-300 flex items-center gap-1">
              <GameIcon type="item" id={itemId} className="w-3.5 h-3.5" />
              <span>{ITEMS_CONFIG[itemId]?.name || itemId} ×{qty}</span>
            </span>
          ))}
          {settlement.soulEchoes > 0 && (
            <span className="px-2 py-1 rounded-md border border-purple-500/40 bg-purple-950/50 text-purple-300 flex items-center gap-1">
              <Gem className="w-3 h-3" />
              <span>灵魂残响 ×{settlement.soulEchoes}</span>
            </span>
          )}
          {settlement.expPerHero > 0 && (
            <span className="px-2 py-1 rounded-md border border-cyan-500/40 bg-cyan-950/50 text-cyan-300 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>经验 ×{settlement.expPerHero} / 英雄</span>
            </span>
          )}
        </div>
      )}

      {/* 事件流日志（数据源 = battle.events） */}
      <div className="bg-zinc-950/80 rounded-xl p-2.5 flex flex-col gap-1 h-48 overflow-y-auto border border-zinc-800/80 font-mono text-[10px] leading-relaxed shadow-inner">
        {events.length === 0 ? (
          <div className="text-zinc-600 text-center my-auto py-4 text-[9px] font-sans italic">
            暂无战斗事件。
          </div>
        ) : (
          events
            .map((event) => ({ event, text: formatBattleEvent(event) }))
            .filter((item) => Boolean(item.text))
            .map(({ event, text }, idx, arr) => (
              <div
                key={event.seq}
                className={`flex items-center justify-between p-1 rounded ${
                  idx === arr.length - 1 ? 'bg-zinc-800/60 border-l-2 border-amber-400' : ''
                }`}
              >
                <span className="text-zinc-500 font-bold shrink-0 w-8">#{event.seq}</span>
                <span className="text-zinc-300 flex-1 truncate">{text}</span>
                <span className="text-zinc-600 shrink-0 ml-2">R{event.round}</span>
              </div>
            ))
        )}
      </div>
    </div>
  );
};

export default CombatEventLog;
