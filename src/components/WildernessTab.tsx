import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { REALITY_EVENTS } from '../data/realityEvents';
import type { RealityEvent, EventChoice } from '../data/realityEvents';
import { useToast } from './ToastSystem';
import SwipeCard from './SwipeCard';
import { Compass, ShieldAlert, Package, ChevronRight } from 'lucide-react';
import wildernessCard from '../assets/wilderness_card.jpg';
import { ITEMS_CONFIG } from '../data/items';

// 特殊救援事件定义
const ROY_RESCUE_EVENT: RealityEvent = {
  id: "rescue_roy",
  title: "雷达站：营救罗伊",
  description: "在破碎的雷达阵列控制舱中，你发现了饥寒交迫的工程师罗伊。然而，废墟的阴暗处有一只高能辐射蝎挡在门口嘶吼！你可以部署防御电磁塔击杀它，或者超频护盾顶着攻击冲过去。",
  choices: {
    A: {
      text: "部署防御炮塔消灭怪兽 (需炮塔x1, 生命-10)",
      requirements: { defensive_turret: 1 },
      results: {
        stats: { hp: -10 },
        items: { defensive_turret: -1 },
        logText: "你快速部署了防御炮塔，激发的电磁炮击碎了蝎子的外壳，但余波也震裂了你的防化服。你成功背起罗伊！"
      }
    },
    B: {
      text: "使用能量补充剂强突 (需补充剂x2, 生命-20)",
      requirements: { energy_refill: 2 },
      results: {
        stats: { hp: -20 },
        items: { energy_refill: -2 },
        logText: "你启动双份能量补充剂强开电荷屏障，硬扛着蝎毒的腐蚀将罗伊抱走，乘升降机成功脱险！"
      }
    }
  }
};

const MEI_RESCUE_EVENT: RealityEvent = {
  id: "rescue_mei",
  title: "温室废墟：营救阿梅",
  description: "在坍塌的古代魔导温室深处，阿梅被带毒的发光寄生藤蔓死死卷在空中，已经处于半昏迷状态。你必须熔断藤蔓救她，或者喂食压缩口粮给她提供能量挣脱藤蔓。",
  choices: {
    A: {
      text: "魔能超频熔毁藤蔓 (魔能-30)",
      results: {
        stats: { energy: -30 },
        logText: "你将魔导拳超频，爆发出一圈炽热弧光烧断了毒藤，接住了掉落的阿梅。营救成功！"
      }
    },
    B: {
      text: "喂食口粮提供体力 (需口粮x3)",
      requirements: { ration: 3 },
      results: {
        items: { ration: -3 },
        logText: "你用刀片切开一线藤蔓，将三份压缩口粮喂给阿梅。她恢复了体力配合你的拉扯扯断了藤蔓！"
      }
    }
  }
};

const ZERO_RESCUE_EVENT: RealityEvent = {
  id: "rescue_zero",
  title: "信号塔：营救 Zero",
  description: "Zero 在信号塔顶部被一群高速移动的废土电磁黄蜂包围，腿部严重骨折。黄蜂发出的静电风暴极其剧烈，你必须部署防御炮塔，或者超频护盾顶着电弧突击。",
  choices: {
    A: {
      text: "部署电磁防御塔掩护 (需炮塔x1)",
      requirements: { defensive_turret: 1 },
      results: {
        items: { defensive_turret: -1 },
        logText: "你掷出炮塔形成诱饵雷区，引走了疯狂的金属黄蜂，成功滑索将 Zero 救下！"
      }
    },
    B: {
      text: "硬扛静电防护网强冲 (生命-25, 魔能-20)",
      results: {
        stats: { hp: -25, energy: -20 },
        logText: "你强开防护盾，顶着万伏高压电弧的撕咬，强行撕开黄蜂群背起 Zero 滑降！"
      }
    }
  }
};

const CATHERINE_RESCUE_EVENT: RealityEvent = {
  id: "rescue_catherine",
  title: "生化实验室：营救凯瑟琳",
  description: "实验室里弥漫着毒气，凯瑟琳医生被一群魔化辐射老鼠包围在配药舱内。你可以使用纳米修复针强攻，或者用魔能超频强熔溶解锁。",
  choices: {
    A: {
      text: "使用纳米修复针破除大门 (需纳米针x1, 生命-10)",
      requirements: { nanite_injector: 1 },
      results: {
        stats: { hp: -10 },
        logText: "你快速使用纳米修复针打破封锁并保护凯瑟琳，虽然防化服被毒气微量腐蚀，但成功救出！"
      }
    },
    B: {
      text: "魔能超频强熔溶解锁 (生命-20, 魔能-35)",
      results: {
        stats: { hp: -20, energy: -35 },
        logText: "你强开魔能高热熔断锁孔，在变异鼠群合围前破门而入，成功救出凯瑟琳！"
      }
    }
  }
};

const BUSTER_RESCUE_EVENT: RealityEvent = {
  id: "rescue_buster",
  title: "坍塌地铁站：营救巴斯特",
  description: "地铁站月台半塌陷，巴斯特的腿被碎石死死压住，而黑暗的隧道深处传来变异掘墓兽的沉重咆哮声。你需要部署防御炮塔，或者强行肉搏拉人。",
  choices: {
    A: {
      text: "部署防御炮塔压制怪物 (需防御炮塔x1)",
      requirements: { defensive_turret: 1 },
      results: {
        logText: "你迅速部署炮塔建立防线。强烈的电磁火花在隧道中爆发，你趁机用铁锹撬开碎石，救出巴斯特！"
      }
    },
    B: {
      text: "肉搏变异体强行拉人 (生命-35, 魔能-15)",
      results: {
        stats: { hp: -35, energy: -15 },
        logText: "你丢开武器徒手推开巨石。狂暴的怪兽撕咬伤了你的侧腹，但你强忍重伤背起巴斯特脱离了地铁站！"
      }
    }
  }
};

const NOVA_RESCUE_EVENT: RealityEvent = {
  id: "rescue_nova",
  title: "军火库：营救诺娃",
  description: "诺娃被困在受辐射的报废魔导机甲驾驶舱内，机甲核心已经处于临界过载的边缘，极度危险！你需要使用重载护盾电池稳定磁场，或者超频暴力破拆机甲。",
  choices: {
    A: {
      text: "使用重载护盾电池稳定磁场 (需护盾电池x1)",
      requirements: { shield_battery: 1 },
      results: {
        logText: "你抛出重载护盾电池。柔和的能量磁场稳定了机甲核心，驾驶舱盖自动弹开，你成功扶出诺娃！"
      }
    },
    B: {
      text: "超频砸开驾驶舱 (生命-25, 魔能-30)",
      results: {
        stats: { hp: -25, energy: -30 },
        logText: "你魔能超频，一拳一拳强行砸烂了防爆座舱玻璃，抢在机甲核心殉爆前将诺娃拖出！"
      }
    }
  }
};

const WildernessTab: React.FC = () => {
  const { state, setState, addLog } = useGame();
  const { showToast, showConfirm } = useToast();
  const [currentEvent, setCurrentEvent] = useState<RealityEvent | null>(null);
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [deathOccurred, setDeathOccurred] = useState(false);

  const exploration = state.exploration;
  const player = state.player;

  // 随机抽取一张事件卡牌，或者是救援目的地的特殊事件
  const drawEvent = () => {
    // 救援任务到了第 5 步（steps === 4）
    if (exploration.realityLocationId && exploration.realitySteps >= 4) {
      if (exploration.realityLocationId === 'radar_station') {
        setCurrentEvent(ROY_RESCUE_EVENT);
      } else if (exploration.realityLocationId === 'green_ruins') {
        setCurrentEvent(MEI_RESCUE_EVENT);
      } else if (exploration.realityLocationId === 'signal_tower') {
        setCurrentEvent(ZERO_RESCUE_EVENT);
      } else if (exploration.realityLocationId === 'bio_lab') {
        setCurrentEvent(CATHERINE_RESCUE_EVENT);
      } else if (exploration.realityLocationId === 'collapsed_subway') {
        setCurrentEvent(BUSTER_RESCUE_EVENT);
      } else if (exploration.realityLocationId === 'military_depot') {
        setCurrentEvent(NOVA_RESCUE_EVENT);
      }
      return;
    }

    // 正常抽随机事件
    const keys = Object.keys(REALITY_EVENTS);
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    setCurrentEvent(REALITY_EVENTS[randomKey]);
  };

  const handleStartExploration = (locationId: string | null) => {
    const isRescue = locationId !== null;
    let foodCost = isRescue ? 15 : 10;
    let energyCost = isRescue ? 15 : 10;

    // Zero 的被动：存在则魔能消耗 -15%，若已营救则饱食度消耗 -15%
    if (state.survivors.zero) {
      energyCost = Math.round(energyCost * 0.85);
      if (!state.survivors.zero.realityLocationId) {
        foodCost = Math.round(foodCost * 0.85);
      }
    }

    // Catherine 的被动：已营救则饱食度消耗 -15%
    if (state.survivors.catherine && !state.survivors.catherine.realityLocationId) {
      foodCost = Math.round(foodCost * 0.85);
    }

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
        realityBag: {}
      }
    }));

    const text = isRescue ? `你全副武装前往目标救援点，防护服发出嗡嗡低鸣...` : `你打开防化避难门，踏入了风沙肆虐的现实废土。`;
    setLogMessages([text]);
    addLog(text, 'event');
    setDeathOccurred(false);
  };

  useEffect(() => {
    if (exploration.inRealityExploration && !currentEvent) {
      drawEvent();
    }
  }, [exploration.inRealityExploration]);

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

    // 凯瑟琳的消耗降低被动效果：若 hasCatherine 或 survivors.catherine 存在，且 stats 扣减为负且属于 hp / food，乘 0.85 并四舍五入。
    let adjustedStats = choice.results.stats ? { ...choice.results.stats } : undefined;
    if (adjustedStats && (state.hasCatherine || state.survivors.catherine)) {
      if (adjustedStats.hp !== undefined && adjustedStats.hp < 0) {
        adjustedStats.hp = Math.round(adjustedStats.hp * 0.85);
      }
      if (adjustedStats.food !== undefined && adjustedStats.food < 0) {
        adjustedStats.food = Math.round(adjustedStats.food * 0.85);
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
          // 巴斯特的废铁加成：已救出（即 state.survivors.buster && !state.survivors.buster.realityLocationId）
          if (item === 'scrap_metal' && qty > 0) {
            const hasBuster = prev.survivors.buster && !prev.survivors.buster.realityLocationId;
            if (hasBuster) {
              adjustedQty = Math.round(qty * 1.3);
            }
          }
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
            realityBag: {}
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
          inRealityExploration: !isDead
        }
      };
    });

    const nextHp = state.player.hp + (adjustedStats?.hp || 0);

    if (nextHp <= 0) {
      setDeathOccurred(true);
      const dieMsg = "🔴 警告：防化服严重破损！你重伤失去意识，避难所机械臂将你强行拖回。丢失了全部地表战利品...";
      setLogMessages(prev => [...prev, choice.results.logText, dieMsg]);
      addLog(dieMsg, 'combat');
      setCurrentEvent(null);
    } else {
      setLogMessages(prev => [...prev, choice.results.logText]);
      addLog(choice.results.logText, 'event');

      if (isRescueComplete) {
        const congr = `🎉 营救成功！同伴【${rescuedName}】已安全护送回避难所！他已安顿，可在日志页面查看并为您提供强大的永久加成！`;
        showToast(`成功营救同伴 ${rescuedName}！`, "success");
        addLog(congr, 'system');
        setCurrentEvent(null);
      } else {
        drawEvent();
      }
    }
  };

  const handleRetreat = () => {
    showConfirm({
      title: "安全撤退确认",
      message: "确认折返回避难所吗？这会结束本次探索，带回当前临时背包里的战利品。",
      onConfirm: () => {
        setState(prev => {
          const newInventory = { ...prev.inventory };
          Object.entries(prev.exploration.realityBag).forEach(([item, qty]) => {
            newInventory[item] = Math.max(0, (newInventory[item] || 0) + qty);
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
        showToast("安全撤退，战利品存入储藏箱！", "success");
        addLog("安全折返回避难所，清点战利品入库。", "system");
        setCurrentEvent(null);
      }
    });
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
              const locationName = 
                target.realityLocationId === 'radar_station' ? '废弃雷达站' :
                target.realityLocationId === 'green_ruins' ? '古代温室废墟' :
                target.realityLocationId === 'signal_tower' ? '高频信号塔' :
                target.realityLocationId === 'bio_lab' ? '生化实验室' :
                target.realityLocationId === 'collapsed_subway' ? '坍塌地铁站' :
                target.realityLocationId === 'military_depot' ? '废弃军火库' : '未知废墟';

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
        <div className="space-y-4">
          {/* 探索头部信息 */}
          <div className="flex justify-between items-center p-3 rounded-2xl bg-zinc-900/60 border border-cyan-500/20">
            <span className="text-xs text-zinc-400 font-bold flex items-center gap-1">
              <Compass className="w-4 h-4 text-cyan-400" />
              {exploration.realityLocationId ? (
                <>救援行动步数: <span className="text-white text-sm">{exploration.realitySteps}/5</span> 步</>
              ) : (
                <>废土前行步数: <span className="text-white text-sm">{exploration.realitySteps}</span> 步</>
              )}
            </span>
            <button
              onClick={handleRetreat}
              className="px-3.5 py-1.5 bg-rose-950 border border-rose-500/40 text-rose-300 text-xs font-black rounded-xl hover:bg-rose-900 transition-colors cursor-pointer"
            >
              安全撤退
            </button>
          </div>

          {/* 临时背包 */}
          <div className="p-3 rounded-2xl bg-zinc-900/40 border border-zinc-800 text-xs">
            <h4 className="font-bold text-zinc-400 mb-2 flex items-center gap-1.5 select-none">
              <Package className="w-3.5 h-3.5" /> 临时背囊 (撤退时方带回储藏):
            </h4>
            {Object.keys(exploration.realityBag).length === 0 ? (
              <span className="text-zinc-600 italic">包包空荡，向前滑动卡片搜索物资吧</span>
            ) : (
              <div className="flex flex-wrap gap-2">
                {Object.entries(exploration.realityBag).map(([item, qty]) => {
                  const label = ITEMS_CONFIG[item]?.name || item;
                  const isNegative = qty < 0;
                  return (
                    <span key={item} className={`px-2 py-1 rounded-lg border font-bold select-none ${
                      isNegative 
                        ? 'bg-red-950/20 border-red-500/30 text-red-400' 
                        : 'bg-zinc-950 border-zinc-800 text-zinc-300'
                    }`}>
                      {label} x{qty}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* 遭遇卡牌 - 使用左右滑动交互组件 */}
          {currentEvent && (
            <div className="w-full">
              <SwipeCard
                title={currentEvent.title}
                description={currentEvent.description}
                imageSrc={wildernessCard}
                leftLabel={currentEvent.choices.A.text}
                rightLabel={currentEvent.choices.B.text}
                leftColor="bg-red-500/20"
                rightColor="bg-cyan-500/20"
                onSwipeLeft={() => handleMakeChoice(currentEvent.choices.A)}
                onSwipeRight={() => handleMakeChoice(currentEvent.choices.B)}
              />
            </div>
          )}

          {/* 探索日志 */}
          <div className="p-4 rounded-3xl bg-zinc-950 border border-zinc-900 flex flex-col gap-2 max-h-40 overflow-y-auto">
            <h4 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest text-left">探索无线电日志</h4>
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

export default WildernessTab;
