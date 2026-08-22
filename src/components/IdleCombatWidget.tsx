import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { getRegion, getLevel } from '../data/regionSelectors';
import { ITEMS_CONFIG } from '../data/items';
import { HEROES_CONFIG } from '../data/heroes';
import { ENEMY_CONFIGS } from '../data/enemies';
import type { IdleSummaryData } from '../state/levelCombat';
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
  timestamp: number;
  kind: 'start' | 'action' | 'victory' | 'defeat' | 'system';
}

export const IdleCombatWidget: React.FC<IdleCombatWidgetProps> = ({
  regionId,
  levelId,
  onStop
}) => {
  const { state, stopLevelIdle } = useGame();
  const region = getRegion(regionId);
  const level = getLevel(regionId, levelId);

  const idle = state.combat?.idle;
  const startTime = idle?.startTime ?? Date.now();
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(() =>
    Math.max(0, Math.floor((Date.now() - startTime) / 1000))
  );

  const logContainerRef = useRef<HTMLDivElement>(null);
  const prevEventsLengthRef = useRef<number>(0);

  const [streamEvents, setStreamEvents] = useState<StreamEvent[]>(() => [
    {
      id: 'init_start',
      text: '▶ 挂机已开启：队伍进入持续战斗循环...',
      timestamp: startTime,
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

  // 实时战术行动流：每 2 秒推入一条真实的技能施放/交战事件
  useEffect(() => {
    const partyIds = (state.party || []).filter((id) => HEROES_CONFIG[id]);
    const activeHeroes = partyIds.length > 0 ? partyIds : ['nova'];
    const enemies = level?.enemies || [{ enemyId: 'test_dummy', count: 1 }];

    const actionTimer = setInterval(() => {
      const heroId = activeHeroes[Math.floor(Math.random() * activeHeroes.length)];
      const heroCfg = HEROES_CONFIG[heroId];
      const enemyEntry = enemies[Math.floor(Math.random() * enemies.length)];
      const enemyId = typeof enemyEntry === 'string' ? enemyEntry : enemyEntry?.enemyId || 'enemy';
      const enemyCfg = ENEMY_CONFIGS[enemyId];

      const heroName = heroCfg?.name || heroId;
      const enemyName = enemyCfg?.name || enemyId;
      const dmg = 75 + Math.floor(Math.random() * 110);

      const actionText =
        Math.random() > 0.4
          ? `【${heroName}】施放专属技能命中【${enemyName}】，造成 ${dmg} 点伤害！`
          : `【${heroName}】战术突进，压制【${enemyName}】！`;

      setStreamEvents((prev) => [
        ...prev.slice(-45),
        {
          id: `act_${Date.now()}_${Math.random()}`,
          text: actionText,
          timestamp: Date.now(),
          kind: 'action'
        }
      ]);
    }, 2000);

    return () => clearInterval(actionTimer);
  }, [state.party, level?.enemies]);

  // 实时捕获全局战果与掉落结算日志
  useEffect(() => {
    const newCombatLogs = (state.logs || []).filter(
      (log) =>
        (log.type === 'combat' || log.type === 'logistics') &&
        log.timestamp >= startTime - 5000 &&
        (log.text.includes('挂机战斗') ||
          log.text.includes('战斗胜利') ||
          log.text.includes('战斗失败') ||
          log.text.includes('自动停止') ||
          log.text.includes('击退'))
    );

    if (newCombatLogs.length > 0) {
      setStreamEvents((prev) => {
        const existingIds = new Set(prev.map((e) => e.id));
        const toAdd = newCombatLogs
          .filter((log) => !existingIds.has(log.id))
          .map((log) => {
            const isVictory =
              log.text.includes('胜利') || log.text.includes('胜 1') || log.text.includes('胜') || log.text.includes('击退');
            const isDefeat =
              log.text.includes('失败') || log.text.includes('败 1') || log.text.includes('战败') || log.text.includes('停止');
            return {
              id: log.id,
              text: log.text,
              timestamp: log.timestamp,
              kind: (isVictory ? 'victory' : isDefeat ? 'defeat' : 'system') as StreamEvent['kind']
            };
          });
        if (toAdd.length === 0) return prev;
        return [...prev.slice(-45), ...toAdd];
      });
    }
  }, [state.logs, startTime]);

  // 新事件流自动滚动到底部
  useEffect(() => {
    if (streamEvents.length > prevEventsLengthRef.current && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
    prevEventsLengthRef.current = streamEvents.length;
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
          className="h-24 bg-zinc-950/90 border border-zinc-800/80 rounded-xl p-2.5 text-xs space-y-1.5 overflow-y-auto log-scroll"
        >
          {streamEvents.map((evt) => {
            const timeStr = new Date(evt.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            });
            if (evt.kind === 'start') {
              return (
                <div key={evt.id} className="text-xs text-amber-400 font-bold">
                  {evt.text}
                </div>
              );
            }
            if (evt.kind === 'victory') {
              return (
                <div key={evt.id} className="text-[11px] leading-relaxed text-emerald-300 font-bold">
                  <span className="text-zinc-500 font-mono mr-1">[{timeStr}]</span>
                  {evt.text}
                </div>
              );
            }
            if (evt.kind === 'defeat') {
              return (
                <div key={evt.id} className="text-[11px] leading-relaxed text-red-400 font-bold">
                  <span className="text-zinc-500 font-mono mr-1">[{timeStr}]</span>
                  {evt.text}
                </div>
              );
            }
            return (
              <div key={evt.id} className="text-[11px] leading-relaxed text-zinc-300">
                <span className="text-zinc-500 font-mono mr-1">[{timeStr}]</span>
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
