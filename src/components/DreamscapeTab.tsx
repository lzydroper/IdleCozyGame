import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { DREAM_EVENTS } from '../data/dreamEvents';
import type { DreamChoice } from '../data/dreamEvents';
import { SURVIVORS_CONFIG } from '../data/survivors';
import { useToast } from './ToastSystem';
import SwipeCard from './SwipeCard';
import { Moon, Sparkles, Brain, AlertOctagon } from 'lucide-react';

const DreamscapeTab: React.FC = () => {
  const { state, setState, addLog } = useGame();
  const { showToast } = useToast();
  const [logMessages, setLogMessages] = useState<string[]>([]);

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
          ? { type: "dream_leak", hp: 60 }
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
        const locationName = 
          location === 'radar_station' ? '废弃雷达站' :
          location === 'green_ruins' ? '温室废墟' : '信号塔';
        const msg = `✨ 脑波连结成功！已完美锁定幸存同伴【${name}】的现实坐标：『${locationName}』，快返回现实探索营救！`;
        setLogMessages(prev => [...prev, msg]);
        addLog(msg, 'dream');
      }
    }
  };

  const handleWakeUp = () => {
    // 将梦境包碎片存入主背包
    setState(prev => {
      const newInventory = { ...prev.inventory };
      Object.entries(prev.exploration.dreamBag).forEach(([item, qty]) => {
        newInventory[item] = (newInventory[item] || 0) + qty;
      });

      return {
        ...prev,
        inventory: newInventory,
        exploration: {
          ...prev.exploration,
          inDreamExploration: false,
          dreamSteps: 0,
          dreamBag: {},
          dreamEventId: null
        }
      };
    });
    showToast("你成功收回意识从梦境醒来，已带回梦境碎片！", "success");
    addLog("从集体无意识梦境深处主动苏醒，返回现实。", "system");
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
    <div className="w-full pb-20">
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
        <div className="space-y-4">
          {/* 梦境探索控制头部 */}
          <div className="flex justify-between items-center p-3 rounded-2xl bg-zinc-900/60 border border-purple-500/20">
            <span className="text-xs text-zinc-400 font-bold flex items-center gap-1">
              <Moon className="w-4 h-4 text-purple-400" />
              梦境连结深度: <span className="text-white text-sm">{exploration.dreamSteps}</span> 层
            </span>
            <button
              onClick={handleWakeUp}
              className="px-3.5 py-1.5 bg-purple-950 border border-purple-500/40 text-purple-300 text-xs font-black rounded-xl hover:bg-purple-900 transition-colors cursor-pointer"
            >
              唤醒自我
            </button>
          </div>

          {/* 属性与污染条 */}
          <div className="p-3 bg-zinc-900/40 border border-zinc-800 rounded-2xl grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-purple-300 font-bold">当前精神污染:</span>
              <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden mt-1.5 border border-zinc-900">
                <div
                  className="bg-purple-500 h-full transition-all duration-300"
                  style={{ width: `${exploration.dreamPollution}%` }}
                />
              </div>
              <span className="text-[10px] text-zinc-500 mt-1 block">达到100%将引动梦魇入侵</span>
            </div>

            {/* Dynamic resonance displays */}
            <div className="space-y-1">
              {SURVIVORS_CONFIG.map(config => {
                const res = exploration.survivorResonance?.[config.id] || 0;
                if (res <= 0 || res >= 100) return null;
                return (
                  <div key={config.id} className="animate-fade-in">
                    <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      同伴【{config.name}】共鸣: {res}%
                    </span>
                    <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden mt-1 border border-zinc-900">
                      <div
                        className="bg-emerald-400 h-full transition-all duration-300"
                        style={{ width: `${res}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 梦胶囊控制面板 */}
          <div className="p-3 bg-zinc-900/40 border border-zinc-800 rounded-2xl text-xs">
            <h4 className="font-bold text-zinc-400 mb-2 flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5 text-purple-400" />
              梦境专属道具 (充能数)：
            </h4>
            <div className="flex gap-2">
              <button
                onClick={() => handleUseCapsule('sanity')}
                className="flex-1 py-2 bg-purple-950 hover:bg-purple-900 border border-purple-500/20 rounded-xl text-[10px] font-bold text-purple-300 flex flex-col items-center gap-0.5 cursor-pointer"
              >
                <span>稳定胶囊 [拥有: {state.exploration.capsulesCharge.sanity_capsule || 0}次]</span>
                <span className="text-[9px] opacity-60">理智+25</span>
              </button>
              <button
                onClick={() => handleUseCapsule('warp')}
                className="flex-1 py-2 bg-purple-950 hover:bg-purple-900 border border-purple-500/20 rounded-xl text-[10px] font-bold text-purple-300 flex flex-col items-center gap-0.5 cursor-pointer"
              >
                <span>折跃胶囊 [拥有: {state.exploration.capsulesCharge.warp_capsule || 0}次]</span>
                <span className="text-[9px] opacity-60">污染-40</span>
              </button>
            </div>
          </div>

          {/* 梦境遭遇卡牌 - 滑动卡交互 */}
          {currentEvent && (
            <div className="w-full">
              <SwipeCard
                title={currentEvent.title}
                description={currentEvent.description}
                leftLabel={currentEvent.choices.A.text}
                rightLabel={currentEvent.choices.B.text}
                leftColor="bg-red-500/20"
                rightColor="bg-purple-500/20"
                onSwipeLeft={() => handleMakeChoice(currentEvent.choices.A)}
                onSwipeRight={() => handleMakeChoice(currentEvent.choices.B)}
              />
            </div>
          )}

          {/* 探索日志 */}
          <div className="p-4 rounded-3xl bg-zinc-950 border border-zinc-900 flex flex-col gap-2 max-h-40 overflow-y-auto">
            <h4 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest text-left">梦境连结波束日志</h4>
            <div className="space-y-1.5 text-[10px] leading-relaxed">
              {logMessages.map((msg, i) => (
                <p key={i} className="text-zinc-500 border-l border-zinc-800 pl-2 text-left">
                  {msg}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DreamscapeTab;
