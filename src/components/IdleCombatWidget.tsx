import React, { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import { useGame } from '../context/GameContext';
import { getRegion, getLevel } from '../state/regionSelectors';
import { ITEMS_CONFIG } from '../configs/loaders/items.loader';

import { getIdleFeedSnapshot, subscribeIdleFeed, getLastIdleStop, clearLastIdleStop, type IdleFeedEntry, type IdleStopRecord } from '../state/idleFeed';
import type { IdleSummaryData } from '../state/levelCombat';
import { COMBAT_CONFIG } from '../configs/constants/combatConfig';
import GameIcon from './GameIcon';
import { formatDuration } from '../utils/time';

export interface IdleCombatWidgetProps {
  regionId: string;
  levelId: string;
  onStop: (summary: IdleSummaryData | null) => void;
}

const MAX_STREAM_LOGS = 50;

/**
 * 挂机监控看板（combat-experience 01 / X1+X2）：
 * 纯消费者——事件流来自 GameContext Tick 单一生产者写入的 idleFeed 环形缓冲；
 * 本组件不再自行模拟战斗（删除原 setInterval + simulateBattle 双重模拟与队列播放器），
 * 切换 Tab 卸载后挂机推进与事件流不受影响。
 */
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

  // 订阅共享 feed（单一生产者写入；快照引用稳定，适配 useSyncExternalStore）。
  const feed = useSyncExternalStore(subscribeIdleFeed, getIdleFeedSnapshot);

  // 视图侧步进播放器（combat-experience 01 补丁）：生产者一次性写入整场事件行，
  // 消费端按 baseEventIntervalMs 逐行放出，恢复旧版的流式观感；数据与视图解耦不变。
  const [displayed, setDisplayed] = useState<IdleFeedEntry[]>([]);
  const lastRenderedIdRef = useRef(0);
  const initializedRef = useRef(false);

  useEffect(() => {
    // 首次挂载：直接呈现缓冲尾部最近 3 行，游标快进到最新（历史不全量重放）。
    if (!initializedRef.current) {
      initializedRef.current = true;
      if (feed.length > 0) {
        const tail = feed.slice(-3);
        lastRenderedIdRef.current = tail[tail.length - 1].id;
        setDisplayed(tail);
      }
      return;
    }
    const fresh = feed.filter(entry => entry.id > lastRenderedIdRef.current);
    if (fresh.length === 0) return;
    let index = 0;
    const timer = setInterval(() => {
      if (index >= fresh.length) {
        clearInterval(timer);
        return;
      }
      const entry = fresh[index];
      index += 1;
      lastRenderedIdRef.current = entry.id;
      setDisplayed(prev => [...prev.slice(-(MAX_STREAM_LOGS - 1)), entry]);
    }, COMBAT_CONFIG.baseEventIntervalMs);
    return () => clearInterval(timer);
  }, [feed]);

  const visible = displayed;

  // 战败回顾（combat-experience 04 / O#5）：挂机态消失且上次中断原因为战败时呈现。
  const [defeatReview, setDefeatReview] = useState<IdleStopRecord | null>(null);
  useEffect(() => {
    if (!idle?.regionId) {
      const record = getLastIdleStop();
      if (record && record.reason === 'defeat') setDefeatReview(record);
    } else {
      setDefeatReview(null);
      clearLastIdleStop();
    }
  }, [idle?.regionId]);

  // 1s 周期刷新挂机时长（纯视图计时）
  useEffect(() => {
    const updateElapsed = () => {
      const start = idle?.startTime ?? startTime;
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    };

    updateElapsed();
    const timer = setInterval(updateElapsed, 1000);
    return () => clearInterval(timer);
  }, [idle?.startTime, startTime]);

  // 智能跟随滚动：仅当用户处于底部时自动下滚，若用户向上滑动查看历史则不打断
  useEffect(() => {
    const container = logContainerRef.current;
    if (!container) return;
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight <= 24;
    if (isAtBottom) {
      container.scrollTop = container.scrollHeight;
    }
  }, [displayed.length]);

  // 新一轮挂机开启：清空上一轮的视图缓冲，游标对齐当前 feed。
  useEffect(() => {
    if (!idle?.regionId) return;
    setDisplayed([]);
    if (feed.length > 0) lastRenderedIdRef.current = feed[feed.length - 1].id;
  }, [idle?.startTime]);

  const handleStop = () => {
    const outcome = stopLevelIdle();
    onStop(outcome.summary);
  };

  const totalBattles = idle?.totalBattles || 0;
  const totalDrops = idle?.totalDrops || {};
  const totalSoulEchoes = idle?.totalSoulEchoes || 0;
  const dropEntries = Object.entries(totalDrops).filter(([, qty]) => qty > 0);
  const hasLoot = dropEntries.length > 0 || totalSoulEchoes > 0;

  const renderLine = (entry: { id: number; text: string; kind: string }) => {
    if (entry.kind === 'victory') {
      return (
        <div key={entry.id} className="text-[11px] leading-relaxed text-emerald-300 font-bold">
          {entry.text}
        </div>
      );
    }
    if (entry.kind === 'defeat') {
      return (
        <div key={entry.id} className="text-[11px] leading-relaxed text-red-400 font-bold">
          {entry.text}
        </div>
      );
    }
    if (entry.kind === 'system') {
      return (
        <div key={entry.id} className="text-[11px] leading-relaxed text-amber-400 font-bold">
          {entry.text}
        </div>
      );
    }
    return (
      <div key={entry.id} className="text-[11px] leading-relaxed text-zinc-300">
        {entry.text}
      </div>
    );
  };

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

      {/* 战败回顾（O#5） */}
      {defeatReview && (
        <div data-testid="idle-defeat-review" className="rounded-xl border border-red-500/40 bg-red-950/30 p-3 space-y-1.5">
          <div className="text-xs font-black text-red-300">战败回顾</div>
          <div className="text-[11px] text-zinc-300 leading-relaxed">
            关卡：<span className="font-bold">{getLevel(defeatReview.regionId, defeatReview.levelId)?.name || defeatReview.levelId}</span>
            {' · '}出战 {defeatReview.totalBattles} 场，胜利 {defeatReview.totalVictories} 场
            {defeatReview.totalSoulEchoes > 0 && ` · 灵魂残响 ×${defeatReview.totalSoulEchoes}`}
          </div>
          <div className="text-[10px] text-zinc-400 leading-relaxed">
            小队全员重伤，已自动停止挂机。请前往「英雄」页使用纳米修复剂治愈后重新开启挂机。
          </div>
          <button
            data-testid="idle-defeat-review-dismiss"
            onClick={() => {
              clearLastIdleStop();
              setDefeatReview(null);
            }}
            className="h-7 px-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-200 text-[11px] font-bold rounded-lg cursor-pointer active:scale-95 transition-all"
          >
            知道了
          </button>
        </div>
      )}

      {/* 3 行固定高度可滚动的事件流窗口（单一生产者写入，本组件纯订阅） */}
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
          {visible.length === 0 ? (
            <div className="text-[11px] leading-relaxed text-amber-400 font-bold">
              ▶ 挂机已开启：队伍进入持续战斗循环...
            </div>
          ) : (
            visible.map(renderLine)
          )}
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
