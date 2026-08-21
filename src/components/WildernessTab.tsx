import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { addItemRewards, isWearableEquipment } from '../state/equipment';
import { RESCUE_LOCATION_NAMES } from '../data/rescueLocations';
import { REALITY_EVENTS } from '../data/realityEvents';
import type { RealityEvent, EventChoice } from '../data/realityEvents';
import { CATEGORY_WEIGHTS } from '../data/realityEvents';
import { RESCUE_EVENTS, RESCUE_LOCATION_MAP } from '../data/rescueEvents';
import { useToast } from './ToastSystem';
import SwipeCard from './SwipeCard';
import { Compass, ChevronRight, Swords, Map, Backpack, Radio, Timer, Flag, Handshake, Check, Lock, Square, Crown } from 'lucide-react';
import GameIcon from './GameIcon';
import wildernessCard from '../assets/wilderness_card.jpg';
import { ITEMS_CONFIG } from '../data/items';
import { GAME_CONSTANTS } from '../data/gameConstants';
import { ENEMY_CONFIGS } from '../data/enemies';
import { COMBAT_CONFIG } from '../data/combatConfig';
import { HEROES_CONFIG } from '../data/heroes';
import { SURVIVORS_CONFIG } from '../data/survivors';
import { createInitialHero } from '../data/initialState';
import { getMainlineRegions, getRegion, getLevel, getTestRegions } from '../data/regionSelectors';
import { isRegionUnlocked, isLevelUnlocked, isRegionCleared, getClearedLevels } from '../state/levelCombat';
import { advanceRegionProgress, completePendingMilestone, getPendingMilestone, canTriggerPendingMilestone, getRegionProgressPercent } from '../state/explorationProgress';
import { getActiveBonds } from '../state/bonds';
import { formatModifiers } from '../state/statSystem';
import type { GameState, CombatSettlement } from '../types/game';
import CombatEventLog from './CombatEventLog';

const WildernessTab: React.FC = () => {
  const { state, setState, addLog } = useGame();
  const { showToast } = useToast();
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [exploreSubTab, setExploreSubTab] = useState<'bag' | 'logs'>('bag');
  const [mode, setMode] = useState<'explore' | 'combat'>('explore');
  // 遭遇战结算：state 中 realityEncounterId 清空后仍需继续播放动画
  const [encounterSettlement, setEncounterSettlement] = useState<CombatSettlement | null>(null);
  const [encounterEventTitle, setEncounterEventTitle] = useState<string>('遭遇战');

  const exploration = state.exploration;
  const player = state.player;

  const currentEventId = exploration.realityEventId;
  const currentEvent = currentEventId
    ? (RESCUE_EVENTS[currentEventId] || REALITY_EVENTS[currentEventId] || null)
    : null;
  // 战斗遭遇事件无选项卡；仅非遭遇事件走 SwipeCard（choices 可空，见 realityEvents.ts）
  const currentChoices = currentEvent && !exploration.realityEncounterId ? currentEvent.choices : undefined;

  // 随机抽取一张事件卡牌，或者是救援目的地的特殊事件
  const drawEvent = () => {
    let selectedEvent: RealityEvent;
    // 救援任务到了第 5 步（steps === 4）
    if (exploration.realityLocationId && exploration.realitySteps >= 4) {
      const rescueEventId = RESCUE_LOCATION_MAP[exploration.realityLocationId];
      if (!rescueEventId) return;
      selectedEvent = RESCUE_EVENTS[rescueEventId];
      if (!selectedEvent) return;
    } else {
      // 正常抽随机事件：只在当前区域事件池内抽取
      const region = exploration.realityRegionId ? getRegion(exploration.realityRegionId) : undefined;
      const poolIds = region?.explorationEvents ?? Object.keys(REALITY_EVENTS);
      const events = poolIds
        .map(id => REALITY_EVENTS[id])
        .filter((event): event is RealityEvent => Boolean(event));
      if (events.length === 0) return;

      // 1. 根据分类大权重筛选事件类型
      const availableCategories = Array.from(new Set(events.map(e => e.type)));
      const totalCatWeight = availableCategories.reduce((sum, cat) => sum + (CATEGORY_WEIGHTS[cat] ?? 100), 0);

      let randomCatNum = Math.random() * totalCatWeight;
      let selectedCat = availableCategories[0];
      for (const cat of availableCategories) {
        const catWeight = CATEGORY_WEIGHTS[cat] ?? 100;
        if (randomCatNum < catWeight) {
          selectedCat = cat;
          break;
        }
        randomCatNum -= catWeight;
      }

      // 2. 筛选对应类别下的具体事件，根据具体事件权重进行二次筛选
      const catEvents = events.filter(e => e.type === selectedCat);
      const totalEventWeight = catEvents.reduce((sum, evt) => sum + (evt.weight ?? 100), 0);

      let randomEvtNum = Math.random() * totalEventWeight;
      selectedEvent = catEvents[0];
      for (const evt of catEvents) {
        const weight = evt.weight ?? 100;
        if (randomEvtNum < weight) {
          selectedEvent = evt;
          break;
        }
        randomEvtNum -= weight;
      }
    }

    setState(prev => ({
      ...prev,
      exploration: {
        ...prev.exploration,
        // 战斗遭遇事件：进入战斗场景而非选择卡
        realityEventId: selectedEvent.battle ? null : selectedEvent.id,
        realityEncounterId: selectedEvent.battle ? selectedEvent.id : null
      }
    }));
  };

  const handleStartExploration = (locationId: string | null, isRescue = false) => {
    const region = !isRescue && locationId ? getRegion(locationId) : undefined;
    if (!isRescue && region && region.explorationEvents.length === 0) {
      showToast('该区域暂无探索事件，无法开始探索。', 'error');
      return;
    }
    const foodCost = isRescue
      ? GAME_CONSTANTS.EXPLORATION_RESCUE_FOOD_COST
      : (region?.initialCost?.food ?? GAME_CONSTANTS.EXPLORATION_BASE_FOOD_COST);
    const energyCost = isRescue
      ? GAME_CONSTANTS.EXPLORATION_RESCUE_ENERGY_COST
      : (region?.initialCost?.energy ?? GAME_CONSTANTS.EXPLORATION_BASE_ENERGY_COST);

    if (player.food < foodCost || player.energy < energyCost) {
      showToast(`生存指标过低（饱食度需 >= ${foodCost}，魔能需 >= ${energyCost}），请先补充！`, "error");
      return;
    }

    setState(prev => ({
      ...prev,
      player: {
        ...prev.player,
        food: Math.max(0, prev.player.food - foodCost),
        energy: Math.max(0, prev.player.energy - energyCost)
      },
      exploration: {
        ...prev.exploration,
        inRealityExploration: true,
        realitySteps: 0,
        realityLocationId: isRescue ? locationId : null,
        realityRegionId: isRescue ? null : locationId,
        realityBag: {},
        realityEventId: null,
        realityEncounterId: null
      }
    }));

    const text = isRescue ? `你全副武装前往目标救援点，防护服发出嗡嗡低鸣...` : `你打开防化避难门，踏入了风沙肆虐的现实废土。`;
    setLogMessages([text]);
    addLog(text, 'event');
  };

  useEffect(() => {
    // 有战斗遭遇待处理时不抽卡
    if (exploration.inRealityExploration && !exploration.realityEventId && !exploration.realityEncounterId) {
      drawEvent();
    }
  }, [exploration.inRealityExploration, exploration.realityEventId, exploration.realityEncounterId, exploration.realityRegionId]);

  const handleMakeChoice = (choice: EventChoice) => {
    // 检查前提条件
    if (choice.requirements) {
      let reqsMet = true;
      Object.entries(choice.requirements).forEach(([item, qty]) => {
        if ((state.inventory[item] || 0) < qty) {
          reqsMet = false;
        }
      });
      if (!reqsMet) {
        showToast("您的避难所库存不足该选项的所需物资！", "error");
        return;
      }
    }

    let adjustedStats = choice.results.stats ? { ...choice.results.stats } : undefined;

    // 检查属性是否足够 (饱食度和魔能)
    if (adjustedStats) {
      if (adjustedStats.food !== undefined && adjustedStats.food < 0) {
        const foodCost = Math.abs(adjustedStats.food);
        if (player.food < foodCost) {
          showToast(`您的饱食度不足（需要 ${foodCost}）！`, "error");
          return;
        }
      }
      if (adjustedStats.energy !== undefined && adjustedStats.energy < 0) {
        const energyCost = Math.abs(adjustedStats.energy);
        if (player.energy < energyCost) {
          showToast(`您的魔能不足（需要 ${energyCost}）！`, "error");
          return;
        }
      }
    }

    // 应用选择结果
    let isRescueComplete = false;
    let rescuedName = '';

    setState(prev => {
      const newPlayer = { ...prev.player };
      const newInventory = { ...prev.inventory };
      let newEquipmentInventory = { ...prev.equipmentInventory };
      
      // 扣除 requirements 的物资（主要针对救援扣除 defensive_turret 或 ration）
      if (choice.requirements) {
        Object.entries(choice.requirements).forEach(([item, qty]) => {
          newInventory[item] = Math.max(0, (newInventory[item] || 0) - qty);
        });
      }

      // 1. 改变基础属性
      if (adjustedStats) {
        Object.entries(adjustedStats).forEach(([stat, val]) => {
          const key = stat as keyof typeof newPlayer;
          newPlayer[key] = Math.max(0, Math.min(100, (newPlayer[key] as number) + val));
        });
      }

      // 2. 将物品推入临时背包
      const newRealityBag = { ...prev.exploration.realityBag };
      if (choice.results.items) {
        Object.entries(choice.results.items).forEach(([item, qty]) => {
          const adjustedQty = qty;
          // 限制扣除数量，不能超过玩家在避难所库存和当前临时背包拥有的总和
          const currentTotal = (prev.inventory[item] || 0) + (prev.exploration.realityBag[item] || 0);
          const maxDeductible = -currentTotal;
          const finalQty = adjustedQty < 0 ? Math.max(maxDeductible, adjustedQty) : adjustedQty;
          newRealityBag[item] = (newRealityBag[item] || 0) + finalQty;
        });
      }

      // 3. 处理英雄成功救援（ADR-0013：救援成功即获得英雄，写入 heroes 并移除救援进度）
      const newHeroes = { ...prev.heroes };
      const newRescueProgress = { ...(prev.exploration.rescueProgress || {}) };
      if (currentEvent && currentEvent.id.startsWith("rescue_")) {
        const heroId = currentEvent.id.replace("rescue_", "");
        if (newRescueProgress[heroId]?.locationId) {
          newHeroes[heroId] = createInitialHero(heroId); // 正式加入避难所
          delete newRescueProgress[heroId];              // 移除救援进度条目
          isRescueComplete = true;
          rescuedName = HEROES_CONFIG[heroId]?.name || SURVIVORS_CONFIG.find(s => s.id === heroId)?.name || heroId;
        }
      }

      // 救援成功：结束探险并将临时背包并入避难所库存（战利品永不因失败丢失，ticket 14）
      if (isRescueComplete) {
        // 可穿戴装备实例化（ADR-0014 修订）
        Object.entries(newRealityBag).forEach(([item, qty]) => {
          if (qty > 0 && isWearableEquipment(item)) {
            newEquipmentInventory = addItemRewards(newInventory, newEquipmentInventory, { [item]: qty }).equipmentInventory;
          } else {
            newInventory[item] = Math.max(0, (newInventory[item] || 0) + qty);
          }
        });
        
        return {
          ...prev,
          player: newPlayer,
          inventory: newInventory,
          equipmentInventory: newEquipmentInventory,
          heroes: newHeroes,
          exploration: {
            ...prev.exploration,
            rescueProgress: newRescueProgress,
            inRealityExploration: false,
            realitySteps: 0,
            realityLocationId: null,
            realityBag: {},
            realityEventId: null
          }
        };
      }

      // 未完成救援：探索继续（无 HP 死亡惩罚，临时背囊永不清空）
      const regionId = prev.exploration.realityRegionId;
      let nextExploration: GameState['exploration'] = {
        ...prev.exploration,
        realitySteps: prev.exploration.realitySteps + 1,
        realityBag: newRealityBag,
        inRealityExploration: true,
        realityEventId: null,
        realityEncounterId: null
      };

      if (regionId) {
        // 选择型里程碑：本次事件即里程碑事件时，任意选择即完成待办
        if (getPendingMilestone(prev, regionId) === prev.exploration.realityEventId) {
          nextExploration = completePendingMilestone({ ...prev, exploration: nextExploration }, regionId).exploration;
        }
        // 推进区域进度（存在待办时自动暂停）
        const advanced = advanceRegionProgress({ ...prev, exploration: nextExploration }, regionId);
        nextExploration = advanced.exploration;
        // 满足触发条件时，把里程碑事件设为下一张卡（encounter 走战斗）
        const pending = getPendingMilestone(advanced, regionId);
        if (pending && canTriggerPendingMilestone(advanced, regionId)) {
          const milestoneEvent = REALITY_EVENTS[pending];
          if (milestoneEvent) {
            nextExploration = {
              ...nextExploration,
              realityEventId: milestoneEvent.battle ? null : milestoneEvent.id,
              realityEncounterId: milestoneEvent.battle ? milestoneEvent.id : null
            };
          }
        }
      }

      return {
        ...prev,
        player: newPlayer,
        inventory: newInventory,
        exploration: nextExploration
      };
    });

    setLogMessages(prev => [...prev, choice.results.logText]);
    addLog(choice.results.logText, 'event');

    if (isRescueComplete) {
      const congr = `营救成功！英雄【${rescuedName}】已安全护送回避难所！`;
      showToast(`成功营救英雄 ${rescuedName}！`, "success");
      addLog(congr, 'system');
    }
  };

  

  // 整理出所有待营救英雄（ADR-0013：rescueProgress 中坐标已锁定的目标）
  const rescueTargets = Object.entries(state.exploration.rescueProgress || {})
    .filter(([, p]) => !!p.locationId)
    .map(([heroId, p]) => ({ heroId, locationId: p.locationId as string }));

  return (
    <div className="w-full pb-20">
      {/* 遭遇战结算（探索状态清空后仍展示；事件流为战斗信息数据源） */}
      {encounterSettlement && (
        <div className="space-y-2">
          <CombatEventLog settlement={encounterSettlement} zoneName={encounterEventTitle} />
          <button
            onClick={() => setEncounterSettlement(null)}
            className="w-full py-2 rounded-xl text-[11px] font-black transition-all border border-zinc-700 bg-zinc-900/70 text-zinc-300 hover:text-zinc-100 cursor-pointer active:scale-98"
          >
            {encounterSettlement.battle.victory ? '继续探索' : '返回荒野'}
          </button>
        </div>
      )}
      {/* 探索 / 战斗 模式切换（探索中锁定，遭遇战播放期间也锁定） */}
      {!encounterSettlement && !exploration.inRealityExploration && (
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setMode('explore')}
            className={`flex-1 py-2 rounded-xl text-[11px] font-black transition-all border cursor-pointer ${
              mode === 'explore'
                ? 'bg-gradient-to-r from-cyan-700 to-blue-700 border-cyan-400/30 text-white shadow-lg shadow-cyan-950/30'
                : 'bg-zinc-900/70 border-zinc-800 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Map className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" />探索荒野
          </button>
          <button
            onClick={() => setMode('combat')}
            className={`flex-1 py-2 rounded-xl text-[11px] font-black transition-all border cursor-pointer ${
              mode === 'combat'
                ? 'bg-gradient-to-r from-rose-700 to-red-700 border-rose-400/30 text-white shadow-lg shadow-rose-950/30'
                : 'bg-zinc-900/70 border-zinc-800 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Swords className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" />战斗挂机
          </button>
        </div>
      )}
      {!encounterSettlement && (!exploration.inRealityExploration ? (
        mode === 'combat' ? (
          <CombatPanel />
        ) : (
        <div className="space-y-4">
          {/* 未在探索中：显示探索选项 */}
          <div className="flex flex-col items-center justify-center p-6 bg-zinc-900/40 border border-zinc-800 rounded-3xl text-center">
            <Compass className="w-16 h-16 text-cyan-400 mb-4 animate-bounce" />
            <h2 className="text-xl font-bold text-white mb-2">踏入废土荒野</h2>
            <p className="text-xs text-zinc-400 max-w-[280px] leading-relaxed mb-1">
              地表辐射凶狠、风沙蔽日。在此搜集金属废料、异能碎块和作物种子以支撑温室和工坊的运作。
            </p>
          </div>

          <h3 className="text-[10px] uppercase font-bold tracking-widest text-zinc-550 px-1">请选择探索目的地:</h3>
          
          {/* Destination options */}
          <div className="flex flex-col gap-3">
            {/* 常规探索：按区域选择 */}
            {getMainlineRegions()
              .filter(region => region.explorationEvents.length > 0)
              .map(region => (
                <div
                  key={region.id}
                  onClick={() => handleStartExploration(region.id, false)}
                  className="p-4 rounded-3xl bg-zinc-950/70 border border-cyan-500/20 hover:border-cyan-500/50 hover:bg-zinc-900/30 transition-all cursor-pointer flex justify-between items-center group"
                >
                  <div>
                    <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                      <Map className="w-3.5 h-3.5 text-cyan-400" />探索【{region.name}】
                    </h4>
                    <p className="text-[10px] text-zinc-500 mt-1 leading-normal">
                      {region.description}
                    </p>
                    <p className="text-[9px] text-cyan-400/80 mt-1 font-bold">
                      消耗：饱食 -{region.initialCost?.food ?? 10}，魔能 -{region.initialCost?.energy ?? 10}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-cyan-400 transition-colors" />
                </div>
              ))}

            {/* Rescue explorations */}
            {rescueTargets.map(target => {
              const loc = RESCUE_LOCATION_NAMES[target.locationId];
              const locationName = loc?.displayName || '未知废墟';
              const targetName = SURVIVORS_CONFIG.find(s => s.id === target.heroId)?.name || target.heroId;

              return (
                <div
                  key={target.heroId}
                  onClick={() => handleStartExploration(target.locationId, true)}
                  className="p-4 rounded-3xl bg-zinc-950/70 border border-amber-500/20 hover:border-amber-500/50 hover:bg-zinc-900/30 transition-all cursor-pointer flex justify-between items-center group animate-pulse"
                >
                  <div>
                    <h4 className="text-sm font-black text-amber-400 flex items-center gap-1.5">
                      救援任务：寻找 {targetName}
                    </h4>
                    <p className="text-[10px] text-zinc-500 mt-1 leading-normal">
                      目的地：{locationName}。深处极其凶险，需做好战斗准备！(饱食 -15, 魔能 -15)
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-amber-500 transition-colors" />
                </div>
              );
            })}
          </div>
        </div>
        )
      ) : (
        /* In exploration display */
        <div className="space-y-2.5 pt-0.5">
          {/* 区域探索进度（combat-level 05） */}
          {exploration.realityRegionId && (() => {
            const region = getRegion(exploration.realityRegionId!);
            const pct = getRegionProgressPercent(state, exploration.realityRegionId!);
            const pending = getPendingMilestone(state, exploration.realityRegionId!);
            return (
              <div className="rounded-2xl border border-cyan-500/20 bg-zinc-900/40 p-3 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-cyan-300">探索进度：{region?.name ?? '未知区域'} {pct}%</span>
                  {pending && <span className="text-[9px] font-bold text-amber-400">里程碑待办</span>}
                </div>
                <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden border border-zinc-900">
                  <div className="h-full bg-cyan-500 transition-all duration-300" style={{ width: pct + '%' }} />
                </div>
              </div>
            );
          })()}
          {/* 战斗遭遇面板 */}
          {exploration.realityEncounterId && (
            <EncounterPanel
              encounterId={exploration.realityEncounterId}
              onFight={(s, title) => {
                setEncounterEventTitle(title);
                setEncounterSettlement(s);
                if (s.battle.victory) showToast('遭遇战胜利！战利品与经验已入账。', 'success');
                else if (s.battle.partyWiped) showToast('遭遇战失败！探索终止，战利品已入库，小队全员重伤。', 'error');
                else showToast('遭遇战平局，未分胜负。', 'info');
              }}
            />
          )}

          {/* 遭遇卡牌 - 使用左右滑动交互组件 */}
          {currentEvent && currentChoices && (
            <div className="w-full pt-0">
              <SwipeCard
                title={currentEvent.title}
                description={currentEvent.description}
                imageSrc={wildernessCard}
                choiceA={currentChoices.A}
                choiceB={currentChoices.B}
                playerStats={state.player}
                playerInventory={state.inventory}
                eventType={currentEvent.type}
                onSwipeLeft={() => handleMakeChoice(currentChoices.A)}
                onSwipeRight={() => handleMakeChoice(currentChoices.B)}
              />
            </div>
          )}

          {/* 临时背包与日志合并 Tab 面板 */}
          <div className="p-3 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 flex flex-col gap-2">
            <div className="flex gap-2 border-b border-zinc-800/60 pb-1.5">
              <button
                onClick={() => setExploreSubTab('bag')}
                className={`text-[10px] font-black pb-0.5 border-b-2 transition-all cursor-pointer ${
                  exploreSubTab === 'bag' ? 'text-cyan-400 border-cyan-400' : 'text-zinc-500 border-transparent hover:text-zinc-400'
                }`}
              >
                <Backpack className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" />临时背囊 ({Object.keys(exploration.realityBag).length})
              </button>
              <button
                onClick={() => setExploreSubTab('logs')}
                className={`text-[10px] font-black pb-0.5 border-b-2 transition-all cursor-pointer ${
                  exploreSubTab === 'logs' ? 'text-cyan-400 border-cyan-400' : 'text-zinc-500 border-transparent hover:text-zinc-400'
                }`}
              >
                <Radio className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" />无线电日志
              </button>
            </div>
            <div className="min-h-[40px] flex flex-col justify-center">
              {exploreSubTab === 'bag' ? (
                Object.keys(exploration.realityBag).length === 0 ? (
                  <span className="text-[10px] text-zinc-600 italic text-left select-none">暂无战利品，请滑动或点击按钮进行搜刮</span>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-14 overflow-y-auto">
                    {Object.entries(exploration.realityBag).map(([item, qty]) => {
                      const label = ITEMS_CONFIG[item]?.name || item;
                      const isNegative = qty < 0;
                      return (
                        <span key={item} className={`px-1.5 py-0.5 rounded border text-[9px] font-bold select-none ${
                          isNegative 
                            ? 'bg-red-950/20 border-red-500/30 text-red-400' 
                            : 'bg-zinc-950 border-zinc-850 text-zinc-350'
                        }`}>
                          {label}x{qty}
                        </span>
                      );
                    })}
                  </div>
                )
              ) : (
                <div className="space-y-1 text-[9px] leading-relaxed max-h-14 overflow-y-auto">
                  {logMessages.slice(-3).map((msg, i) => (
                    <p key={i} className="text-zinc-500 border-l border-zinc-850 pl-1.5 text-left truncate select-none">
                      {msg}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// === 战斗遭遇场景（ticket 06）：探索中遭遇战斗事件，进入与自动战斗同一战斗场景 ===
const EncounterPanel: React.FC<{
  encounterId: string;
  onFight: (settlement: CombatSettlement, eventTitle: string) => void;
}> = ({ encounterId, onFight }) => {
  const { state, setState, resolveEncounterBattle, fleeEncounter } = useGame();
  const { showToast } = useToast();

  const milestoneRegionId = state.exploration.realityRegionId ?? null;
  const isMilestoneEncounter = !!milestoneRegionId && getPendingMilestone(state, milestoneRegionId) === encounterId;

  const event = REALITY_EVENTS[encounterId];
  if (!event?.battle) return null;
  const battleConfig = event.battle;

  const party = (state.party || []).filter(id => !!state.heroes[id]);
  const anyWounded = party.some(id => state.heroes[id].wounded);
  const stamina = Math.floor(state.stamina || 0);
  const staminaCost = COMBAT_CONFIG.encounterStaminaCost;
  const canFight = party.length > 0 && !anyWounded && stamina >= staminaCost;

  const handleStart = () => {
    const outcome = resolveEncounterBattle(encounterId);
    if (outcome.failure === 'no_stamina') { showToast(`体力不足（需要 ${staminaCost}），等待恢复或撤离。`, 'error'); return; }
    if (outcome.failure === 'no_party') { showToast('小队为空，请先在英雄页编队上阵！', 'warning'); return; }
    if (outcome.failure === 'wounded') { showToast('小队有重伤英雄，请先用纳米修复剂治愈！', 'error'); return; }
    // 战斗开始：将结算结果传给父组件，由父组件负责播放动画（避免 EncounterPanel 卸载时丢失状态）
    if (outcome.settlement) {
      // 战斗型里程碑：胜利完成待办
      if (outcome.settlement.battle.victory && isMilestoneEncounter && milestoneRegionId) {
        setState(prev => completePendingMilestone(prev, milestoneRegionId));
      }
      onFight(outcome.settlement, event.title);
    }
  };

  const handleFlee = () => {
    const ok = fleeEncounter();
    if (ok) showToast('已撤离遭遇，绕行继续探索。', 'info');
  };

  return (
    <div className="rounded-2xl border border-rose-500/30 bg-gradient-to-b from-rose-950/50 to-zinc-900/60 p-3 flex flex-col gap-2">
      <div className="text-xs font-black text-rose-300 flex items-center gap-1.5"><Swords className="w-3.5 h-3.5" /> 战斗遭遇 —— {event.title}</div>
      <p className="text-[9px] text-zinc-400 leading-relaxed">{event.description}</p>
      <div className="flex flex-wrap gap-1 text-[8px] font-bold text-zinc-500">
        <span className="px-1 py-0.5 rounded border border-zinc-800 bg-zinc-950/60">
          敌人：{battleConfig.enemies.map(id => ENEMY_CONFIGS[id]?.name || id).join('、')}
        </span>
        <span className="px-1 py-0.5 rounded border border-zinc-800 bg-zinc-950/60">
          掉落：{battleConfig.drops.flatMap(d => d.kind === 'weighted' ? d.pool.map(p => ITEMS_CONFIG[p.itemId]?.name || p.itemId) : [ITEMS_CONFIG[d.itemId]?.name || d.itemId]).join('、')}
        </span>
        <span className="px-1 py-0.5 rounded border border-zinc-800 bg-zinc-950/60">经验 ×{battleConfig.expReward}/英雄</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {party.length === 0 ? (
          <span className="text-[9px] text-zinc-500 font-bold">小队为空 —— 请先在英雄页编队上阵。</span>
        ) : (
          party.map(id => {
            const cfg = HEROES_CONFIG[id];
            const hero = state.heroes[id];
            if (!cfg || !hero) return null;
            return (
              <span key={id} className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${
                hero.wounded
                  ? 'border-red-500/40 bg-red-950/40 text-red-400'
                  : 'border-zinc-700 bg-zinc-950/60 text-zinc-300'
              }`}>
                <GameIcon type="hero" id={cfg.id} className="w-3.5 h-3.5 inline-block mr-0.5" />{cfg.name} Lv.{hero.level}
                {hero.wounded && '（重伤）'}
              </span>
            );
          })
        )}
      </div>
      {stamina < staminaCost && (
        <span className="text-[8px] text-zinc-500 font-bold">体力不足（{stamina}/{staminaCost}，每 {COMBAT_CONFIG.staminaRegenSeconds} 秒恢复 1 点）—— 可等待恢复或撤离。</span>
      )}
      <div className="flex gap-2">
        <button
          onClick={handleStart}
          disabled={!canFight}
          className={`flex-1 py-2 rounded-xl text-[11px] font-black transition-all border ${
            canFight
              ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 border-rose-400/30 text-white cursor-pointer active:scale-98'
              : 'bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed'
          }`}
        >
          <Swords className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" />迎战！（体力 -{staminaCost}）
        </button>
        {!isMilestoneEncounter && (
          <button
            onClick={handleFlee}
            className="px-3 py-2 rounded-xl text-[11px] font-black transition-all border border-zinc-700 bg-zinc-900/70 text-zinc-400 hover:text-zinc-200 cursor-pointer active:scale-98"
          >
            <Flag className="w-3 h-3 inline-block mr-1 -mt-0.5" />撤离
          </button>
        )}
      </div>
    </div>
  );
};

// === 战斗挂机面板（combat-level ticket 03）：区域 → 关卡 ===
const CombatPanel: React.FC = () => {
  const { state, startLevelCombat, startLevelIdle, stopLevelIdle } = useGame();
  const { showToast } = useToast();

  const stamina = Math.floor(state.stamina || 0);
  const maxStamina = state.maxStamina || COMBAT_CONFIG.maxStamina;
  const staminaPct = Math.min(100, Math.round((stamina / (maxStamina || 1)) * 100));
  const party = (state.party || []).filter(id => !!state.heroes[id]);
  const anyWounded = party.some(id => state.heroes[id].wounded);
  const settlement = state.combat?.lastSettlement || null;
  const clearedLevels = getClearedLevels(state);
  const activeBonds = getActiveBonds(state.party || []);
  const idle = state.combat?.idle || null;
  const idleRegionId = idle?.regionId ?? null;
  const idleLevelId = idle?.levelId ?? null;
  const idleRegion = idleRegionId ? getRegion(idleRegionId) : undefined;
  const idleLevel = idleRegionId && idleLevelId ? getLevel(idleRegionId, idleLevelId) : undefined;
  const [expandedRegionId, setExpandedRegionId] = useState<string | null>(() => getMainlineRegions()[0]?.id ?? null);

  const regions = [...getMainlineRegions(), ...getTestRegions()];

  const handleStart = (regionId: string, levelId: string) => {
    const outcome = startLevelCombat(regionId, levelId);
    if (outcome.failure === 'locked') showToast('关卡尚未解锁，先通关上一关卡或区域！', 'warning');
    else if (outcome.failure === 'no_stamina') showToast('体力不足，请等待体力随时间恢复后再战。', 'error');
    else if (outcome.failure === 'no_party') showToast('小队为空，请先在英雄页编队上阵！', 'warning');
    else if (outcome.failure === 'wounded') showToast('小队有重伤英雄，请先用纳米修复剂治愈！', 'error');
    else if (outcome.failure === 'unknown_level') showToast('未知战斗关卡。', 'error');
    else if (outcome.settlement) {
      if (outcome.settlement.battle.victory) showToast('战斗胜利！战利品已入账。', 'success');
      else if (outcome.settlement.battle.partyWiped) showToast('战斗失败，小队全员重伤，需纳米修复剂治愈！', 'error');
      else showToast('战斗平局，未分胜负。', 'info');
    }
  };

  const handleStartIdle = (regionId: string, levelId: string) => {
    const outcome = startLevelIdle(regionId, levelId);
    if (outcome.failure === 'locked') showToast('关卡尚未通关，无法开启挂机。', 'warning');
    else if (outcome.failure === 'no_stamina') showToast('体力不足，无法开启挂机（需 ≥ 一场战斗的体力）。', 'error');
    else if (outcome.failure === 'no_party') showToast('小队为空，请先在英雄页编队上阵！', 'warning');
    else if (outcome.failure === 'wounded') showToast('小队有重伤英雄，请先用纳米修复剂治愈！', 'error');
    else if (outcome.failure === 'already_idling') showToast('已在其他关卡挂机中，请先停止当前挂机。', 'warning');
    else if (outcome.failure === 'unknown_level') showToast('未知战斗关卡。', 'error');
    else if (outcome.ok) {
      showToast('挂机已开启：将自动持续战斗，体力耗尽自动停止。', 'success');
    }
  };

  const handleStopIdle = () => {
    if (stopLevelIdle()) {
      showToast('⏹ 挂机已停止，剩余体力保留。', 'info');
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-3 flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-zinc-200 flex items-center gap-1">
            <Swords className="w-3.5 h-3.5 text-rose-400" /> 战斗体力
          </span>
          <span className="text-[10px] font-bold text-emerald-400">{stamina}/{maxStamina}</span>
        </div>
        <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-900">
          <div
            className={'h-full transition-all duration-300 ' + (staminaPct < 20 ? 'bg-red-500' : 'bg-emerald-500')}
            style={{ width: staminaPct + '%' }}
          />
        </div>
        <span className="text-[8px] text-zinc-600 font-bold">每 {COMBAT_CONFIG.staminaRegenSeconds} 秒恢复 1 点，战斗消耗后随时间自动回满。</span>
      </div>

      {idleRegion && idleLevel && (
        <div className="bg-zinc-900/60 border border-amber-500/30 rounded-2xl p-3 flex items-center justify-between gap-2">
          <span className="text-[10px] font-black text-amber-300 flex items-center gap-1.5">
            <Timer className="w-3.5 h-3.5 text-amber-300" /> 挂机中：<GameIcon type="zone" id={idleRegion.id} className="w-3.5 h-3.5" />{idleRegion.name} · {idleLevel.name}
            {idle?.startTime && (
              <span className="text-[8px] font-bold text-amber-500/80">
                自 {new Date(idle.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 起
              </span>
            )}
            <span className="text-[8px] font-bold text-amber-500/80">在线自动持续战斗；体力耗尽后自动停止。</span>
          </span>
          <button
            onClick={handleStopIdle}
            className="shrink-0 px-2.5 py-1.5 rounded-xl text-[10px] font-black transition-all border border-amber-500/40 bg-amber-950/40 text-amber-300 hover:bg-amber-900/40 cursor-pointer active:scale-98"
          >
            <Square className="w-3 h-3 inline-block mr-1 -mt-0.5" />停止挂机
          </button>
        </div>
      )}

      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-3 flex flex-col gap-1.5">
        <span className="text-[10px] font-black text-zinc-200 flex items-center gap-1.5"><Swords className="w-3.5 h-3.5" /> 上阵小队（{party.length}/{COMBAT_CONFIG.partySize}）</span>
        {party.length === 0 ? (
          <span className="text-[9px] text-zinc-600 font-bold">小队为空 —— 请前往英雄页编队（至少上阵 1 名英雄）。</span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {party.map(id => {
              const cfg = HEROES_CONFIG[id];
              const hero = state.heroes[id];
              if (!cfg || !hero) return null;
              return (
                <span key={id} className={'text-[9px] font-bold px-1.5 py-0.5 rounded-md border ' + (hero.wounded ? 'border-red-500/40 bg-red-950/40 text-red-400' : 'border-zinc-700 bg-zinc-950/60 text-zinc-300')}>
                  <GameIcon type="hero" id={cfg.id} className="w-3.5 h-3.5 inline-block mr-0.5" />{cfg.name} Lv.{hero.level}
                  {hero.wounded && '（重伤）'}
                </span>
              );
            })}
            {anyWounded && (
              <span className="text-[8px] text-red-400 font-bold w-full">小队有重伤英雄，战斗被禁止，请先在英雄页治愈。</span>
            )}
          </div>
        )}
      </div>

      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-3 flex flex-col gap-1.5">
        <span className="text-[10px] font-black text-zinc-200 flex items-center gap-1.5"><Handshake className="w-3.5 h-3.5" /> 羁绊加成</span>
        {party.length === 0 ? (
          <span className="text-[9px] text-zinc-600 font-bold">上阵英雄后查看羁绊触发状态。</span>
        ) : activeBonds.length === 0 ? (
          <span className="text-[9px] text-zinc-600 font-bold">当前队伍未触发羁绊——凑齐特定英雄组合或同阵营英雄可激活加成。</span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {activeBonds.map(bond => (
              <span
                key={bond.id}
                title={bond.description}
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-emerald-500/40 bg-emerald-950/40 text-emerald-300"
              >
                <Handshake className="w-3 h-3 inline-block mr-1 -mt-0.5" />{bond.name}：{formatModifiers(bond.bonus)}
              </span>
            ))}
          </div>
        )}
      </div>

      {settlement && (
        <CombatEventLog
          key={'history-' + settlement.battle.rounds + '|' + settlement.battle.events.length + '|' + settlement.battle.outcome}
          settlement={settlement}
          zoneName={(() => {
            const rid = state.combat?.regionId ?? null;
            const lid = state.combat?.levelId ?? null;
            const r = rid ? getRegion(rid) : undefined;
            const l = rid && lid ? getLevel(rid, lid) : undefined;
            return r ? (l ? r.name + ' · ' + l.name : r.name) : '战斗区域';
          })()}
        />
      )}

      <h3 className="text-[10px] uppercase font-bold tracking-widest text-zinc-550 px-1">选择战斗区域与关卡（通关末关解锁下一区域）:</h3>
      <div className="flex flex-col gap-3">
        {regions.map(region => {
          const regionUnlocked = isRegionUnlocked(state, region.id);
          const regionCleared = isRegionCleared(state, region.id);
          return (
            <div
              key={region.id}
              className={'p-4 rounded-3xl border transition-all flex flex-col gap-2 ' + (!regionUnlocked ? 'bg-zinc-950/30 border-zinc-800/50 opacity-60' : 'bg-zinc-950/70 border-rose-500/20 hover:border-rose-500/50 hover:bg-zinc-900/30')}
            >
              <div
                className="flex items-start justify-between gap-2 cursor-pointer select-none"
                onClick={() => setExpandedRegionId(expandedRegionId === region.id ? null : region.id)}
              >
                <div>
                  <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                    <GameIcon type="zone" id={region.id} className="w-4 h-4" />{region.name}
                    <span className="text-[8px] font-bold px-1 py-0.5 rounded-md border border-zinc-700 bg-zinc-900 text-zinc-400">
                      推荐 Lv.{region.recommendedLevel}
                    </span>
                    {regionCleared && (
                      <span className="text-[8px] font-bold px-1 py-0.5 rounded-md border border-emerald-500/40 bg-emerald-950/40 text-emerald-400">
                        <Check className="w-2.5 h-2.5 inline-block mr-0.5 -mt-0.5" />已通关
                      </span>
                    )}
                    {!regionUnlocked && (
                      <span className="text-[8px] font-bold px-1 py-0.5 rounded-md border border-zinc-700 bg-zinc-900 text-zinc-500">
                        <Lock className="w-2.5 h-2.5 inline-block mr-0.5 -mt-0.5" />未解锁
                      </span>
                    )}
                  </h4>
                  <p className="text-[10px] text-zinc-500 mt-1 leading-normal">{region.description}</p>
                </div>
              </div>

              {expandedRegionId === region.id && (
              <div className="flex flex-col gap-1.5">
                {region.levels.map(level => {
                  const unlocked = isLevelUnlocked(state, region.id, level.id);
                  const cleared = (clearedLevels[region.id] ?? []).includes(level.id);
                  const insufficient = !unlocked || stamina < level.staminaCost || party.length === 0 || anyWounded;
                  const idleActiveHere = idleRegionId === region.id && idleLevelId === level.id;
                  const idlingElsewhere = !!idleRegionId && !idleActiveHere;
                  const idleDisabled = !cleared || party.length === 0 || anyWounded || stamina < level.staminaCost || idlingElsewhere;
                  const isBossLevel = region.levels[region.levels.length - 1].id === level.id;
                  return (
                    <div
                      key={level.id}
                      className={'rounded-xl border p-2 flex items-center justify-between gap-2 ' + (!unlocked ? 'border-zinc-800/60 bg-zinc-950/40' : isBossLevel ? 'border-purple-500/25 bg-purple-950/25' : 'border-zinc-800/70 bg-zinc-950/50')}
                    >
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-[9px] font-black text-zinc-200 truncate">
                          {isBossLevel && <Crown className="w-3 h-3 inline-block mr-0.5 -mt-0.5 text-amber-300" />}
                          {level.name}
                          {cleared && <Check className="w-3 h-3 inline-block ml-1 -mt-0.5 text-emerald-400" />}
                          {!unlocked && <Lock className="w-3 h-3 inline-block ml-1 -mt-0.5 text-zinc-500" />}
                        </span>
                        <span className="text-[8px] text-zinc-500 font-bold truncate">
                          敌人：{level.enemies.map(id => ENEMY_CONFIGS[id]?.name || id).join('、')}
                        </span>
                        <span className="text-[8px] text-zinc-600 font-bold truncate">
                          掉落：{level.drops.flatMap(d => d.kind === 'weighted' ? d.pool.map(p => ITEMS_CONFIG[p.itemId]?.name || p.itemId) : [ITEMS_CONFIG[d.itemId]?.name || d.itemId]).join('、') || '—'}
                          {level.firstClearDrops && ' · 首通额外'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <button
                          disabled={insufficient || idleActiveHere}
                          onClick={() => handleStart(region.id, level.id)}
                          className={'shrink-0 px-2.5 py-1.5 rounded-xl text-[10px] font-black transition-all border ' + (insufficient || idleActiveHere ? 'bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed' : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 border-rose-400/30 text-white cursor-pointer')}
                        >
                          {idleActiveHere ? '挂机中…' : '开战（体力 -' + level.staminaCost + '）'}
                        </button>
                        <button
                          disabled={!idleActiveHere && idleDisabled}
                          onClick={() => (idleActiveHere ? handleStopIdle() : handleStartIdle(region.id, level.id))}
                          className={'shrink-0 px-2.5 py-1.5 rounded-xl text-[10px] font-black transition-all border ' + (idleActiveHere ? 'border-amber-500/40 bg-amber-950/40 text-amber-300 hover:bg-amber-900/40 cursor-pointer active:scale-98' : idleDisabled ? 'bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed' : 'bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 border-amber-400/30 text-white cursor-pointer active:scale-98')}
                        >
                          {idleActiveHere ? '停止挂机' : '开始挂机'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WildernessTab;
