import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { EXPEDITION_LOCATIONS } from '../data/expeditionLocations';
import { REALITY_EVENTS } from '../data/realityEvents';
import type { RealityEvent, EventChoice } from '../data/realityEvents';
import { CATEGORY_WEIGHTS } from '../data/realityEvents';
import { RESCUE_EVENTS, RESCUE_LOCATION_MAP } from '../data/rescueEvents';
import { useToast } from './ToastSystem';
import SwipeCard from './SwipeCard';
import { Compass, ShieldAlert, ChevronRight } from 'lucide-react';
import wildernessCard from '../assets/wilderness_card.jpg';
import { ITEMS_CONFIG } from '../data/items';
import { SURVIVORS_CONFIG } from '../data/survivors';
import { GAME_CONSTANTS } from '../data/gameConstants';

const WildernessTab: React.FC = () => {
  const { state, setState, addLog } = useGame();
  const { showToast } = useToast();
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [deathOccurred, setDeathOccurred] = useState(false);
  const [exploreSubTab, setExploreSubTab] = useState<'bag' | 'logs'>('bag');

  const exploration = state.exploration;
  const player = state.player;

  const currentEventId = exploration.realityEventId;
  const currentEvent = currentEventId
    ? (RESCUE_EVENTS[currentEventId] || REALITY_EVENTS[currentEventId] || null)
    : null;

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
      // 正常抽随机事件
      const keys = Object.keys(REALITY_EVENTS);
      const events = keys.map(key => REALITY_EVENTS[key]);
      
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
        realityEventId: selectedEvent.id
      }
    }));
  };

  const handleStartExploration = (locationId: string | null) => {
    const isRescue = locationId !== null;
    let foodCost = isRescue ? GAME_CONSTANTS.EXPLORATION_RESCUE_FOOD_COST : GAME_CONSTANTS.EXPLORATION_BASE_FOOD_COST;
    let energyCost = isRescue ? GAME_CONSTANTS.EXPLORATION_RESCUE_ENERGY_COST : GAME_CONSTANTS.EXPLORATION_BASE_ENERGY_COST;

    SURVIVORS_CONFIG.forEach(config => {
      config.passives.forEach(p => {
        if (p.type === 'exploration_cost') {
          const isRescued = !state.survivors[config.id]?.realityLocationId;
          if (state.survivors[config.id] && (p.condition !== 'rescued' || isRescued)) {
            if (p.target === 'energy') energyCost = Math.round(energyCost * (p.multiplier ?? 1));
            if (p.target === 'food') foodCost = Math.round(foodCost * (p.multiplier ?? 1));
          }
        }
      });
    });

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
        realityLocationId: locationId,
        realityBag: {},
        realityEventId: null
      }
    }));

    const text = isRescue ? `你全副武装前往目标救援点，防护服发出嗡嗡低鸣...` : `你打开防化避难门，踏入了风沙肆虐的现实废土。`;
    setLogMessages([text]);
    addLog(text, 'event');
    setDeathOccurred(false);
  };

  useEffect(() => {
    if (exploration.inRealityExploration && !exploration.realityEventId) {
      drawEvent();
    }
  }, [exploration.inRealityExploration, exploration.realityEventId]);

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
    const statCostPassives = SURVIVORS_CONFIG.flatMap(c =>
      c.passives.filter(p => p.type === 'stat_cost' && state.survivors[c.id])
    );
    if (adjustedStats && statCostPassives.length > 0) {
      const multi = statCostPassives.reduce((m, p) => m * (p.multiplier ?? 1), 1);
      if (adjustedStats.hp !== undefined && adjustedStats.hp < 0) {
        adjustedStats.hp = Math.round(adjustedStats.hp * multi);
      }
      if (adjustedStats.food !== undefined && adjustedStats.food < 0) {
        adjustedStats.food = Math.round(adjustedStats.food * multi);
      }
    }

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
          let adjustedQty = qty;
          SURVIVORS_CONFIG.forEach(config => {
            config.passives.forEach(p => {
              if (p.type === 'item_yield' && p.target === item && qty > 0) {
                const isRescued = !prev.survivors[config.id]?.realityLocationId;
                if (prev.survivors[config.id] && (p.condition !== 'rescued' || isRescued)) {
                  adjustedQty = Math.round(qty * (p.multiplier ?? 1));
                }
              }
            });
          });
          // 限制扣除数量，不能超过玩家在避难所库存和当前临时背包拥有的总和
          const currentTotal = (prev.inventory[item] || 0) + (prev.exploration.realityBag[item] || 0);
          const maxDeductible = -currentTotal;
          const finalQty = adjustedQty < 0 ? Math.max(maxDeductible, adjustedQty) : adjustedQty;
          newRealityBag[item] = (newRealityBag[item] || 0) + finalQty;
        });
      }

      // 3. 处理幸存者成功救援
      const newSurvivors = { ...prev.survivors };
      if (currentEvent && currentEvent.id.startsWith("rescue_")) {
        const survivorId = currentEvent.id.replace("rescue_", "");
        if (newSurvivors[survivorId]) {
          newSurvivors[survivorId] = {
            ...newSurvivors[survivorId],
            realityLocationId: undefined // 清除救援地点，代表营救完成！
          };
          isRescueComplete = true;
          rescuedName = newSurvivors[survivorId].name;
        }
      }

      const isDead = newPlayer.hp <= 0;

      // 如果救援成功，结束探险将临时背包合并
      if (isRescueComplete && !isDead) {
        Object.entries(newRealityBag).forEach(([item, qty]) => {
          newInventory[item] = Math.max(0, (newInventory[item] || 0) + qty);
        });
        
        return {
          ...prev,
          player: newPlayer,
          inventory: newInventory,
          survivors: newSurvivors,
          exploration: {
            ...prev.exploration,
            inRealityExploration: false,
            realitySteps: 0,
            realityLocationId: null,
            realityBag: {},
            realityEventId: null
          }
        };
      }

      return {
        ...prev,
        player: newPlayer,
        inventory: newInventory,
        exploration: {
          ...prev.exploration,
          realitySteps: prev.exploration.realitySteps + (isDead ? 0 : 1),
          realityBag: isDead ? {} : newRealityBag,
          inRealityExploration: !isDead,
          realityEventId: null
        }
      };
    });

    const nextHp = state.player.hp + (adjustedStats?.hp || 0);

    if (nextHp <= 0) {
      setDeathOccurred(true);
      const dieMsg = "🔴 警告：防化服严重破损！你重伤失去意识，避难所机械臂将你强行拖回。丢失了全部地表战利品...";
      setLogMessages(prev => [...prev, choice.results.logText, dieMsg]);
      addLog(dieMsg, 'combat');
    } else {
      setLogMessages(prev => [...prev, choice.results.logText]);
      addLog(choice.results.logText, 'event');

      if (isRescueComplete) {
        const congr = `🎉 营救成功！同伴【${rescuedName}】已安全护送回避难所！他已安顿，可在日志页面查看并为您提供强大的永久加成！`;
        showToast(`成功营救同伴 ${rescuedName}！`, "success");
        addLog(congr, 'system');
      }
    }
  };

  

  // 整理出所有待营救同伴
  const rescueTargets = Object.values(state.survivors).filter(s => s.realityLocationId);

  return (
    <div className="w-full pb-20">
      {!exploration.inRealityExploration ? (
        <div className="space-y-4">
          {/* 未在探索中：显示探索选项 */}
          <div className="flex flex-col items-center justify-center p-6 bg-zinc-900/40 border border-zinc-800 rounded-3xl text-center">
            <Compass className="w-16 h-16 text-cyan-400 mb-4 animate-bounce" />
            <h2 className="text-xl font-bold text-white mb-2">踏入废土荒野</h2>
            <p className="text-xs text-zinc-400 max-w-[280px] leading-relaxed mb-1">
              地表辐射凶狠、风沙蔽日。在此搜集金属废料、异能碎块和作物种子以支撑温室和工坊的运作。
            </p>

            {deathOccurred && (
              <div className="mt-3 p-3 bg-red-950/40 border border-red-500/20 text-xs text-red-400 rounded-2xl max-w-sm">
                <ShieldAlert className="w-5 h-5 text-red-400 mx-auto mb-1 animate-bounce" />
                你刚刚在探索中不幸重伤晕倒。建议先更换魔能过滤罐或使用物资补给生命值。
              </div>
            )}
          </div>

          <h3 className="text-[10px] uppercase font-bold tracking-widest text-zinc-550 px-1">请选择探索目的地:</h3>
          
          {/* Destination options */}
          <div className="flex flex-col gap-3">
            {/* Standard exploration */}
            <div
              onClick={() => handleStartExploration(null)}
              className="p-4 rounded-3xl bg-zinc-950/70 border border-cyan-500/20 hover:border-cyan-500/50 hover:bg-zinc-900/30 transition-all cursor-pointer flex justify-between items-center group"
            >
              <div>
                <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                  常规探索 (开始探索)
                </h4>
                <p className="text-[10px] text-zinc-500 mt-1 leading-normal">
                  搜寻基础种子、废金属，消耗小 (饱食 -10, 魔能 -10)
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-cyan-400 transition-colors" />
            </div>

            {/* Rescue explorations */}
            {rescueTargets.map(target => {
              const loc = EXPEDITION_LOCATIONS[target.realityLocationId || ''];
              const locationName = loc?.displayName || '未知废墟';

              return (
                <div
                  key={target.id}
                  onClick={() => handleStartExploration(target.realityLocationId || null)}
                  className="p-4 rounded-3xl bg-zinc-950/70 border border-amber-500/20 hover:border-amber-500/50 hover:bg-zinc-900/30 transition-all cursor-pointer flex justify-between items-center group animate-pulse"
                >
                  <div>
                    <h4 className="text-sm font-black text-amber-400 flex items-center gap-1.5">
                      救援任务：寻找 {target.name}
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
      ) : (
        /* In exploration display */
        <div className="space-y-2.5 pt-0.5">
          {/* 遭遇卡牌 - 使用左右滑动交互组件 */}
          {currentEvent && (
            <div className="w-full pt-0">
              <SwipeCard
                title={currentEvent.title}
                description={currentEvent.description}
                imageSrc={wildernessCard}
                choiceA={currentEvent.choices.A}
                choiceB={currentEvent.choices.B}
                playerStats={state.player}
                playerInventory={state.inventory}
                hasCatherine={!!(state.hasCatherine || state.survivors.catherine)}
                hasBuster={!!(state.survivors.buster && !state.survivors.buster.realityLocationId)}
                eventType={currentEvent.type}
                onSwipeLeft={() => handleMakeChoice(currentEvent.choices.A)}
                onSwipeRight={() => handleMakeChoice(currentEvent.choices.B)}
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
                🎒 临时背囊 ({Object.keys(exploration.realityBag).length})
              </button>
              <button
                onClick={() => setExploreSubTab('logs')}
                className={`text-[10px] font-black pb-0.5 border-b-2 transition-all cursor-pointer ${
                  exploreSubTab === 'logs' ? 'text-cyan-400 border-cyan-400' : 'text-zinc-500 border-transparent hover:text-zinc-400'
                }`}
              >
                📻 无线电日志
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
      )}
    </div>
  );
};

export default WildernessTab;
