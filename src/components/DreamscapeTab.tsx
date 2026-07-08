import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { EXPEDITION_LOCATIONS } from '../data/expeditionLocations';
import { DREAM_EVENTS } from '../data/dreamEvents';
import type { DreamChoice } from '../data/dreamEvents';
import { SURVIVORS_CONFIG } from '../data/survivors';
import { useToast } from './ToastSystem';
import SwipeCard from './SwipeCard';
import { Sparkles, Brain, AlertOctagon } from 'lucide-react';
import { ITEMS_CONFIG } from '../data/items';
import { NIGHTMARE_CONFIG } from '../data/nightmareConfig';

const DreamscapeTab: React.FC = () => {
  const { state, setState, addLog } = useGame();
  const { showToast } = useToast();
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [dreamSubTab, setDreamSubTab] = useState<'logs' | 'bag' | 'status'>('logs');

  const exploration = state.exploration;
  const player = state.player;

  const currentEventId = exploration.dreamEventId;
  const currentEvent = currentEventId ? DREAM_EVENTS[currentEventId] || null : null;

  const drawDreamEvent = () => {
    const keys = Object.keys(DREAM_EVENTS);
    const events = keys.map(key => DREAM_EVENTS[key]);
    
    // 1. 根据分类大权重筛选事件类型
    const CATEGORY_WEIGHTS: Record<string, number> = {
      common: 100,
      danger: 80,
      signal: 60,
      welfare: 40
    };
    
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
    let selectedEvent = catEvents[0];
    for (const evt of catEvents) {
      const weight = evt.weight ?? 100;
      if (randomEvtNum < weight) {
        selectedEvent = evt;
        break;
      }
      randomEvtNum -= weight;
    }
    
    setState(prev => ({
      ...prev,
      exploration: {
        ...prev.exploration,
        dreamEventId: selectedEvent.id
      }
    }));
  };

  const handleStartDream = () => {
    if (player.sanity < 15) {
      showToast("精神状态衰弱（理智需 >= 15），无法潜入梦境！", "error");
      return;
    }

    setState(prev => ({
      ...prev,
      player: {
        ...prev.player,
        sanity: Math.max(0, prev.player.sanity - 10)
      },
      exploration: {
        ...prev.exploration,
        inDreamExploration: true,
        dreamSteps: 0,
        dreamBag: {},
        dreamEventId: null
      }
    }));
    const text = "意识脱离肉体，缓缓坠入幽深的心灵海洋...";
    setLogMessages([text]);
    addLog(text, 'dream');
  };

  useEffect(() => {
    if (exploration.inDreamExploration && !exploration.dreamEventId) {
      drawDreamEvent();
    }
  }, [exploration.inDreamExploration, exploration.dreamEventId]);

  const handleMakeChoice = (choice: DreamChoice) => {
    let showSurvivorUnlockedAlert: { id: string; name: string; location: string } | null = null;

    setState(prev => {
      const newPlayer = { ...prev.player };
      const newExploration = { ...prev.exploration };
      
      // 1. 修改精神属性
      if (choice.results.stats?.sanity) {
        newPlayer.sanity = Math.max(0, Math.min(100, newPlayer.sanity + choice.results.stats.sanity));
      }
      
      // 2. 修改污染度
      if (choice.results.stats?.pollution) {
        newExploration.dreamPollution = Math.min(100, newExploration.dreamPollution + choice.results.stats.pollution);
      }

      // 3. 处理幸存者共鸣
      const newSurvivors = { ...prev.survivors };
      const newResonance = { ...newExploration.survivorResonance };
      
      if (choice.results.stats?.resonance && choice.results.targetSurvivorId) {
        const survivorId = choice.results.targetSurvivorId;
        const currentRes = (newResonance[survivorId] || 0) + choice.results.stats.resonance;
        newResonance[survivorId] = Math.min(100, currentRes);

        const config = SURVIVORS_CONFIG.find(s => s.id === survivorId);
        if (currentRes >= 100 && !prev.survivors[survivorId] && config) {
          showSurvivorUnlockedAlert = { id: survivorId, name: config.name, location: config.realityLocationId };
          // 锁定现实坐标
          newSurvivors[survivorId] = {
            id: survivorId,
            name: config.name,
            role: config.role,
            bonus: config.bonus,
            isAssigned: false,
            realityLocationId: config.realityLocationId
          };
        }
      }

      // 4. 收获梦境碎片
      const newDreamBag = { ...newExploration.dreamBag };
      if (choice.results.items) {
        Object.entries(choice.results.items).forEach(([item, qty]) => {
          newDreamBag[item] = (newDreamBag[item] || 0) + qty;
        });
      }

      // 5. 检查强制唤醒
      const isPollutionFull = newExploration.dreamPollution >= 100;
      const isSanityZero = newPlayer.sanity <= 0;
      const forceWakeUp = isPollutionFull || isSanityZero;

      return {
        ...prev,
        player: newPlayer,
        survivors: newSurvivors,
        activeAlert: isPollutionFull
          ? { type: "dream_leak", hp: NIGHTMARE_CONFIG.dreamLeakDamage }
          : prev.activeAlert,
        exploration: {
          ...newExploration,
          survivorResonance: newResonance,
          dreamSteps: forceWakeUp ? 0 : newExploration.dreamSteps + 1,
          dreamBag: forceWakeUp ? {} : newDreamBag,
          inDreamExploration: !forceWakeUp,
          dreamEventId: null
        }
      };
    });

    const nextSanity = state.player.sanity + (choice.results.stats?.sanity || 0);
    const nextPollution = state.exploration.dreamPollution + (choice.results.stats?.pollution || 0);

    if (nextSanity <= 0) {
      showToast("理智耗尽！你精神休克被迫断开心灵连结，碎片全部消散！", "error");
      addLog("理智崩溃，强制切断梦境连结。", "combat");
    } else if (nextPollution >= 100) {
      showToast("⚠️ 警告：污染度达100%！深渊扭曲，梦魇怪兽顺着精神印记入侵现实！", "error");
      addLog("梦境污染溢出，引动梦魇兽入侵避难所！", "combat");
    } else {
      setLogMessages(prev => [...prev, choice.results.logText]);
      addLog(choice.results.logText, 'dream');
      
      if (showSurvivorUnlockedAlert) {
        const { name, location } = showSurvivorUnlockedAlert;
        const loc = EXPEDITION_LOCATIONS[location];
        const locationName = loc?.shortName || loc?.displayName || location;
        const msg = `✨ 脑波连结成功！已完美锁定幸存同伴【${name}】的现实坐标：『${locationName}』，快返回现实探索营救！`;
        setLogMessages(prev => [...prev, msg]);
        addLog(msg, 'dream');
      }
    }
  };

  

  // 使用梦胶囊
  const handleUseCapsule = (capsuleType: 'sanity' | 'warp') => {
    const charge = state.exploration.capsulesCharge[capsuleType + '_capsule'] || 0;

    if (charge <= 0) {
      showToast("该梦胶囊无剩余充能！请先前往工坊制造进行充能。", "error");
      return;
    }

    setState(prev => {
      const newExploration = { ...prev.exploration };
      newExploration.capsulesCharge = {
        ...prev.exploration.capsulesCharge,
        [capsuleType + '_capsule']: charge - 1
      };

      const newPlayer = { ...prev.player };
      if (capsuleType === 'sanity') {
        newPlayer.sanity = Math.min(100, prev.player.sanity + 25);
      }

      return {
        ...prev,
        player: newPlayer,
        exploration: newExploration
      };
    });

    if (capsuleType === 'sanity') {
      const msg = "💊 服用了『稳定胶囊』，精神状态好转了点 (理智+25)";
      setLogMessages(prev => [...prev, msg]);
      showToast("使用稳定胶囊成功 (理智 +25)", "success");
      addLog(msg, 'dream');
    } else if (capsuleType === 'warp') {
      // 跃迁胶囊：梦境污染度降低 40 点
      setState(prev => ({
        ...prev,
        exploration: {
          ...prev.exploration,
          dreamPollution: Math.max(0, prev.exploration.dreamPollution - 40)
        }
      }));
      const msg = "🌀 使用了『折跃胶囊』，驱散了脑海中的部分梦魇阴霾 (精神污染-40)";
      setLogMessages(prev => [...prev, msg]);
      showToast("使用折跃胶囊成功 (精神污染 -40)", "success");
      addLog(msg, 'dream');
    }
  };

  return (
    <div className="w-full pb-20 space-y-4">
      {/* 梦胶囊控制面板（置顶于最上方，确保在非入梦状态理智为0时依然能使用稳定胶囊，解决死锁） */}
      {!exploration.inDreamExploration && (
        <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-3xl text-xs backdrop-blur-md animate-fade-in">
          <h4 className="font-bold text-zinc-300 mb-2.5 flex items-center gap-1.5">
            <Brain className="w-4 h-4 text-purple-400" />
            心灵药剂与胶囊储备
          </h4>
          <div className="flex gap-2.5">
            <button
              onClick={() => handleUseCapsule('sanity')}
              disabled={(state.exploration.capsulesCharge.sanity_capsule || 0) <= 0}
              className={`flex-1 py-2 rounded-xl text-[10px] font-bold flex flex-col items-center gap-0.5 transition-all ${
                (state.exploration.capsulesCharge.sanity_capsule || 0) > 0
                  ? 'bg-purple-950/60 border border-purple-500/30 text-purple-300 hover:bg-purple-900 cursor-pointer hover:border-purple-500/50 active:scale-95 animate-pulse'
                  : 'bg-zinc-900/50 text-zinc-600 border border-zinc-950/50 cursor-not-allowed opacity-50'
              }`}
            >
              <span>稳定胶囊 [拥有: {state.exploration.capsulesCharge.sanity_capsule || 0}次]</span>
              <span className="text-[9px] opacity-75">服用恢复 +25 理智</span>
            </button>
            <button
              onClick={() => handleUseCapsule('warp')}
              disabled={(state.exploration.capsulesCharge.warp_capsule || 0) <= 0}
              className={`flex-1 py-2 rounded-xl text-[10px] font-bold flex flex-col items-center gap-0.5 transition-all ${
                (state.exploration.capsulesCharge.warp_capsule || 0) > 0
                  ? 'bg-purple-950/60 border border-purple-500/30 text-purple-300 hover:bg-purple-900 cursor-pointer hover:border-purple-500/50 active:scale-95'
                  : 'bg-zinc-900/50 text-zinc-650 border border-zinc-950/50 cursor-not-allowed opacity-50'
              }`}
            >
              <span>折跃胶囊 [拥有: {state.exploration.capsulesCharge.warp_capsule || 0}次]</span>
              <span className="text-[9px] opacity-75">降低 -40 精神污染</span>
            </button>
          </div>
        </div>
      )}

      {!exploration.inDreamExploration ? (
        <div className="flex flex-col items-center justify-center p-6 bg-zinc-900/40 border border-zinc-800 rounded-3xl text-center">
          <Brain className="w-16 h-16 text-purple-400 mb-4 animate-pulse" />
          <h2 className="text-xl font-bold text-white mb-2">同步潜入心灵梦境</h2>
          <p className="text-xs text-zinc-400 max-w-[280px] mb-6 leading-relaxed">
            潜入梦境将扣除 <span className="text-purple-400 font-bold">10 点精神理智</span>。在集体梦境中，您可以与流失在外的幸存者锁定方位共鸣，或开采精神碎屑！
          </p>

          {state.exploration.dreamPollution > 0 && (
            <div className="mb-6 w-full p-3 bg-purple-950/20 border border-purple-500/20 rounded-2xl flex justify-between items-center text-xs">
              <span className="text-purple-300 font-semibold flex items-center gap-1">
                <AlertOctagon className="w-4 h-4 text-purple-400" />
                当前心灵污染度:
              </span>
              <span className="text-white font-black">{state.exploration.dreamPollution}%</span>
            </div>
          )}

          <button
            onClick={handleStartDream}
            className="w-full py-3 bg-gradient-to-r from-purple-700 to-fuchsia-700 hover:from-purple-600 hover:to-fuchsia-600 text-white font-extrabold rounded-2xl shadow-lg transition-all active:scale-95 text-center cursor-pointer"
          >
            开始共鸣入梦
          </button>
        </div>
      ) : (
        <div className="space-y-3 pt-0.5">
          {/* 梦境遭遇卡牌 - 滑动卡交互 */}
          {currentEvent && (
            <div className="w-full">
              <SwipeCard
                title={currentEvent.title}
                description={currentEvent.description}
                choiceA={currentEvent.choices.A}
                choiceB={currentEvent.choices.B}
                playerStats={state.player}
                playerInventory={state.inventory}
                dreamPollution={state.exploration.dreamPollution}
                eventType={currentEvent.type}
                leftColor="bg-red-500/20"
                rightColor="bg-purple-500/20"
                onSwipeLeft={() => handleMakeChoice(currentEvent.choices.A)}
                onSwipeRight={() => handleMakeChoice(currentEvent.choices.B)}
              />
            </div>
          )}

          {/* 临时心智背包与日志合并 Tab 面板 */}
          <div className="p-3 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 flex flex-col gap-2">
            <div className="flex gap-2.5 border-b border-zinc-800/60 pb-1.5 overflow-x-auto scrollbar-none">
              <button
                onClick={() => setDreamSubTab('logs')}
                className={`text-[10px] font-black pb-0.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  dreamSubTab === 'logs' ? 'text-purple-400 border-purple-400' : 'text-zinc-500 border-transparent hover:text-zinc-400'
                }`}
              >
                🔮 波束日志
              </button>
              <button
                onClick={() => setDreamSubTab('bag')}
                className={`text-[10px] font-black pb-0.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  dreamSubTab === 'bag' ? 'text-purple-400 border-purple-400' : 'text-zinc-500 border-transparent hover:text-zinc-400'
                }`}
              >
                🎒 心智背囊 ({Object.keys(exploration.dreamBag || {}).length})
              </button>
              {(() => {
                const pollution = exploration.dreamPollution || 0;
                const isDangerous = pollution >= 80;
                let titleColor = dreamSubTab === 'status' ? 'text-purple-400 border-purple-400 font-black' : 'text-zinc-500 border-transparent hover:text-zinc-400 font-bold';
                if (isDangerous) {
                  titleColor = dreamSubTab === 'status' ? 'text-rose-500 border-rose-500 animate-pulse font-black' : 'text-rose-400/90 border-transparent animate-pulse font-black';
                }
                return (
                  <button
                    onClick={() => setDreamSubTab('status')}
                    className={`text-[10px] pb-0.5 border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-0.5 ${titleColor}`}
                  >
                    📊 当前精神污染 ({pollution}%)
                  </button>
                );
              })()}
            </div>

            <div className="min-h-[44px] flex flex-col justify-center">
              {dreamSubTab === 'logs' && (
                <div className="space-y-1 text-[9px] leading-relaxed max-h-14 overflow-y-auto pr-0.5 scrollbar-thin">
                  {logMessages.slice(-3).map((msg, i) => (
                    <p key={i} className="text-zinc-500 border-l border-zinc-850 pl-1.5 text-left truncate select-none">
                      {msg}
                    </p>
                  ))}
                </div>
              )}

              {dreamSubTab === 'bag' && (
                <div className="space-y-2">
                  {/* 心灵胶囊快捷使用区 */}
                  <div className="flex gap-2 pb-1.5 border-b border-zinc-900/60">
                    <button
                      onClick={() => handleUseCapsule('sanity')}
                      disabled={(state.exploration.capsulesCharge.sanity_capsule || 0) <= 0}
                      className={`flex-1 py-1 rounded-lg text-[9px] font-bold flex items-center justify-center gap-1 transition-all ${
                        (state.exploration.capsulesCharge.sanity_capsule || 0) > 0
                          ? 'bg-purple-950/60 border border-purple-500/30 text-purple-300 hover:bg-purple-900 cursor-pointer active:scale-95 animate-pulse'
                          : 'bg-zinc-900/50 text-zinc-600 border border-zinc-950/50 cursor-not-allowed opacity-50'
                      }`}
                    >
                      <span>💊 稳定胶囊 (剩{(state.exploration.capsulesCharge.sanity_capsule || 0)}次)</span>
                    </button>
                    <button
                      onClick={() => handleUseCapsule('warp')}
                      disabled={(state.exploration.capsulesCharge.warp_capsule || 0) <= 0}
                      className={`flex-1 py-1 rounded-lg text-[9px] font-bold flex items-center justify-center gap-1 transition-all ${
                        (state.exploration.capsulesCharge.warp_capsule || 0) > 0
                          ? 'bg-purple-950/60 border border-purple-500/30 text-purple-300 hover:bg-purple-900 cursor-pointer active:scale-95'
                          : 'bg-zinc-900/50 text-zinc-650 border border-zinc-950/50 cursor-not-allowed opacity-50'
                      }`}
                    >
                      <span>🌀 折跃胶囊 (剩{(state.exploration.capsulesCharge.warp_capsule || 0)}次)</span>
                    </button>
                  </div>

                  {/* 背包物资 */}
                  {!exploration.dreamBag || Object.keys(exploration.dreamBag).length === 0 ? (
                    <span className="text-[9px] text-zinc-600 italic text-left select-none block py-0.5">暂无其他心智战利品</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 max-h-12 overflow-y-auto pr-0.5 scrollbar-thin">
                      {Object.entries(exploration.dreamBag).map(([item, qty]) => {
                        const label = ITEMS_CONFIG[item]?.name || item;
                        const isNegative = (qty as number) < 0;
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
                  )}
                </div>
              )}

              {dreamSubTab === 'status' && (
                <div className="grid grid-cols-2 gap-2 text-[10px] animate-fade-in">
                  <div className="flex flex-col justify-center border-r border-zinc-800/40 pr-2">
                    <div className="flex justify-between items-center text-purple-300 font-bold mb-1 text-[9px]">
                      <span>当前精神污染: {exploration.dreamPollution}%</span>
                    </div>
                    <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-purple-500 h-full transition-all duration-300"
                        style={{ width: `${exploration.dreamPollution}%` }}
                      />
                    </div>
                    <span className="text-[7.5px] text-zinc-500 mt-1 block">达到100%将引动梦魇入侵</span>
                  </div>
                  <div className="max-h-[48px] overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
                    {SURVIVORS_CONFIG.map(config => {
                      const res = exploration.survivorResonance?.[config.id] || 0;
                      if (res <= 0 || res >= 100) return null;
                      return (
                        <div key={config.id} className="flex flex-col animate-fade-in">
                          <div className="flex justify-between items-center text-emerald-400 font-bold text-[8.5px] mb-0.5">
                            <span className="flex items-center gap-0.5">
                              <Sparkles className="w-2 h-2 text-emerald-400" />
                              同伴【{config.name}】共鸣: {res}%
                            </span>
                          </div>
                          <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-400 h-full transition-all duration-300"
                              style={{ width: `${res}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    {Object.values(exploration.survivorResonance || {}).filter(res => (res as number) > 0 && (res as number) < 100).length === 0 && (
                      <span className="text-[8px] text-zinc-600 italic block mt-1 text-center">无正在共鸣的同伴</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DreamscapeTab;
