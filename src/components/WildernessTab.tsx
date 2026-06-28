import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { REALITY_EVENTS } from '../data/realityEvents';
import type { RealityEvent, EventChoice } from '../data/realityEvents';
import { Compass, ShieldAlert, Package, ArrowRight } from 'lucide-react';

const WildernessTab: React.FC = () => {
  const { state, setState } = useGame();
  const [currentEvent, setCurrentEvent] = useState<RealityEvent | null>(null);
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [deathOccurred, setDeathOccurred] = useState(false);

  const exploration = state.exploration;
  const player = state.player;

  // 随机抽取一张事件卡牌
  const drawEvent = () => {
    const keys = Object.keys(REALITY_EVENTS);
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    setCurrentEvent(REALITY_EVENTS[randomKey]);
  };

  const handleStartExploration = () => {
    if (player.food < 15 || player.energy < 15) {
      alert("生存指标过低（饱食度与魔能均需 >= 15），请先在温室收菜或工坊制作补给！");
      return;
    }

    setState(prev => ({
      ...prev,
      player: {
        ...prev.player,
        food: Math.max(0, prev.player.food - 10),
        energy: Math.max(0, prev.player.energy - 10)
      },
      exploration: {
        ...prev.exploration,
        inRealityExploration: true,
        realitySteps: 0,
        realityBag: {}
      }
    }));
    setLogMessages(["你打开防化避难门，踏入了风沙肆虐的现实废土。防护服发出低沉的嗡嗡声..."]);
    setDeathOccurred(false);
  };

  useEffect(() => {
    if (exploration.inRealityExploration && !currentEvent) {
      drawEvent();
    }
  }, [exploration.inRealityExploration]);

  const handleMakeChoice = (choice: EventChoice) => {
    // 检查要求
    if (choice.requirements) {
      let reqsMet = true;
      Object.entries(choice.requirements).forEach(([item, qty]) => {
        if ((state.inventory[item] || 0) < qty) {
          reqsMet = false;
        }
      });
      if (!reqsMet) {
        alert("不满足选项要求的前提条件！");
        return;
      }
    }

    // 应用选择结果
    setState(prev => {
      // 1. 改变基础状态
      const newPlayer = { ...prev.player };
      if (choice.results.stats) {
        Object.entries(choice.results.stats).forEach(([stat, val]) => {
          const key = stat as keyof typeof newPlayer;
          newPlayer[key] = Math.max(0, Math.min(100, (newPlayer[key] as number) + val));
        });
      }

      // 2. 将物品推入临时包包
      const newRealityBag = { ...prev.exploration.realityBag };
      if (choice.results.items) {
        Object.entries(choice.results.items).forEach(([item, qty]) => {
          newRealityBag[item] = (newRealityBag[item] || 0) + qty;
        });
      }

      // 3. 检查玩家是否死亡
      const isDead = newPlayer.hp <= 0;

      return {
        ...prev,
        player: newPlayer,
        exploration: {
          ...prev.exploration,
          realitySteps: prev.exploration.realitySteps + (isDead ? 0 : 1),
          realityBag: isDead ? {} : newRealityBag,
          inRealityExploration: !isDead
        }
      };
    });

    if (state.player.hp + (choice.results.stats?.hp || 0) <= 0) {
      // 玩家血量降为 0
      setDeathOccurred(true);
      setLogMessages(prev => [...prev, choice.results.logText, "🔴 警告：防护服破损！理智崩溃，你因伤重陷入昏迷，被避难所自动救援系统强行拖回。你丢失了本次探索带回的所有物资..."]);
      setCurrentEvent(null);
    } else {
      setLogMessages(prev => [...prev, choice.results.logText]);
      // 继续抽牌
      drawEvent();
    }
  };

  const handleRetreat = () => {
    // 将临时背包的资源合并入主仓库，并撤退
    setState(prev => {
      const newInventory = { ...prev.inventory };
      Object.entries(prev.exploration.realityBag).forEach(([item, qty]) => {
        newInventory[item] = (newInventory[item] || 0) + qty;
      });

      return {
        ...prev,
        inventory: newInventory,
        exploration: {
          ...prev.exploration,
          inRealityExploration: false,
          realitySteps: 0,
          realityBag: {}
        }
      };
    });
    alert("你成功折返避难所，将地表搜集到的战利品存入储藏箱！");
    setCurrentEvent(null);
  };

  return (
    <div className="w-full pb-20">
      {!exploration.inRealityExploration ? (
        <div className="flex flex-col items-center justify-center p-6 bg-zinc-900/40 border border-zinc-800 rounded-3xl text-center">
          <Compass className="w-16 h-16 text-cyan-400 mb-4 animate-bounce" />
          <h2 className="text-xl font-bold text-white mb-2">踏入废土荒野</h2>
          <p className="text-xs text-zinc-400 max-w-[280px] mb-6 leading-relaxed">
            探险需要消耗 <span className="text-amber-500 font-bold">10 点饱食度</span> 和 <span className="text-cyan-400 font-bold">10 点供能魔能</span>。地表暗藏杀机，但可以采集到珍贵的魔导核心、发光纤维以及废土合金！
          </p>

          {deathOccurred && (
            <div className="mb-6 p-4 bg-red-950/40 border border-red-500/20 text-xs text-red-400 rounded-2xl max-w-sm">
              <ShieldAlert className="w-5 h-5 text-red-400 mx-auto mb-1" />
              你刚刚在探险中遭遇意外！请先在温室收菜制药以恢复血量。
            </div>
          )}

          <button
            onClick={handleStartExploration}
            className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-extrabold rounded-2xl shadow-lg transition-all active:scale-95 text-center"
          >
            开始探索
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 探索头部信息 */}
          <div className="flex justify-between items-center p-3 rounded-2xl bg-zinc-900/60 border border-cyan-500/20">
            <span className="text-xs text-zinc-400 font-bold flex items-center gap-1">
              <Compass className="w-4 h-4 text-cyan-400" />
              废土前行步数: <span className="text-white text-sm">{exploration.realitySteps}</span> 步
            </span>
            <button
              onClick={handleRetreat}
              className="px-3.5 py-1.5 bg-rose-950 border border-rose-500/40 text-rose-300 text-xs font-black rounded-xl hover:bg-rose-900 transition-colors"
            >
              安全撤退
            </button>
          </div>

          {/* 临时背包 */}
          <div className="p-3 rounded-2xl bg-zinc-900/40 border border-zinc-800 text-xs">
            <h4 className="font-bold text-zinc-400 mb-2 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5" /> 临时背囊 (撤退时带回):
            </h4>
            {Object.keys(exploration.realityBag).length === 0 ? (
              <span className="text-zinc-600 italic">空空如也，前行搜寻物资吧</span>
            ) : (
              <div className="flex flex-wrap gap-2">
                {Object.entries(exploration.realityBag).map(([item, qty]) => {
                  const label = {
                    scrap_metal: "废金属",
                    seed_glow_grass: "荧光草种",
                    seed_steel_sunflower: "向日葵种",
                    ration: "口粮",
                    dream_shard: "梦境碎片"
                  }[item] || item;
                  return (
                    <span key={item} className="px-2 py-1 bg-zinc-950 rounded-lg border border-zinc-800 text-zinc-300 font-bold">
                      {label} x{qty}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* 遭遇卡牌 */}
          {currentEvent && (
            <div className="p-5 rounded-3xl bg-zinc-900 border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.1)] animate-fade-in flex flex-col gap-4">
              <div>
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">▲ 废土突发事件</span>
                <h3 className="text-lg font-black text-white mt-1">{currentEvent.title}</h3>
                <p className="text-xs text-zinc-400 mt-2.5 leading-relaxed">{currentEvent.description}</p>
              </div>

              <div className="grid grid-cols-1 gap-2.5 mt-2">
                <button
                  onClick={() => handleMakeChoice(currentEvent.choices.A)}
                  className="p-3 text-left bg-zinc-950 border border-zinc-800 hover:border-cyan-500 rounded-2xl text-xs transition-all hover:bg-zinc-900 group"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-zinc-200 group-hover:text-cyan-400 transition-colors">
                      {currentEvent.choices.A.text}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-cyan-400" />
                  </div>
                </button>

                <button
                  onClick={() => handleMakeChoice(currentEvent.choices.B)}
                  className="p-3 text-left bg-zinc-950 border border-zinc-800 hover:border-cyan-500 rounded-2xl text-xs transition-all hover:bg-zinc-900 group"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-zinc-200 group-hover:text-cyan-400 transition-colors">
                      {currentEvent.choices.B.text}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-cyan-400" />
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* 探索日志 */}
          <div className="p-4 rounded-3xl bg-zinc-950 border border-zinc-900 flex flex-col gap-2 max-h-40 overflow-y-auto">
            <h4 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">探索记录</h4>
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

export default WildernessTab;
