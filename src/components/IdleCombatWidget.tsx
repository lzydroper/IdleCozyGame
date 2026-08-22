import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { getRegion, getLevel } from '../data/regionSelectors';
import { ITEMS_CONFIG } from '../data/items';
import { ENEMY_CONFIGS } from '../data/enemies';
import { formatBattleEvent } from '../state/battleEventPresentation';
import { heroToCombatant, simulateBattle, enemyConfigToEntity } from '../state/combat';
import { aggregateBonus } from '../state/bonds';
import { settleLevelBattle } from '../state/levelCombat';
import type { IdleSummaryData } from '../state/levelCombat';
import type { GameState } from '../types/game';
import GameIcon from './GameIcon';
import { formatDuration } from '../utils/time';

export interface IdleCombatWidgetProps {
  regionId: string;
  levelId: string;
  onStop: (summary: IdleSummaryData | null) => void;
}

interface StreamEvent {
  id: string;
  text: string;
  kind: 'start' | 'round' | 'turn' | 'action' | 'victory' | 'defeat' | 'next_round';
}

const MAX_STREAM_LOGS = 50;

export const IdleCombatWidget: React.FC<IdleCombatWidgetProps> = ({
  regionId,
  levelId,
  onStop
}) => {
  const { state, setState, stopLevelIdle } = useGame();
  const region = getRegion(regionId);
  const level = getLevel(regionId, levelId);

  const idle = state.combat?.idle;
  const startTime = idle?.startTime ?? Date.now();
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(() =>
    Math.max(0, Math.floor((Date.now() - startTime) / 1000))
  );

  const logContainerRef = useRef<HTMLDivElement>(null);
  const queueRef = useRef<{ text: string; kind: StreamEvent['kind'] }[]>([]);
  const isSimulatingRef = useRef<boolean>(false);

  const [streamEvents, setStreamEvents] = useState<StreamEvent[]>(() => [
    {
      id: 'init_start',
      text: '▶ 挂机已开启：队伍进入持续战斗循环...',
      kind: 'start'
    }
  ]);

  // 1s 周期刷新挂机时长
  useEffect(() => {
    const updateElapsed = () => {
      const start = idle?.startTime ?? startTime;
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    };

    updateElapsed();
    const timer = setInterval(updateElapsed, 1000);
    return () => clearInterval(timer);
  }, [idle?.startTime, startTime]);

  // 战斗事件流步进播放与下一轮自动模拟推进
  useEffect(() => {
    if (!region || !level || !idle?.regionId) return;

    const playInterval = setInterval(() => {
      // 1. 如果队列中有待播报的战斗事件，弹出一条推入显示流
      if (queueRef.current.length > 0) {
        const nextEvt = queueRef.current.shift()!;
        setStreamEvents((prev) => [
          ...prev.slice(-MAX_STREAM_LOGS + 1),
          {
            id: `evt_${Date.now()}_${Math.random()}`,
            text: nextEvt.text,
            kind: nextEvt.kind
          }
        ]);
        return;
      }

      // 2. 如果队列为空，且没有正在模拟计算，开始进行新一轮战斗模拟
      if (isSimulatingRef.current) return;

      const party = (state.party || []).filter((id) => state.heroes[id] && !state.heroes[id].wounded);
      if (party.length === 0) {
        const outcome = stopLevelIdle();
        onStop(outcome.summary);
        return;
      }

      // 检查体力是否足够开启新的一轮
      if ((state.stamina || 0) < level.staminaCost) {
        const outcome = stopLevelIdle();
        onStop(outcome.summary);
        return;
      }

      isSimulatingRef.current = true;

      // 模拟战斗
      const heroEntities = party.map((id) =>
        heroToCombatant(id, state.heroes[id], aggregateBonus(party), state.equipment?.[id] || null)
      );
      const enemyEntities = level.enemies.map((e: string | { enemyId: string; count?: number }) => {
        const enemyId = typeof e === 'string' ? e : e.enemyId;
        const cfg = ENEMY_CONFIGS[enemyId];
        return enemyConfigToEntity(cfg || {
          id: enemyId,
          name: enemyId,
          description: enemyId,
          kind: 'enemy',
          role: 'normal',
          faction: 'mechanical',
          baseAttributes: { maxHp: 20, attack: 2, defense: 0 }
        });
      });

      const battle = simulateBattle(heroEntities, enemyEntities);
      const settled = settleLevelBattle(state, battle, party, regionId, level, Math.random);

      // 将本场战斗的原始事件流格式化存入播放队列
      const formattedLines: { text: string; kind: StreamEvent['kind'] }[] = [];
      battle.events.forEach((evt) => {
        const text = formatBattleEvent(evt);
        const kind: StreamEvent['kind'] =
          evt.key === 'roundStart' || evt.key === 'roundEnd'
            ? 'round'
            : evt.key === 'turnStart' || evt.key === 'turnEnd'
            ? 'turn'
            : 'action';
        formattedLines.push({ text, kind });
      });

      if (battle.victory) {
        formattedLines.push({ text: '战斗胜利！', kind: 'victory' });
        formattedLines.push({ text: '▶ 开启下一轮战斗...', kind: 'next_round' });
      } else {
        formattedLines.push({ text: '战斗失败！小队全员重伤。', kind: 'defeat' });
      }

      queueRef.current = formattedLines;

      // 结算战利品、体力扣减、场次累加与英雄血量继承
      setState((prev) => {
        const prevIdle = prev.combat?.idle;
        if (!prevIdle?.regionId) return prev;

        const mergedDrops = { ...(prevIdle.totalDrops || {}) };
        Object.entries(settled.settlement.drops).forEach(([itemId, qty]) => {
          mergedDrops[itemId] = (mergedDrops[itemId] || 0) + qty;
        });

        const nextIdle = {
          ...prevIdle,
          totalBattles: (prevIdle.totalBattles || 0) + 1,
          totalVictories: (prevIdle.totalVictories || 0) + (battle.victory ? 1 : 0),
          totalDefeats: (prevIdle.totalDefeats || 0) + (battle.partyWiped ? 1 : 0),
          totalDrops: mergedDrops,
          totalSoulEchoes: (prevIdle.totalSoulEchoes || 0) + settled.settlement.soulEchoes
        };

        return {
          ...prev,
          stamina: settled.nextStamina,
          inventory: settled.nextInventory,
          equipmentInventory: settled.nextEquipmentInventory as GameState['equipmentInventory'],
          heroes: settled.nextHeroes,
          combat: {
            ...prev.combat,
            idle: nextIdle,
            lastSettlement: settled.settlement
          }
        };
      });

      isSimulatingRef.current = false;
    }, 280);

    return () => clearInterval(playInterval);
  }, [region, level, idle?.regionId, state.party, state.stamina, state.heroes, state.equipment, state.inventory]);

  // 智能跟随滚动：仅当用户处于底部时自动下滚，若用户向上滑动查看历史则不打断
  useEffect(() => {
    const container = logContainerRef.current;
    if (!container) return;
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight <= 24;
    if (isAtBottom) {
      container.scrollTop = container.scrollHeight;
    }
  }, [streamEvents.length]);

  const handleStop = () => {
    const outcome = stopLevelIdle();
    onStop(outcome.summary);
  };

  const totalBattles = idle?.totalBattles || 0;
  const totalDrops = idle?.totalDrops || {};
  const totalSoulEchoes = idle?.totalSoulEchoes || 0;
  const dropEntries = Object.entries(totalDrops).filter(([, qty]) => qty > 0);
  const hasLoot = dropEntries.length > 0 || totalSoulEchoes > 0;

  return (
    <div
      data-testid="idle-combat-widget"
      className="bg-zinc-900/90 border border-amber-500/40 rounded-2xl p-4 space-y-3 shadow-xl shadow-amber-950/20 animate-fade-in"
    >
      {/* 顶部标题与控制 */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
        <div>
          <div className="text-xs font-black text-amber-300 flex items-center gap-1.5" data-testid="idle-widget-title">
            <GameIcon type="zone" id={region?.id || regionId} className="w-3.5 h-3.5" />
            挂机中：{region?.name || regionId} · {level?.name || levelId}
          </div>
          <div className="text-[10px] text-zinc-500 mt-0.5" data-testid="idle-widget-timer">
            已挂机 <span className="font-mono text-zinc-300 font-bold">{formatDuration(elapsedSeconds)}</span> · 完成战斗{' '}
            <span className="font-mono text-emerald-400 font-bold">{totalBattles}</span> 场
          </div>
        </div>

        <button
          data-testid="idle-widget-stop-btn"
          onClick={handleStop}
          className="h-8 px-3.5 bg-red-950/50 border border-red-500/50 hover:bg-red-900/50 text-red-300 text-xs font-black rounded-xl cursor-pointer active:scale-95 transition-all flex items-center justify-center shrink-0"
        >
          停止挂机
        </button>
      </div>

      {/* 3 行固定高度可滚动的完整事件流窗口 */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-[10px] text-zinc-400 font-bold">
          <span>实时战斗事件流（可向上滑动查阅）</span>
          <span className="text-amber-500/80 font-mono text-[9px]">在线推进中</span>
        </div>
        <div
          ref={logContainerRef}
          data-testid="idle-log-container"
          className="h-24 bg-zinc-950/90 border border-zinc-800/80 rounded-xl p-2.5 text-xs space-y-1 overflow-y-auto log-scroll"
        >
          {streamEvents.map((evt) => {
            if (evt.kind === 'victory') {
              return (
                <div key={evt.id} className="text-[11px] leading-relaxed text-emerald-300 font-bold">
                  {evt.text}
                </div>
              );
            }
            if (evt.kind === 'defeat') {
              return (
                <div key={evt.id} className="text-[11px] leading-relaxed text-red-400 font-bold">
                  {evt.text}
                </div>
              );
            }
            if (evt.kind === 'next_round' || evt.kind === 'start') {
              return (
                <div key={evt.id} className="text-[11px] leading-relaxed text-amber-400 font-bold">
                  {evt.text}
                </div>
              );
            }
            return (
              <div key={evt.id} className="text-[11px] leading-relaxed text-zinc-300">
                {evt.text}
              </div>
            );
          })}
        </div>
      </div>

      {/* 本次挂机累计收益 */}
      <div className="space-y-1">
        <div className="text-[10px] text-zinc-500 font-bold">本次挂机累计收益</div>
        <div className="flex flex-wrap gap-1.5 text-xs" data-testid="idle-widget-drops">
          {!hasLoot ? (
            <span className="text-[10px] text-zinc-600 italic">战利品结算中...</span>
          ) : (
            <>
              {dropEntries.map(([itemId, qty]) => {
                const cfg = ITEMS_CONFIG[itemId];
                return (
                  <span
                    key={itemId}
                    className="px-2.5 py-1 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-300 font-bold flex items-center gap-1 text-[11px]"
                  >
                    <GameIcon type="item" id={itemId} className="w-3.5 h-3.5" />
                    {cfg?.name || itemId} ×{qty}
                  </span>
                );
              })}
              {totalSoulEchoes > 0 && (
                <span className="px-2.5 py-1 bg-zinc-950 border border-zinc-800 rounded-lg text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                  <GameIcon type="item" id="soul_echo" className="w-3.5 h-3.5" />
                  灵魂残响 ×{totalSoulEchoes}
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default IdleCombatWidget;

