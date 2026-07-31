import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { EXPEDITION_LOCATIONS } from '../data/expeditionLocations';
import { REALITY_EVENTS } from '../data/realityEvents';
import type { RealityEvent, EventChoice } from '../data/realityEvents';
import { CATEGORY_WEIGHTS } from '../data/realityEvents';
import { RESCUE_EVENTS, RESCUE_LOCATION_MAP } from '../data/rescueEvents';
import { useToast } from './ToastSystem';
import SwipeCard from './SwipeCard';
import { Compass, ShieldAlert, ChevronRight, Swords } from 'lucide-react';
import wildernessCard from '../assets/wilderness_card.jpg';
import { ITEMS_CONFIG } from '../data/items';
import { GAME_CONSTANTS } from '../data/gameConstants';
import { COMBAT_ZONE_LIST, COMBAT_ZONES } from '../data/combatZones';
import { COMBAT_CONFIG } from '../data/combatConfig';
import { HEROES_CONFIG } from '../data/heroes';
import type { CombatSettlement } from '../types/game';

const WildernessTab: React.FC = () => {
  const { state, setState, addLog } = useGame();
  const { showToast } = useToast();
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [deathOccurred, setDeathOccurred] = useState(false);
  const [exploreSubTab, setExploreSubTab] = useState<'bag' | 'logs'>('bag');
  const [mode, setMode] = useState<'explore' | 'combat'>('explore');

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
        // 战斗遭遇事件：进入战斗场景而非选择卡
        realityEventId: selectedEvent.battle ? null : selectedEvent.id,
        realityEncounterId: selectedEvent.battle ? selectedEvent.id : null
      }
    }));
  };

  const handleStartExploration = (locationId: string | null) => {
    const isRescue = locationId !== null;
    const foodCost = isRescue ? GAME_CONSTANTS.EXPLORATION_RESCUE_FOOD_COST : GAME_CONSTANTS.EXPLORATION_BASE_FOOD_COST;
    const energyCost = isRescue ? GAME_CONSTANTS.EXPLORATION_RESCUE_ENERGY_COST : GAME_CONSTANTS.EXPLORATION_BASE_ENERGY_COST;

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
        realityEventId: null,
        realityEncounterId: null
      }
    }));

    const text = isRescue ? `你全副武装前往目标救援点，防护服发出嗡嗡低鸣...` : `你打开防化避难门，踏入了风沙肆虐的现实废土。`;
    setLogMessages([text]);
    addLog(text, 'event');
    setDeathOccurred(false);
  };

  useEffect(() => {
    // 有战斗遭遇待处理时不抽卡
    if (exploration.inRealityExploration && !exploration.realityEventId && !exploration.realityEncounterId) {
      drawEvent();
    }
  }, [exploration.inRealityExploration, exploration.realityEventId, exploration.realityEncounterId]);

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
        const congr = `🎉 营救成功！同伴【${rescuedName}】已安全护送回避难所！`;
        showToast(`成功营救同伴 ${rescuedName}！`, "success");
        addLog(congr, 'system');
      }
    }
  };

  

  // 整理出所有待营救同伴
  const rescueTargets = Object.values(state.survivors).filter(s => s.realityLocationId);

  return (
    <div className="w-full pb-20">
      {/* 探索 / 战斗 模式切换（探索中锁定） */}
      {!exploration.inRealityExploration && (
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setMode('explore')}
            className={`flex-1 py-2 rounded-xl text-[11px] font-black transition-all border cursor-pointer ${
              mode === 'explore'
                ? 'bg-gradient-to-r from-cyan-700 to-blue-700 border-cyan-400/30 text-white shadow-lg shadow-cyan-950/30'
                : 'bg-zinc-900/70 border-zinc-800 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            🗺️ 探索荒野
          </button>
          <button
            onClick={() => setMode('combat')}
            className={`flex-1 py-2 rounded-xl text-[11px] font-black transition-all border cursor-pointer ${
              mode === 'combat'
                ? 'bg-gradient-to-r from-rose-700 to-red-700 border-rose-400/30 text-white shadow-lg shadow-rose-950/30'
                : 'bg-zinc-900/70 border-zinc-800 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            ⚔️ 战斗挂机
          </button>
        </div>
      )}
      {!exploration.inRealityExploration ? (
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
        )
      ) : (
        /* In exploration display */
        <div className="space-y-2.5 pt-0.5">
          {/* 战斗遭遇场景（ticket 06：与自动战斗同一战斗场景） */}
          {exploration.realityEncounterId && (
            <EncounterPanel encounterId={exploration.realityEncounterId} />
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

// === 战斗遭遇场景（ticket 06）：探索中遭遇战斗事件，进入与自动战斗同一战斗场景 ===
const EncounterPanel: React.FC<{ encounterId: string }> = ({ encounterId }) => {
  const { state, resolveEncounterBattle, fleeEncounter } = useGame();
  const { showToast } = useToast();

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
    if (outcome.failure === 'no_stamina') showToast(`体力不足（需要 ${staminaCost}），等待恢复或撤离。`, 'error');
    else if (outcome.failure === 'no_party') showToast('小队为空，请先在英雄页编队上阵！', 'warning');
    else if (outcome.failure === 'wounded') showToast('小队有重伤英雄，请先用纳米修复剂治愈！', 'error');
    else if (outcome.settlement?.battle.victory) showToast('⚔️ 遭遇战胜利！继续探索。', 'success');
    else if (outcome.settlement?.battle.partyWiped) showToast('💥 遭遇战失败！探索终止，战利品已入库，小队全员重伤。', 'error');
    else if (outcome.settlement) showToast('⚔️ 遭遇战平局，继续探索。', 'info');
  };

  const handleFlee = () => {
    const ok = fleeEncounter();
    if (ok) showToast('🏃 已撤离遭遇，绕行继续探索。', 'info');
  };

  return (
    <div className="rounded-2xl border border-rose-500/30 bg-gradient-to-b from-rose-950/50 to-zinc-900/60 p-3 flex flex-col gap-2">
      <div className="text-xs font-black text-rose-300">⚔️ 战斗遭遇 —— {event.title}</div>
      <p className="text-[9px] text-zinc-400 leading-relaxed">{event.description}</p>
      <div className="flex flex-wrap gap-1 text-[8px] font-bold text-zinc-500">
        <span className="px-1 py-0.5 rounded border border-zinc-800 bg-zinc-950/60">
          敌人：{battleConfig.enemies.map(e => `${e.emoji}${e.name}`).join('、')}
        </span>
        <span className="px-1 py-0.5 rounded border border-zinc-800 bg-zinc-950/60">
          掉落：{battleConfig.drops.map(d => `${ITEMS_CONFIG[d.itemId]?.emoji || ''}${ITEMS_CONFIG[d.itemId]?.name || d.itemId}`).join('、')}
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
                {cfg.emoji} {cfg.name} Lv.{hero.level}
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
          ⚔️ 迎战！（体力 -{staminaCost}）
        </button>
        <button
          onClick={handleFlee}
          className="px-3 py-2 rounded-xl text-[11px] font-black transition-all border border-zinc-700 bg-zinc-900/70 text-zinc-400 hover:text-zinc-200 cursor-pointer active:scale-98"
        >
          🚩 撤离
        </button>
      </div>
    </div>
  );
};

// === 战斗挂机面板（ticket 05）：选区 → 三人小队轮询回合制自动战斗 ===
const CombatPanel: React.FC = () => {
  const { state, startCombat } = useGame();
  const { showToast } = useToast();

  const stamina = Math.floor(state.stamina || 0);
  const maxStamina = state.maxStamina || COMBAT_CONFIG.maxStamina;
  const staminaPct = Math.min(100, Math.round((stamina / (maxStamina || 1)) * 100));
  const party = (state.party || []).filter(id => !!state.heroes[id]);
  const anyWounded = party.some(id => state.heroes[id].wounded);
  const settlement = state.combat?.lastSettlement || null;

  const handleStart = (zoneId: string) => {
    const outcome = startCombat(zoneId);
    if (outcome.failure === 'no_stamina') showToast('体力不足，请等待体力随时间恢复后再战。', 'error');
    else if (outcome.failure === 'no_party') showToast('小队为空，请先在英雄页编队上阵！', 'warning');
    else if (outcome.failure === 'wounded') showToast('小队有重伤英雄，请先用纳米修复剂治愈！', 'error');
    else if (outcome.failure === 'unknown_zone') showToast('未知战斗区域。', 'error');
    else if (outcome.settlement?.battle.victory) showToast('⚔️ 战斗胜利！战利品与经验已入账。', 'success');
    else if (outcome.settlement) showToast('💥 战斗失败，小队全员重伤，需纳米修复剂治愈！', 'error');
  };

  const renderSettlement = (s: CombatSettlement) => {
    const victory = s.battle.victory;
    const recentActions = s.battle.actions.slice(-6);
    return (
      <div className={`rounded-2xl border p-3 flex flex-col gap-2 ${
        victory ? 'bg-emerald-950/40 border-emerald-500/30' : 'bg-red-950/40 border-red-500/30'
      }`}>
        <div className={`text-xs font-black ${victory ? 'text-emerald-300' : 'text-red-300'}`}>
          {victory ? '✅ 战斗胜利' : '💥 战斗失败'} —— {COMBAT_ZONES[state.combat?.zoneId || '']?.name || REALITY_EVENTS[state.combat?.zoneId || '']?.title || '未知区域'}（{s.battle.rounds} 回合）
        </div>
        {victory ? (
          <div className="flex flex-wrap gap-1.5 text-[9px] font-bold">
            {Object.entries(s.drops).map(([itemId, qty]) => (
              <span key={itemId} className="px-1.5 py-0.5 rounded-md border border-amber-500/40 bg-amber-950/40 text-amber-300">
                {ITEMS_CONFIG[itemId]?.emoji} {ITEMS_CONFIG[itemId]?.name || itemId} ×{qty}
              </span>
            ))}
            {s.soulEchoes > 0 && (
              <span className="px-1.5 py-0.5 rounded-md border border-purple-500/40 bg-purple-950/40 text-purple-300">
                🔮 灵魂残响 ×{s.soulEchoes}
              </span>
            )}
            <span className="px-1.5 py-0.5 rounded-md border border-cyan-500/40 bg-cyan-950/40 text-cyan-300">
              ✦ 经验 ×{s.expPerHero} / 英雄
            </span>
          </div>
        ) : (
          <div className="text-[9px] text-red-300 font-bold">
            {s.woundedHeroIds.map(id => HEROES_CONFIG[id]?.name || id).join('、')} 进入重伤状态，
            需在英雄页使用纳米修复剂治愈。
          </div>
        )}
        {recentActions.length > 0 && (
          <div className="bg-zinc-950/60 rounded-xl p-2 flex flex-col gap-0.5 max-h-28 overflow-y-auto">
            {recentActions.map((a, i) => (
              <div key={i} className="text-[8px] text-zinc-400 font-mono leading-relaxed">
                <span className="text-zinc-600">R{a.round}</span>{' '}
                <span className={a.actorSide === 'hero' ? 'text-cyan-400' : 'text-rose-400'}>
                  {a.actorEmoji} {a.actorName}
                </span>{' '}
                → <span className="text-zinc-300">{a.targetName}</span>{' '}
                <span className="text-amber-400">-{a.damage}</span>
              </div>
            ))}
            {s.battle.actions.length > recentActions.length && (
              <div className="text-[8px] text-zinc-600 text-center font-bold">…… 共 {s.battle.actions.length} 次行动</div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* 体力条 */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-3 flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-zinc-200 flex items-center gap-1">
            <Swords className="w-3.5 h-3.5 text-rose-400" /> 战斗体力
          </span>
          <span className="text-[10px] font-bold text-emerald-400">{stamina}/{maxStamina}</span>
        </div>
        <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-900">
          <div
            className={`h-full transition-all duration-300 ${staminaPct < 20 ? 'bg-red-500' : 'bg-emerald-500'}`}
            style={{ width: `${staminaPct}%` }}
          />
        </div>
        <span className="text-[8px] text-zinc-600 font-bold">每 {COMBAT_CONFIG.staminaRegenSeconds} 秒恢复 1 点，战斗消耗后随时间自动回满。</span>
      </div>

      {/* 当前上阵小队 */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-3 flex flex-col gap-1.5">
        <span className="text-[10px] font-black text-zinc-200">⚔️ 上阵小队（{party.length}/{COMBAT_CONFIG.partySize}）</span>
        {party.length === 0 ? (
          <span className="text-[9px] text-zinc-600 font-bold">小队为空 —— 请前往英雄页编队（至少上阵 1 名英雄）。</span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {party.map(id => {
              const cfg = HEROES_CONFIG[id];
              const hero = state.heroes[id];
              if (!cfg || !hero) return null;
              return (
                <span key={id} className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border ${
                  hero.wounded
                    ? 'border-red-500/40 bg-red-950/40 text-red-400'
                    : `border-zinc-700 bg-zinc-950/60 text-zinc-300`
                }`}>
                  {cfg.emoji} {cfg.name} Lv.{hero.level}
                  {hero.wounded && '（重伤）'}
                </span>
              );
            })}
            {anyWounded && (
              <span className="text-[8px] text-red-400 font-bold w-full">⚠ 小队有重伤英雄，战斗被禁止，请先在英雄页治愈。</span>
            )}
          </div>
        )}
      </div>

      {/* 最近一次战斗结算 */}
      {settlement && renderSettlement(settlement)}

      {/* 战斗区域列表 */}
      <h3 className="text-[10px] uppercase font-bold tracking-widest text-zinc-550 px-1">选择战斗区域（自动轮询战斗）:</h3>
      <div className="flex flex-col gap-3">
        {COMBAT_ZONE_LIST.map(zone => {
          const insufficient = stamina < zone.staminaCost || party.length === 0 || anyWounded;
          return (
            <div
              key={zone.id}
              className={`p-4 rounded-3xl border transition-all flex flex-col gap-2 ${
                insufficient
                  ? 'bg-zinc-950/40 border-zinc-800/60 opacity-70'
                  : 'bg-zinc-950/70 border-rose-500/20 hover:border-rose-500/50 hover:bg-zinc-900/30 cursor-pointer active:scale-[0.99]'
              }`}
              onClick={() => !insufficient && handleStart(zone.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                    <span>{zone.emoji}</span> {zone.name}
                    <span className="text-[8px] font-bold px-1 py-0.5 rounded-md border border-zinc-700 bg-zinc-900 text-zinc-400">
                      推荐 Lv.{zone.recommendedLevel}
                    </span>
                  </h4>
                  <p className="text-[10px] text-zinc-500 mt-1 leading-normal">{zone.description}</p>
                </div>
                <button
                  disabled={insufficient}
                  className={`shrink-0 px-2.5 py-1.5 rounded-xl text-[10px] font-black transition-all border ${
                    insufficient
                      ? 'bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed'
                      : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 border-rose-400/30 text-white cursor-pointer'
                  }`}
                >
                  开战（体力 -{zone.staminaCost}）
                </button>
              </div>
              <div className="flex flex-wrap gap-1 text-[8px] font-bold text-zinc-500">
                <span className="px-1 py-0.5 rounded border border-zinc-800 bg-zinc-950/60">
                  敌人：{zone.enemies.map(e => `${e.emoji}${e.name}`).join('、')}
                </span>
                <span className="px-1 py-0.5 rounded border border-zinc-800 bg-zinc-950/60">
                  掉落：{zone.drops.map(d => `${ITEMS_CONFIG[d.itemId]?.emoji || ''}${ITEMS_CONFIG[d.itemId]?.name || d.itemId}`).join('、')} 🔮{zone.soulEchoMin}-{zone.soulEchoMax}
                </span>
                <span className="px-1 py-0.5 rounded border border-zinc-800 bg-zinc-950/60">经验 ×{zone.expReward}/英雄</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WildernessTab;
