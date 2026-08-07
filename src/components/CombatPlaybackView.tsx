import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { CombatSettlement, BattleAction, BattleHpEntry } from '../types/game';
import { ITEMS_CONFIG } from '../data/items';
import { FastForward, Zap, CheckCircle2, AlertTriangle, Shield, Play, Pause, RotateCcw, Swords, Gem, Sparkles } from 'lucide-react';
import GameIcon from './GameIcon';

interface CombatPlaybackViewProps {
  settlement: CombatSettlement;
  zoneName?: string;
  /** 是否自动逐动作播放（新战斗 true；历史结算静态展示传 false，直接显示最终状态） */
  autoPlay?: boolean;
  /** 播放完成（自动播完或 Skip）时触发一次；历史静态展示不会触发 */
  onComplete?: () => void;
  /** 可选：提供后完成态渲染「离开」按钮，由用户主动点击退出（如遭遇战播完停留） */
  onExit?: () => void;
  /** 离开按钮文案（默认「离开战斗」） */
  exitLabel?: string;
}

/**
 * 用 settlement 的关键字段派生一个稳定的 "battle key"，
 * 只有真正开启了新一场战斗（actions/rounds/outcome 改变）时才视为不同战斗。
 * 这样离线 tick 更新 state 对象引用时不会触发重置。
 */
function deriveBattleKey(s: CombatSettlement): string {
  return `${s.battle.rounds}|${s.battle.actions.length}|${s.battle.victory}|${s.battle.partyWiped}|${s.expPerHero}`;
}

export const CombatPlaybackView: React.FC<CombatPlaybackViewProps> = ({
  settlement,
  zoneName = '战斗区域',
  autoPlay = true,
  onComplete,
  onExit,
  exitLabel = '离开战斗'
}) => {
  const actions = settlement.battle.actions;

  // 派生稳定 key，用于判断是否切换到了新战斗
  const battleKey = useMemo(() => deriveBattleKey(settlement), [settlement]);
  const prevBattleKeyRef = useRef<string>(battleKey);

  // 完成回调防重入（StrictMode 下 updater 会 double-invoke，故用 effect + ref 只触发一次）
  const completedRef = useRef<boolean>(false);

  // 倍速状态：1x -> 2x -> 4x
  const [speed, setSpeed] = useState<1 | 2 | 4>(1);

  // 步进索引：autoPlay=false 时直接显示最终状态（历史结算静态展示，不自动播放）
  // 用 render-phase 比较（而非 useEffect）来重置 actionIndex，避免出现"已完成"状态的闪现帧
  const [actionIndex, setActionIndex] = useState<number>(autoPlay ? 0 : actions.length);
  const [currentBattleKey, setCurrentBattleKey] = useState<string>(battleKey);

  // 当 battleKey 改变时，在 render 阶段同步重置（不等 useEffect 周期）
  if (battleKey !== currentBattleKey) {
    setCurrentBattleKey(battleKey);
    setActionIndex(autoPlay ? 0 : actions.length);
    completedRef.current = false;
    prevBattleKeyRef.current = battleKey;
  }

  // 是否暂停
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const isFinished = actionIndex >= actions.length;
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!autoPlay || !isFinished || completedRef.current) return;
    completedRef.current = true;
    if (onComplete) onComplete();
  }, [autoPlay, isFinished, onComplete]);

  // 自动滚动到最新日志
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [actionIndex]);

  // 定时器驱动逐动作步进；历史静态展示（autoPlay=false）不启动
  useEffect(() => {
    if (!autoPlay || isFinished || isPaused) return;

    // 1x = 800ms, 2x = 400ms, 4x = 200ms
    const intervalMs = Math.max(100, Math.round(800 / speed));

    const timer = setTimeout(() => {
      setActionIndex((prev) => prev + 1);
    }, intervalMs);

    return () => clearTimeout(timer);
  }, [autoPlay, actionIndex, speed, isFinished, isPaused, actions.length, onComplete]);

  // 循环切换倍速
  const handleToggleSpeed = () => {
    if (speed === 1) setSpeed(2);
    else if (speed === 2) setSpeed(4);
    else setSpeed(1);
  };

  // 单场 Skip 瞬间完成（onComplete 由 isFinished effect 统一触发）
  const handleSkip = () => {
    setActionIndex(actions.length);
  };

  // 重新播放（不重置 completedRef：重播仅是重看动画，结果提示每场战斗只弹一次）
  const handleReplay = () => {
    setActionIndex(0);
    setIsPaused(false);
  };

  // 已播报的动作日志
  const visibleActions = actions.slice(0, actionIndex);

  const victory = settlement.battle.victory;
  const wiped = settlement.battle.partyWiped;

  // 血条快照（ticket 21）：actionIndex 对应已执行动作数，取第 actionIndex 帧快照
  const hpTrack = settlement.battle.hpTrack;
  const currentHp = hpTrack ? hpTrack[Math.min(actionIndex, hpTrack.length - 1)] : null;
  const heroSide = currentHp ? currentHp.filter(x => x.side === 'hero') : [];
  const enemySide = currentHp ? currentHp.filter(x => x.side === 'enemy') : [];

  // 单条血条
  const HpBar: React.FC<{ entry: BattleHpEntry }> = ({ entry }) => {
    const pct = entry.maxHp > 0 ? Math.max(0, Math.min(100, (entry.hp / entry.maxHp) * 100)) : 0;
    const isHero = entry.side === 'hero';
    const barColor = isHero
      ? 'bg-gradient-to-r from-cyan-500 to-sky-400'
      : 'bg-gradient-to-r from-rose-600 to-red-400';
    return (
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <span className="text-[9px] shrink-0 w-14 truncate text-right flex items-center justify-end gap-1">
          {entry.side === 'hero' ? (
            <GameIcon type="hero" id={entry.id} className="w-3.5 h-3.5" />
          ) : (
            <GameIcon type="enemy" id={entry.id} className="w-3.5 h-3.5" />
          )}
          {entry.name}
        </span>
        <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700/70 min-w-0">
          <div
            className={`h-full rounded-full transition-all duration-300 ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={`text-[9px] font-mono shrink-0 w-12 ${isHero ? 'text-cyan-300' : 'text-rose-300'}`}>
          {entry.hp}/{entry.maxHp}
        </span>
      </div>
    );
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-950 to-zinc-900 p-3 flex flex-col gap-3 shadow-xl overflow-hidden">
      {/* 顶部标题与倍速/Skip 控制条 */}
      <header className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-black text-zinc-100">
            {zoneName} <span className="text-zinc-500 font-mono">({settlement.battle.rounds}回合)</span>
          </span>
        </div>

        {/* 右侧控制组: 暂停 / 倍速 / Skip / 重播（历史静态展示 autoPlay=false 时不显示） */}
        {autoPlay && (
          <div className="flex items-center gap-1.5">
            {!isFinished ? (
              <>
                {/* 暂停/继续 */}
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold flex items-center gap-1 border border-zinc-700 cursor-pointer active:scale-95 transition-all"
                  title={isPaused ? '继续' : '暂停'}
                >
                  {isPaused ? <Play className="w-3 h-3 text-emerald-400" /> : <Pause className="w-3 h-3 text-amber-400" />}
                </button>

                {/* 1x -> 2x -> 4x 倍速切换按钮 */}
                <button
                  onClick={handleToggleSpeed}
                  className="px-2 py-1 rounded-lg bg-amber-950/70 border border-amber-500/50 hover:bg-amber-900 text-amber-300 text-[10px] font-black flex items-center gap-1 cursor-pointer active:scale-95 transition-all shadow-sm"
                  title="切换播放倍速"
                >
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>{speed}x</span>
                </button>

                {/* 单场 Skip 瞬间结算按钮 */}
                <button
                  onClick={handleSkip}
                  className="px-2 py-1 rounded-lg bg-gradient-to-r from-purple-900 to-indigo-900 border border-purple-400/50 hover:brightness-110 text-purple-200 text-[10px] font-black flex items-center gap-1 cursor-pointer active:scale-95 transition-all shadow-sm"
                  title="跳过战斗动画"
                >
                  <FastForward className="w-3 h-3 text-purple-300" />
                  <span>跳过</span>
                </button>
              </>
            ) : (
              <button
                onClick={handleReplay}
                className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
                title="重播战斗动画"
              >
                <RotateCcw className="w-3 h-3 text-amber-400" />
                <span>重播</span>
              </button>
            )}
          </div>
        )}
      </header>

      {/* 实时血条（ticket 21）：随动作步进扣减，无 hpTrack(旧存档)时回退纯日志 */}
      {currentHp && (
        <div className="flex flex-col gap-1.5 bg-zinc-950/80 rounded-xl p-2.5 border border-zinc-800/80">
          <div className="flex flex-col gap-1">
            {heroSide.map(entry => (
              <HpBar key={entry.id} entry={entry} />
            ))}
          </div>
          <div className="w-full h-px bg-zinc-800/70" />
          <div className="flex flex-col gap-1">
            {enemySide.map(entry => (
              <HpBar key={entry.id} entry={entry} />
            ))}
          </div>
        </div>
      )}

      {/* 实时动作播报日志窗口：固定高度 + 滚动条（ticket 21 用户反馈 3） */}
      <div
        ref={logContainerRef}
        className="bg-zinc-950/80 rounded-xl p-2.5 flex flex-col gap-1 h-48 overflow-y-auto border border-zinc-800/80 font-mono text-[10px] leading-relaxed shadow-inner"
      >
        {visibleActions.length === 0 ? (
          <div className="text-zinc-600 text-center my-auto py-4 text-[9px] font-sans italic flex items-center justify-center gap-1.5">
            <Swords className="w-3 h-3" />
            战斗准备中，即将开始第一回合...
          </div>
        ) : (
          visibleActions.map((a: BattleAction, idx: number) => (
            <div
              key={idx}
              className={`flex items-center justify-between p-1 rounded transition-colors ${
                idx === visibleActions.length - 1 ? 'bg-zinc-800/60 border-l-2 border-amber-400' : ''
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-zinc-600 font-bold shrink-0">R{a.round}</span>
                <span
                  className={`font-bold shrink-0 flex items-center gap-1 ${
                    a.actorSide === 'hero' ? 'text-cyan-400' : 'text-rose-400'
                  }`}
                >
                  {a.actorSide === 'hero' ? (
                    <GameIcon type="hero" id={a.actorId} className="w-3 h-3" />
                  ) : (
                    <GameIcon type="enemy" id={a.actorId} className="w-3 h-3" />
                  )}
                  {a.actorName}
                </span>

                {a.skillName ? (
                  <span className="text-purple-400 truncate">
                    发动【{a.skillName}】
                    {a.kind === 'skill' && a.actorName !== a.targetName && (
                      <>→ <span className="text-zinc-300">{a.targetName}</span></>
                    )}
                  </span>
                ) : (
                  <span className="text-zinc-400 truncate">
                    → <span className="text-zinc-300">{a.targetName}</span>
                  </span>
                )}
              </div>

              <span
                className={`font-bold shrink-0 ml-2 ${
                  a.kind === 'heal' ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {a.kind === 'heal' ? `+${a.damage}` : `-${a.damage}`}
              </span>
            </div>
          ))
        )}
      </div>

      {/* 播报完成/Skip 后的最终结算卡片 */}
      {isFinished && (
        <div
          className={`rounded-xl border p-3 flex flex-col gap-2.5 animate-in fade-in duration-200 ${
            victory
              ? 'bg-emerald-950/40 border-emerald-500/40'
              : wiped
              ? 'bg-red-950/40 border-red-500/40'
              : 'bg-zinc-900/80 border-zinc-700/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-black flex items-center gap-1.5 ${
                victory ? 'text-emerald-300' : wiped ? 'text-red-300' : 'text-zinc-300'
              }`}
            >
              {victory ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>战斗胜利！</span>
                </>
              ) : wiped ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span>战斗失败！</span>
                </>
              ) : (
                <>
                  <Swords className="w-4 h-4 text-zinc-400" />
                  <span>战斗平局（达到回合上限）</span>
                </>
              )}
            </span>

            {/* 胜利全员 100% 满血复活 Badge */}
            {victory && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-900/80 border border-emerald-400/50 text-[9px] font-black text-emerald-200 shadow-sm flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                战后恢复：全员 100% HP
              </span>
            )}
          </div>

          {/* 掉落与经验奖励 */}
          {victory && (
            <div className="flex flex-wrap gap-1.5 text-[9px] font-bold pt-1">
              {Object.entries(settlement.drops).map(([itemId, qty]) => (
                <span
                  key={itemId}
                  className="px-2 py-1 rounded-md border border-amber-500/40 bg-amber-950/50 text-amber-300 flex items-center gap-1"
                >
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

          {/* 战败重伤说明 */}
          {wiped && (
            <p className="text-[10px] text-red-300 font-bold leading-relaxed">
              小队全员重伤，需在英雄页或后勤中使用纳米修复剂治愈重伤。
            </p>
          )}

          {/* 平局说明 */}
          {!victory && !wiped && (
            <p className="text-[10px] text-zinc-400 font-bold leading-relaxed">
              鏖战至回合上限未分胜负，无战利品，亦无人重伤。
            </p>
          )}

          {/* 用户主动离开按钮（ticket 21 用户反馈 4：播完停留，由用户选择离开） */}
          {onExit && (
            <button
              onClick={onExit}
              className={`w-full py-2 rounded-xl text-[10px] font-black transition-all border cursor-pointer active:scale-98 ${
                victory
                  ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400/40 text-emerald-950'
                  : wiped
                  ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
                  : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
              }`}
            >
              {exitLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default CombatPlaybackView;
