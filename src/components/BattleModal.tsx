import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../context/GameContext';
import type { LevelConfig } from '../data/regions';
import type { CombatSettlement } from '../types/game';
import { getRegion } from '../data/regionSelectors';
import { ENEMY_CONFIGS } from '../data/enemies';
import { HEROES_CONFIG } from '../data/heroes';
import { ITEMS_CONFIG } from '../data/items';
import { formatBattleEvent } from '../state/battleEventPresentation';
import { COMBAT_CONFIG } from '../data/combatConfig';

export interface BattleModalProps {
  isOpen: boolean;
  regionId?: string | null;
  levelId?: string | null;
  level: LevelConfig | null;
  settlement: CombatSettlement | null;
  isEncounter?: boolean;
  encounterTitle?: string;
  onClose: () => void;
  onForfeit?: () => void;
}

export interface UnitSlotState {
  id: string;
  name: string;
  isBoss: boolean;
  isSummon: boolean;
  maxHp: number;
  currentHp: number;
  maxMp: number;
  currentMp: number;
  isHit: boolean;
}

interface FloatingDamage {
  id: number;
  unitId: string;
  text: string;
  isCrit: boolean;
  isHeal: boolean;
}

export const BattleModal: React.FC<BattleModalProps> = ({
  isOpen,
  regionId,
  level,
  settlement,
  isEncounter = false,
  encounterTitle,
  onClose,
  onForfeit
}) => {
  const { state, setState } = useGame();

  const [speed, setSpeed] = useState<1 | 2>(1);
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [eventLogs, setEventLogs] = useState<string[]>([]);
  const [heroSlots, setHeroSlots] = useState<(UnitSlotState | null)[]>([null, null, null, null, null, null]);
  const [enemySlots, setEnemySlots] = useState<(UnitSlotState | null)[]>([null, null, null, null, null, null]);
  const [floatingDamages, setFloatingDamages] = useState<FloatingDamage[]>([]);
  const [showSettlement, setShowSettlement] = useState<boolean>(false);
  const [isForfeited, setIsForfeited] = useState<boolean>(false);
  const [showForfeitConfirm, setShowForfeitConfirm] = useState<boolean>(false);

  const eventIndexRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logContainerRef = useRef<HTMLDivElement | null>(null);
  const nextFloatIdRef = useRef<number>(1);

  const region = regionId ? getRegion(regionId) : null;
  const maxRounds = COMBAT_CONFIG.maxBattleRounds || 30;

  const stateRef = useRef(state);
  stateRef.current = state;

  // Initialize battle units when modal opens
  useEffect(() => {
    if (!isOpen || !level || !settlement) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    eventIndexRef.current = 0;
    setCurrentRound(1);
    setEventLogs([]);
    setShowSettlement(false);
    setIsForfeited(false);
    setShowForfeitConfirm(false);
    setFloatingDamages([]);

    const currentState = stateRef.current;
    // Initialize Hero slots (up to 6)
    const initialHeroSlots: (UnitSlotState | null)[] = [null, null, null, null, null, null];
    const party = (currentState.party || []).filter((id) => !!currentState.heroes[id]);
    party.forEach((heroId, index) => {
      if (index < 6) {
        const config = HEROES_CONFIG[heroId];
        const heroState = currentState.heroes[heroId];
        const maxHp = heroState?.maxHp || config?.baseAttributes.maxHp || 100;
        initialHeroSlots[index] = {
          id: heroId,
          name: config?.name || heroId,
          isBoss: false,
          isSummon: false,
          maxHp,
          currentHp: maxHp,
          maxMp: 100,
          currentMp: 30,
          isHit: false
        };
      }
    });
    setHeroSlots(initialHeroSlots);

    // Initialize Enemy slots (up to 6)
    const initialEnemySlots: (UnitSlotState | null)[] = [null, null, null, null, null, null];
    level.enemies.forEach((enemyId, index) => {
      if (index < 6) {
        const cfg = ENEMY_CONFIGS[enemyId];
        const isBoss = cfg?.role === 'boss';
        const maxHp = cfg?.baseAttributes.maxHp || (isBoss ? 200 : 80);
        initialEnemySlots[index] = {
          id: `${enemyId}_${index}`,
          name: cfg?.name || enemyId,
          isBoss,
          isSummon: false,
          maxHp,
          currentHp: maxHp,
          maxMp: 60,
          currentMp: 0,
          isHit: false
        };
      }
    });
    setEnemySlots(initialEnemySlots);
  }, [isOpen, level, settlement]);

  // Play next battle event
  useEffect(() => {
    if (!isOpen || !settlement || showSettlement || showForfeitConfirm) return;

    const events = settlement.battle.events || [];

    const playStep = () => {
      if (eventIndexRef.current >= events.length) {
        setShowSettlement(true);
        return;
      }

      const evt = events[eventIndexRef.current];
      eventIndexRef.current++;

      if (evt.round) {
        setCurrentRound(evt.round);
      }

      // Format log text
      const logText = formatBattleEvent(evt);
      setEventLogs((prev) => [...prev, logText]);

      // Handle summon event
      if (evt.key === 'summon' && evt.unitId) {
        const isHeroSummon = !evt.unitId.startsWith('e_') && !evt.unitId.startsWith('enemy_');
        const summonUnit: UnitSlotState = {
          id: evt.unitId,
          name: evt.unitName || evt.unitId,
          isBoss: false,
          isSummon: true,
          maxHp: 150,
          currentHp: 150,
          maxMp: 50,
          currentMp: 0,
          isHit: false
        };

        if (isHeroSummon) {
          setHeroSlots((prev) => {
            const next = [...prev];
            const emptyIdx = next.findIndex((s) => s === null);
            if (emptyIdx !== -1) next[emptyIdx] = summonUnit;
            return next;
          });
        } else {
          setEnemySlots((prev) => {
            const next = [...prev];
            const emptyIdx = next.findIndex((s) => s === null);
            if (emptyIdx !== -1) next[emptyIdx] = summonUnit;
            return next;
          });
        }
      }

      // Handle damage / attack
      if (evt.key === 'damageTaken' || evt.key === 'attackAfter' || (evt.key === 'effectApplied' && (evt.data as any)?.kind === 'damage')) {
        const targetId = evt.targetId || evt.unitId;
        const damage = Number(evt.data?.damage ?? evt.data?.amount ?? (evt.data as any)?.values?.damage ?? 0);
        const isCrit = Boolean(evt.data?.isCrit);

        if (targetId && damage > 0) {
          // Check heroes
          setHeroSlots((prev) =>
            prev.map((slot) => {
              if (!slot || (slot.id !== targetId && slot.name !== targetId)) return slot;
              const nextHp = Math.max(0, slot.currentHp - damage);
              return { ...slot, currentHp: nextHp, isHit: true };
            })
          );
          // Check enemies
          setEnemySlots((prev) =>
            prev.map((slot) => {
              if (!slot || (slot.id !== targetId && slot.name !== targetId && !slot.id.startsWith(targetId))) return slot;
              const nextHp = Math.max(0, slot.currentHp - damage);
              return { ...slot, currentHp: nextHp, isHit: true };
            })
          );

          // Add floating damage text
          const floatId = nextFloatIdRef.current++;
          setFloatingDamages((prev) => [
            ...prev,
            { id: floatId, unitId: targetId, text: `-${damage}${isCrit ? '!' : ''}`, isCrit, isHeal: false }
          ]);
          setTimeout(() => {
            setFloatingDamages((prev) => prev.filter((f) => f.id !== floatId));
          }, 750);
        }
      }

      // Handle healing
      if (evt.key === 'healingTaken' || (evt.key === 'effectApplied' && (evt.data as any)?.kind === 'heal')) {
        const targetId = evt.targetId || evt.unitId;
        const heal = Number(evt.data?.amount ?? evt.data?.heal ?? (evt.data as any)?.values?.heal ?? 0);
        if (targetId && heal > 0) {
          setHeroSlots((prev) =>
            prev.map((slot) => {
              if (!slot || (slot.id !== targetId && slot.name !== targetId)) return slot;
              const nextHp = Math.min(slot.maxHp, slot.currentHp + heal);
              return { ...slot, currentHp: nextHp };
            })
          );

          const floatId = nextFloatIdRef.current++;
          setFloatingDamages((prev) => [
            ...prev,
            { id: floatId, unitId: targetId, text: `+${heal}`, isCrit: false, isHeal: true }
          ]);
          setTimeout(() => {
            setFloatingDamages((prev) => prev.filter((f) => f.id !== floatId));
          }, 750);
        }
      }

      // Handle death
      if (evt.key === 'death' && evt.unitId) {
        const deadId = evt.unitId;
        setHeroSlots((prev) =>
          prev.map((slot) => (slot && (slot.id === deadId || slot.name === deadId) ? { ...slot, currentHp: 0 } : slot))
        );
        setEnemySlots((prev) =>
          prev.map((slot) => (slot && (slot.id === deadId || slot.name === deadId || slot.id.startsWith(deadId)) ? { ...slot, currentHp: 0 } : slot))
        );
      }

      // Reset hit animation trigger
      setTimeout(() => {
        setHeroSlots((prev) => prev.map((s) => (s ? { ...s, isHit: false } : null)));
        setEnemySlots((prev) => prev.map((s) => (s ? { ...s, isHit: false } : null)));
      }, 250);

      const delay = speed === 2
        ? COMBAT_CONFIG.eventStreamIntervalMs.fast
        : COMBAT_CONFIG.eventStreamIntervalMs.normal;
      timerRef.current = setTimeout(playStep, delay);
    };

    const initialDelay = speed === 2
      ? Math.round(COMBAT_CONFIG.eventStreamIntervalMs.fast * 0.6)
      : Math.round(COMBAT_CONFIG.eventStreamIntervalMs.normal * 0.6);
    timerRef.current = setTimeout(playStep, initialDelay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isOpen, settlement, speed, showSettlement, showForfeitConfirm]);

  // Auto scroll logs to bottom
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [eventLogs]);

  if (!isOpen || !level || !settlement) return null;

  const isVictory = !isForfeited && settlement.battle.victory;
  const isDefeat = isForfeited || settlement.battle.partyWiped;

  const handleSkip = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const events = settlement.battle.events || [];
    eventIndexRef.current = events.length;
    setEventLogs(events.map(formatBattleEvent));

    if (settlement.battle.victory) {
      setEnemySlots((prev) => prev.map((s) => (s ? { ...s, currentHp: 0 } : null)));
    } else if (settlement.battle.partyWiped) {
      setHeroSlots((prev) => prev.map((s) => (s ? { ...s, currentHp: 0 } : null)));
    }
    setShowSettlement(true);
  };

  const handleConfirmForfeit = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setShowForfeitConfirm(false);
    setIsForfeited(true);

    // Apply defeat consequences to game state: party heroes wounded
    const party = state.party || [];
    const nextHeroes = { ...state.heroes };
    party.forEach((id) => {
      if (nextHeroes[id]) {
        nextHeroes[id] = { ...nextHeroes[id], hp: 0, wounded: true };
      }
    });

    setState((prev) => ({
      ...prev,
      heroes: nextHeroes,
      combat: {
        ...prev.combat,
        lastSettlement: {
          ...settlement,
          battle: {
            ...settlement.battle,
            victory: false,
            partyWiped: true,
            outcome: 'defeat'
          },
          drops: {},
          soulEchoes: 0,
          expPerHero: 0,
          woundedHeroIds: party
        }
      }
    }));

    setHeroSlots((prev) => prev.map((s) => (s ? { ...s, currentHp: 0 } : null)));
    if (onForfeit) onForfeit();
    setShowSettlement(true);
  };

  return createPortal(
    <div
      data-testid="dedicated-battle-modal"
      className="fixed inset-0 z-50 bg-zinc-950 flex flex-col max-w-md mx-auto h-full p-3.5 select-none overflow-hidden text-zinc-200"
    >
      <style>{`
        @keyframes damageFloat {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          40% { opacity: 1; transform: translateY(-16px) scale(1.15); }
          100% { opacity: 0; transform: translateY(-28px) scale(0.9); }
        }
        @keyframes hitShake {
          10%, 90% { transform: translate3d(-2px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-3px, 0, 0); }
          40%, 60% { transform: translate3d(3px, 0, 0); }
        }
        .damage-float {
          animation: damageFloat 0.75s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        .hit-shake {
          animation: hitShake 0.3s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
        }
      `}</style>

      {/* 顶部状态与控制栏（卡片容器封装） */}
      <header className="shrink-0 bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-2.5 mb-2 shadow-lg flex items-center justify-between">
        <div>
          <div className="text-sm font-black text-zinc-100 truncate max-w-[180px]">
            {isEncounter
              ? (encounterTitle || level?.name || '遭遇战')
              : `${region ? `${region.name} · ` : ''}${level?.name || '未知关卡'}`}
          </div>
          <div className="text-xs text-zinc-400 font-mono mt-0.5">
            轮次: <span className="text-amber-400 font-bold">第 {currentRound}/{maxRounds} 轮</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            data-testid="speed-toggle-btn"
            onClick={() => setSpeed(speed === 1 ? 2 : 1)}
            className={`h-8 px-3 text-xs font-mono font-bold rounded-xl cursor-pointer flex items-center justify-center transition-all ${
              speed === 2
                ? 'bg-amber-500/30 border border-amber-400 text-amber-300'
                : 'bg-zinc-800/90 hover:bg-zinc-700 border border-zinc-700 text-zinc-200'
            }`}
          >
            {speed}x
          </button>
          <button
            data-testid="skip-battle-btn"
            onClick={handleSkip}
            className="h-8 px-3 bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs font-bold rounded-xl hover:bg-amber-900/60 cursor-pointer flex items-center justify-center active:scale-95 transition-all"
          >
            跳过
          </button>
          {!isEncounter && (
            <button
              data-testid="exit-battle-btn"
              onClick={() => setShowForfeitConfirm(true)}
              className="h-8 px-3 bg-red-950/60 border border-red-500/40 text-red-400 text-xs font-bold rounded-xl hover:bg-red-900/60 cursor-pointer flex items-center justify-center active:scale-95 transition-all"
            >
              退出
            </button>
          )}
        </div>
      </header>

      {/* 中部战术对战板（左右各 6 竖向全宽固定卡槽，固定高度 310px，零高度跳变） */}
      <div className="shrink-0 h-[310px] bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-2.5 mb-2 relative shadow-xl overflow-hidden">
        <div className="grid grid-cols-2 gap-2.5 h-full">
          {/* 左侧 6 槽位：英雄方 */}
          <div className="grid grid-rows-6 gap-1.5 h-full">
            {heroSlots.map((unit, idx) => {
              if (!unit) {
                return (
                  <div
                    key={`hero-slot-empty-${idx}`}
                    className="h-full rounded-xl border border-dashed border-zinc-850/60 bg-zinc-950/20 flex items-center justify-center"
                  >
                    <span className="text-[9px] text-zinc-700/60 font-mono">槽位 {idx + 1}</span>
                  </div>
                );
              }

              const isDead = unit.currentHp <= 0;
              const displayHp = isDead ? 0 : unit.currentHp;
              const hpPct = Math.max(0, Math.round((displayHp / unit.maxHp) * 100));
              const mpPct = Math.max(0, Math.round((unit.currentMp / unit.maxMp) * 100));

              const floats = floatingDamages.filter((f) => f.unitId === unit.id || f.unitId === unit.name);

              return (
                <div
                  key={`hero-slot-${unit.id}-${idx}`}
                  data-testid={`battle-unit-${unit.id}`}
                  className={`h-full px-2.5 py-1 rounded-xl border relative shadow transition-all duration-200 flex flex-col justify-center ${
                    unit.isHit ? 'hit-shake ' : ''
                  }${
                    isDead
                      ? 'bg-zinc-950/40 border-zinc-900 opacity-40 grayscale'
                      : unit.isSummon
                        ? 'bg-cyan-950/40 border-cyan-500/50'
                        : 'bg-zinc-950/90 border-cyan-900/40'
                  }`}
                >
                  {/* Floating Damage Numbers */}
                  {floats.map((f) => (
                    <div
                      key={f.id}
                      className={`absolute -top-1.5 right-4 z-50 text-xs font-black damage-float ${
                        f.isHeal ? 'text-emerald-400 font-mono' : f.isCrit ? 'text-amber-400 font-mono' : 'text-red-400 font-mono'
                      }`}
                    >
                      {f.text}
                    </div>
                  ))}

                  <div className={`flex justify-between items-center text-xs font-black leading-tight ${isDead ? 'text-zinc-500' : 'text-zinc-100'}`}>
                    <span className="truncate">
                      {unit.name}
                      {unit.isSummon && <span className="text-[9px] text-cyan-400 font-bold ml-1">[召唤物]</span>}
                    </span>
                    <span className={`text-[10px] font-mono shrink-0 ${isDead ? 'text-zinc-500' : hpPct < 30 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {isDead ? `0/${unit.maxHp} [阵亡]` : `${displayHp}/${unit.maxHp}`}
                    </span>
                  </div>

                  <div className="space-y-0.5 mt-1">
                    <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-200"
                        style={{ width: `${hpPct}%` }}
                      />
                    </div>
                    <div className="w-full bg-zinc-900 h-0.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-500 transition-all duration-200"
                        style={{ width: `${mpPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 右侧 6 槽位：敌方 */}
          <div className="grid grid-rows-6 gap-1.5 h-full">
            {enemySlots.map((unit, idx) => {
              if (!unit) {
                return (
                  <div
                    key={`enemy-slot-empty-${idx}`}
                    className="h-full rounded-xl border border-dashed border-zinc-850/60 bg-zinc-950/20 flex items-center justify-center"
                  >
                    <span className="text-[9px] text-zinc-700/60 font-mono">槽位 {idx + 1}</span>
                  </div>
                );
              }

              const isDead = unit.currentHp <= 0;
              const displayHp = isDead ? 0 : unit.currentHp;
              const hpPct = Math.max(0, Math.round((displayHp / unit.maxHp) * 100));

              const floats = floatingDamages.filter((f) => f.unitId === unit.id || f.unitId === unit.name || f.unitId.startsWith(unit.id));

              return (
                <div
                  key={`enemy-slot-${unit.id}-${idx}`}
                  data-testid={`battle-unit-${unit.id}`}
                  className={`h-full px-2.5 py-1 rounded-xl border relative shadow transition-all duration-200 flex flex-col justify-center ${
                    unit.isHit ? 'hit-shake ' : ''
                  }${
                    isDead
                      ? 'bg-zinc-950/40 border-zinc-900 opacity-40 grayscale'
                      : unit.isBoss
                        ? 'bg-rose-950/40 border-rose-500/50'
                        : unit.isSummon
                          ? 'bg-cyan-950/30 border-cyan-500/40'
                          : 'bg-zinc-950/90 border-rose-950/40'
                  }`}
                >
                  {/* Floating Damage Numbers */}
                  {floats.map((f) => (
                    <div
                      key={f.id}
                      className={`absolute -top-1.5 right-4 z-50 text-xs font-black damage-float ${
                        f.isHeal ? 'text-emerald-400 font-mono' : f.isCrit ? 'text-amber-400 font-mono' : 'text-red-400 font-mono'
                      }`}
                    >
                      {f.text}
                    </div>
                  ))}

                  <div className={`flex justify-between items-center text-xs font-black leading-tight ${isDead ? 'text-zinc-500' : unit.isBoss ? 'text-rose-300' : 'text-zinc-100'}`}>
                    <span className="truncate">
                      {unit.name}
                      {unit.isBoss && <span className="text-[9px] text-rose-300 font-bold ml-1">[首领]</span>}
                      {unit.isSummon && <span className="text-[9px] text-cyan-400 font-bold ml-1">[召唤物]</span>}
                    </span>
                    <span className={`text-[10px] font-mono shrink-0 ${isDead ? 'text-zinc-500' : hpPct < 30 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {isDead ? `0/${unit.maxHp} [阵亡]` : `${displayHp}/${unit.maxHp}`}
                    </span>
                  </div>

                  <div className="space-y-0.5 mt-1">
                    <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-rose-500 to-red-500 transition-all duration-200"
                        style={{ width: `${hpPct}%` }}
                      />
                    </div>
                    <div className="w-full bg-zinc-900 h-0.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500/80 transition-all duration-200"
                        style={{ width: unit.isBoss ? '60%' : '20%' }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 下部：战况事件流播报区（纯净滚动，无多余标题栏） */}
      <div className="flex-1 min-h-0 bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-3 flex flex-col shadow-xl">
        <div
          ref={logContainerRef}
          data-testid="battle-event-log-container"
          className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1 text-xs leading-relaxed text-zinc-300"
        >
          {eventLogs.map((log, i) => (
            <div key={i} className="text-zinc-300 text-xs">
              {log}
            </div>
          ))}
        </div>
      </div>

      {/* 退出确认弹窗 */}
      {showForfeitConfirm && (
        <div
          data-testid="battle-forfeit-modal"
          className="fixed inset-0 bg-black/80 z-60 flex items-center justify-center p-4"
        >
          <div className="bg-zinc-900 border border-zinc-750 rounded-3xl w-[92%] max-w-[340px] p-5 text-center space-y-4 shadow-2xl">
            <div className="text-sm font-black text-red-400">确认退出战斗？</div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              退出将视为战斗失败，小队全员将进入重伤状态，是否确认退出？
            </p>
            <div className="flex gap-2 pt-1 border-t border-zinc-800">
              <button
                data-testid="battle-forfeit-confirm-btn"
                onClick={handleConfirmForfeit}
                className="flex-1 h-9.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-black rounded-xl shadow cursor-pointer flex items-center justify-center active:scale-98 transition-all"
              >
                确认
              </button>
              <button
                data-testid="battle-forfeit-cancel-btn"
                onClick={() => setShowForfeitConfirm(false)}
                className="flex-1 h-9.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl cursor-pointer flex items-center justify-center active:scale-98 transition-all"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 战斗结算弹窗 */}
      {showSettlement && (
        <div
          data-testid="battle-settlement-modal"
          className="fixed inset-0 bg-black/90 z-60 flex items-center justify-center p-4"
        >
          <div className="bg-zinc-900 border border-zinc-750 rounded-3xl p-5 w-full max-w-sm space-y-3.5 shadow-2xl text-center">
            <div>
              <div
                className={`text-base font-black ${
                  isVictory ? 'text-emerald-400' : isDefeat ? 'text-red-400' : 'text-amber-400'
                }`}
              >
                {isVictory ? '战斗胜利' : isDefeat ? '战斗失败' : '战斗平局'}
              </div>
              <div className="text-xs text-zinc-400 mt-1">
                {isVictory
                  ? isEncounter
                    ? '遭遇战胜利！战利品已存入探索临时背囊。'
                    : '成功消灭所有废土敌人，战利品已入账。'
                  : isDefeat
                    ? isEncounter
                      ? '小队全员重伤倒下，探索被迫终止。'
                      : '小队全员重伤倒下，需使用纳米修复剂治愈。'
                    : '双方鏖战至轮次上限，未分胜负。'}
              </div>
            </div>

            {/* 战利品与经验清单 */}
            {isVictory && (
              <div className="space-y-1.5 bg-zinc-950/80 p-3.5 rounded-2xl border border-zinc-800 text-left">
                <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                  获得战利品
                </div>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {Object.entries(settlement.drops || {}).map(([itemId, qty]) => {
                    const item = ITEMS_CONFIG[itemId];
                    return (
                      <span
                        key={itemId}
                        className="px-2.5 py-1 bg-amber-950/60 border border-amber-500/40 rounded-lg text-amber-300 font-bold"
                      >
                        {item?.name || itemId} ×{qty}
                      </span>
                    );
                  })}
                  {settlement.soulEchoes > 0 && (
                    <span className="px-2.5 py-1 bg-emerald-950/60 border border-emerald-500/40 rounded-lg text-emerald-300 font-bold">
                      灵魂残响 ×{settlement.soulEchoes}
                    </span>
                  )}
                  {settlement.expPerHero > 0 && (
                    <span className="px-2.5 py-1 bg-cyan-950/60 border border-cyan-500/40 rounded-lg text-cyan-300 font-bold">
                      经验 +{settlement.expPerHero}/英雄
                    </span>
                  )}
                </div>
              </div>
            )}

            <footer className="pt-2">
              <button
                data-testid="battle-settlement-confirm-btn"
                onClick={onClose}
                className="w-full h-9.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-black rounded-xl shadow cursor-pointer flex items-center justify-center active:scale-98 transition-all"
              >
                确认
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};

export default BattleModal;
