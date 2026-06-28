import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { DREAM_EVENTS } from '../data/dreamEvents';
import type { DreamEvent, DreamChoice } from '../data/dreamEvents';
import { Moon, Sparkles, Brain, AlertOctagon, ArrowRight } from 'lucide-react';

const DreamscapeTab: React.FC = () => {
  const { state, setState } = useGame();
  const [currentEvent, setCurrentEvent] = useState<DreamEvent | null>(null);
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [royResonance, setRoyResonance] = useState(0);

  const exploration = state.exploration;
  const player = state.player;

  const drawDreamEvent = () => {
    const keys = Object.keys(DREAM_EVENTS);
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    setCurrentEvent(DREAM_EVENTS[randomKey]);
  };

  const handleStartDream = () => {
    if (player.sanity < 15) {
      alert("精神状态极度衰弱（理智值需 >= 15），无法进入心灵链接！");
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
        dreamBag: {}
      }
    }));
    setLogMessages(["魔导脑波同步完毕...你的意识脱离肉体，缓缓坠入幽深的心灵海洋。"]);
    setRoyResonance(0);
  };

  useEffect(() => {
    if (exploration.inDreamExploration && !currentEvent) {
      drawDreamEvent();
    }
  }, [exploration.inDreamExploration]);

  const handleMakeChoice = (choice: DreamChoice) => {
    let showRoyUnlockedAlert = false;

    // 应用改变
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
      let newSurvivors = { ...prev.survivors };
      if (choice.results.stats?.resonance && choice.results.targetSurvivorId) {
        const survivorId = choice.results.targetSurvivorId;
        const currentRes = royResonance + choice.results.stats.resonance;
        setRoyResonance(currentRes);

        if (currentRes >= 100 && !prev.survivors[survivorId]) {
          showRoyUnlockedAlert = true;
          // 锁定罗伊的现实坐标
          newSurvivors[survivorId] = {
            id: survivorId,
            name: "罗伊",
            role: "farmer",
            bonus: 0.20, // 提升温室种植20%效率
            isAssigned: false,
            realityLocationId: "radar_station" // 现实救援地点：雷达站
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

      // 5. 检查污染度是否溢出触发【梦魇降临】
      const isPollutionFull = newExploration.dreamPollution >= 100;
      const isSanityZero = newPlayer.sanity <= 0;
      const forceWakeUp = isPollutionFull || isSanityZero;

      return {
        ...prev,
        player: newPlayer,
        survivors: newSurvivors,
        activeAlert: isPollutionFull
          ? { type: "dream_leak", hp: 60 } // 触发入侵
          : prev.activeAlert,
        exploration: {
          ...newExploration,
          dreamSteps: forceWakeUp ? 0 : newExploration.dreamSteps + 1,
          dreamBag: forceWakeUp ? {} : newDreamBag,
          inDreamExploration: !forceWakeUp
        }
      };
    });

    // 飘字或日志
    if (state.player.sanity + (choice.results.stats?.sanity || 0) <= 0) {
      alert("理智耗尽！你因精神休克被强制切断心灵连结，梦中收获的碎片全部破碎散落。");
      setCurrentEvent(null);
    } else if (state.exploration.dreamPollution + (choice.results.stats?.pollution || 0) >= 100) {
      alert("⚠️ 严重警告：精神污染度已达100%！深渊虚空被引动，你从冷汗中惊醒，有梦魇怪兽追循精神印记侵入了你的现实温室！");
      setCurrentEvent(null);
    } else {
      setLogMessages(prev => [...prev, choice.results.logText]);
      if (showRoyUnlockedAlert) {
        setLogMessages(prev => [
          ...prev,
          "✨ 心灵连结大成功！已完美解析罗伊的心灵脑波。解锁现实救援坐标：『废弃雷达站』！你现在可以返回现实探索去营救他了。"
        ]);
      }
      drawDreamEvent();
    }
  };

  // 使用梦胶囊
  const handleUseCapsule = (capsuleType: 'sanity' | 'warp') => {
    const shardCount = state.inventory.dream_shard || 0;

    if (capsuleType === 'sanity') {
      if (shardCount < 2) {
        alert("梦境碎片不足，无法为理智胶囊充能使用（需要 2 碎片）！");
        return;
      }
      setState(prev => ({
        ...prev,
        inventory: {
          ...prev.inventory,
          dream_shard: shardCount - 2
        },
        player: {
          ...prev.player,
          sanity: Math.min(100, prev.player.sanity + 20)
        }
      }));
      setLogMessages(prev => [...prev, "💊 你服用了『梦境理智稳定胶囊』，消耗2个梦境碎片，精神状态好转了点 (理智+20)"]);
    } else if (capsuleType === 'warp') {
      if (shardCount < 3) {
        alert("梦境碎片不足，无法激活折跃胶囊（需要 3 碎片）！");
        return;
      }
      setState(prev => ({
        ...prev,
        inventory: {
          ...prev.inventory,
          dream_shard: shardCount - 3
        }
      }));
      setLogMessages(prev => [...prev, "🌀 你激发了『梦境折跃胶囊』，消耗3个梦境碎片，强行折叠时空避开了当前险境！"]);
      // 跳过当前卡牌并重抽
      drawDreamEvent();
    }
  };

  const handleWakeUp = () => {
    // 将梦境包里的碎片合入主背包，并主动苏醒
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
          dreamBag: {}
        }
      };
    });
    alert("你的意识回炉本体，顺利从梦中醒来。");
    setCurrentEvent(null);
  };

  return (
    <div className="w-full pb-20">
      {!exploration.inDreamExploration ? (
        <div className="flex flex-col items-center justify-center p-6 bg-zinc-900/40 border border-zinc-800 rounded-3xl text-center">
          <Brain className="w-16 h-16 text-purple-400 mb-4 animate-pulse" />
          <h2 className="text-xl font-bold text-white mb-2">同步潜入心灵梦境</h2>
          <p className="text-xs text-zinc-400 max-w-[280px] mb-6 leading-relaxed">
            潜入梦境需要消耗 <span className="text-purple-400 font-bold">10 点精神理智</span>。在集体无意识海洋中，你可以通过意识连结锁定在现实废土迷失的幸存者，或者开采珍贵的梦境科技碎片！
          </p>

          {state.exploration.dreamPollution > 0 && (
            <div className="mb-6 w-full p-3 bg-purple-950/20 border border-purple-500/20 rounded-2xl flex justify-between items-center text-xs">
              <span className="text-purple-300 font-semibold flex items-center gap-1">
                <AlertOctagon className="w-4 h-4 text-purple-400" />
                当前避难所受梦境污染度:
              </span>
              <span className="text-white font-black">{state.exploration.dreamPollution}%</span>
            </div>
          )}

          <button
            onClick={handleStartDream}
            className="w-full py-3 bg-gradient-to-r from-purple-700 to-fuchsia-700 hover:from-purple-600 hover:to-fuchsia-600 text-white font-extrabold rounded-2xl shadow-lg transition-all active:scale-95 text-center"
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
              className="px-3.5 py-1.5 bg-purple-950 border border-purple-500/40 text-purple-300 text-xs font-black rounded-xl hover:bg-purple-900 transition-colors"
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

            {royResonance > 0 && royResonance < 100 && (
              <div>
                <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  幸存者罗伊共鸣:
                </span>
                <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden mt-1.5 border border-zinc-900">
                  <div
                    className="bg-emerald-400 h-full transition-all duration-300"
                    style={{ width: `${royResonance}%` }}
                  />
                </div>
                <span className="text-[10px] text-zinc-500 mt-1 block">达到100%在现实中锁定营救</span>
              </div>
            )}
          </div>

          {/* 梦胶囊控制面板 */}
          <div className="p-3 bg-zinc-900/40 border border-zinc-800 rounded-2xl text-xs">
            <h4 className="font-bold text-zinc-400 mb-2 flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5 text-purple-400" />
              梦境专属道具 (梦胶囊):
            </h4>
            <div className="flex gap-2">
              <button
                onClick={() => handleUseCapsule('sanity')}
                className="flex-1 py-2 bg-purple-950 hover:bg-purple-900 border border-purple-500/20 rounded-xl text-[10px] font-bold text-purple-300 flex flex-col items-center gap-0.5"
              >
                <span>稳定胶囊</span>
                <span className="text-[9px] opacity-60">理智+20 (耗2碎)</span>
              </button>
              <button
                onClick={() => handleUseCapsule('warp')}
                className="flex-1 py-2 bg-purple-950 hover:bg-purple-900 border border-purple-500/20 rounded-xl text-[10px] font-bold text-purple-300 flex flex-col items-center gap-0.5"
              >
                <span>折跃胶囊</span>
                <span className="text-[9px] opacity-60">跳过危机 (耗3碎)</span>
              </button>
            </div>
          </div>

          {/* 梦境遭遇卡牌 */}
          {currentEvent && (
            <div className="p-5 rounded-3xl bg-zinc-900 border border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.1)] animate-fade-in flex flex-col gap-4">
              <div>
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">⚡ Collective Unconscious</span>
                <h3 className="text-lg font-black text-white mt-1">{currentEvent.title}</h3>
                <p className="text-xs text-zinc-400 mt-2.5 leading-relaxed">{currentEvent.description}</p>
              </div>

              <div className="grid grid-cols-1 gap-2.5 mt-2">
                <button
                  onClick={() => handleMakeChoice(currentEvent.choices.A)}
                  className="p-3 text-left bg-zinc-950 border border-zinc-800 hover:border-purple-500 rounded-2xl text-xs transition-all hover:bg-zinc-900 group"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-zinc-200 group-hover:text-purple-400 transition-colors">
                      {currentEvent.choices.A.text}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-purple-400" />
                  </div>
                </button>

                <button
                  onClick={() => handleMakeChoice(currentEvent.choices.B)}
                  className="p-3 text-left bg-zinc-950 border border-zinc-800 hover:border-purple-500 rounded-2xl text-xs transition-all hover:bg-zinc-900 group"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-zinc-200 group-hover:text-purple-400 transition-colors">
                      {currentEvent.choices.B.text}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-purple-400" />
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* 探索日志 */}
          <div className="p-4 rounded-3xl bg-zinc-950 border border-zinc-900 flex flex-col gap-2 max-h-40 overflow-y-auto">
            <h4 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">梦境日志</h4>
            <div className="space-y-1.5 text-[10px] leading-relaxed">
              {logMessages.map((msg, i) => (
                <p key={i} className="text-zinc-500 border-l border-zinc-800 pl-2">
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
