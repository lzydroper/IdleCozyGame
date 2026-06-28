import React, { useState } from 'react';
import { useGame, CROPS_CONFIG } from '../context/GameContext';
import { Sprout, Droplet, Sparkles, Timer } from 'lucide-react';

interface FlyingReward {
  id: number;
  text: string;
  x: number;
  y: number;
}

const GreenhouseTab: React.FC = () => {
  const { state, plantCrop, waterSlot, harvestSlot, batchHarvest, batchPlant } = useGame();
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [showSeedSelector, setShowSeedSelector] = useState(false);
  const [flyingRewards, setFlyingRewards] = useState<FlyingReward[]>([]);
  const [rewardCounter, setRewardCounter] = useState(0);

  // 触发飘字特效
  const triggerFlyingRewards = (yields: Record<string, number>, count: number) => {
    const rewards: FlyingReward[] = [];
    let idAccumulator = rewardCounter;

    Object.entries(yields).forEach(([item, qty]) => {
      const itemConfig = {
        glow_fiber: "荧光草纤维",
        mana_dust: "魔能之尘",
        aether_pulp: "以太果肉",
        dream_shard: "梦境碎片",
        steel_petal: "钢纹花瓣",
        alloy_plate: "合金金属板"
      }[item] || item;

      // 生成几个随机偏移的飘字
      for (let i = 0; i < count; i++) {
        rewards.push({
          id: idAccumulator++,
          text: `+${qty} ${itemConfig}`,
          x: 40 + Math.random() * 20, // 屏幕中心附近百分比
          y: 35 + Math.random() * 20
        });
      }
    });

    setRewardCounter(idAccumulator);
    setFlyingRewards(prev => [...prev, ...rewards]);

    // 1.5秒后移除飘字
    setTimeout(() => {
      setFlyingRewards(prev => prev.filter(r => !rewards.some(nr => nr.id === r.id)));
    }, 1500);
  };

  const handleSlotClick = (slotId: number, hasCrop: boolean) => {
    if (!hasCrop) {
      setSelectedSlotId(slotId);
      setShowSeedSelector(true);
    }
  };

  const handlePlant = (cropId: string) => {
    if (selectedSlotId !== null) {
      const success = plantCrop(selectedSlotId, cropId);
      if (success) {
        setShowSeedSelector(false);
        setSelectedSlotId(null);
      } else {
        alert("种子不足或槽位非空！");
      }
    }
  };

  const handleHarvest = (slotId: number) => {
    const rewards = harvestSlot(slotId);
    if (rewards) {
      triggerFlyingRewards(rewards, 1);
    }
  };

  const handleBatchHarvest = () => {
    const rewards = batchHarvest();
    if (rewards) {
      triggerFlyingRewards(rewards, 1);
    }
  };

  const handleBatchPlant = (cropId: string) => {
    const success = batchPlant(cropId);
    if (!success) {
      alert("无可用的种子或空闲槽位！");
    }
  };

  const handleWaterAll = () => {
    state.greenhouse.slots.forEach(slot => {
      if (slot.cropId !== null && !slot.isWatered) {
        waterSlot(slot.id);
      }
    });
  };

  return (
    <div className="relative w-full pb-20">
      {/* 飘字特效容器 */}
      {flyingRewards.map(reward => (
        <div
          key={reward.id}
          className="fixed pointer-events-none z-50 text-xl font-bold text-emerald-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] animate-float-up"
          style={{
            left: `${reward.x}%`,
            top: `${reward.y}%`,
          }}
        >
          <span className="flex items-center gap-1">
            <Sparkles className="w-5 h-5 text-emerald-400 inline" />
            {reward.text}
          </span>
        </div>
      ))}

      {/* 控制中心 */}
      <div className="mb-6 p-4 rounded-2xl bg-zinc-900/60 border border-purple-500/20 backdrop-blur-md">
        <h2 className="text-lg font-bold text-purple-400 mb-3 flex items-center gap-2">
          <Sparkles className="w-5 h-5" /> 魔导温室控制台
        </h2>
        <div className="flex flex-wrap gap-2 justify-center">
          <button
            onClick={handleBatchHarvest}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold rounded-xl shadow-lg shadow-emerald-950/40 transition-all flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" /> 一键收割
          </button>
          
          <button
            onClick={handleWaterAll}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold rounded-xl shadow-lg transition-all flex items-center gap-2"
          >
            <Droplet className="w-4 h-4" /> 一键浇水 (耗能)
          </button>

          <button
            onClick={() => handleBatchPlant('glow_grass')}
            disabled={(state.inventory.seed_glow_grass || 0) <= 0}
            className="px-4 py-2 bg-purple-900/50 hover:bg-purple-900 border border-purple-500/30 disabled:opacity-40 disabled:pointer-events-none active:scale-95 text-purple-300 font-bold rounded-xl transition-all flex items-center gap-2"
          >
            <Sprout className="w-4 h-4" /> 连播荧光草
          </button>
        </div>
      </div>

      {/* 温室培养槽网格 */}
      <div className="grid grid-cols-2 gap-4">
        {state.greenhouse.slots.map(slot => {
          const crop = slot.cropId ? CROPS_CONFIG[slot.cropId as keyof typeof CROPS_CONFIG] : null;
          const isReady = slot.growthProgress >= 100;

          return (
            <div
              key={slot.id}
              onClick={() => handleSlotClick(slot.id, !!crop)}
              className={`p-4 rounded-3xl border transition-all duration-300 backdrop-blur-md flex flex-col justify-between h-48 cursor-pointer ${
                isReady
                  ? 'bg-emerald-950/30 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                  : crop
                  ? 'bg-zinc-900/40 border-zinc-800'
                  : 'bg-zinc-950/40 border-dashed border-zinc-800 hover:border-purple-500/40'
              }`}
            >
              <div>
                <div className="flex justify-between items-center text-xs text-zinc-500 mb-2">
                  <span>培养槽 #{slot.id}</span>
                  {slot.isWatered && (
                    <span className="flex items-center text-blue-400 font-semibold gap-0.5">
                      <Droplet className="w-3.5 h-3.5" /> 湿润
                    </span>
                  )}
                </div>

                {crop ? (
                  <div>
                    {/* AI 生成的作物图像 */}
                    <div className="w-full h-16 rounded-xl overflow-hidden mb-2 relative">
                      <img
                        src={(crop as typeof crop & { image?: string }).image}
                        alt={crop.name}
                        className="w-full h-full object-cover"
                        style={{ filter: isReady ? 'saturate(1.4) brightness(1.1)' : 'saturate(0.8) brightness(0.7)' }}
                      />
                      {isReady && (
                        <div className="absolute inset-0 bg-emerald-400/10 animate-pulse rounded-xl" />
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Sprout className="w-3.5 h-3.5 text-emerald-400" />
                      {crop.name}
                    </h3>
                    <p className="text-[10px] text-zinc-500 line-clamp-1 mt-0.5">{crop.description}</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center mt-6 text-zinc-600">
                    <Sprout className="w-8 h-8 mb-1 opacity-20" />
                    <span className="text-sm font-semibold">闲置中</span>
                    <span className="text-[10px] opacity-60">点击开始播种</span>
                  </div>
                )}
              </div>

              {crop && (
                <div className="mt-4">
                  {/* 进度条 */}
                  <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden mb-2">
                    <div
                      className={`h-full transition-all duration-1000 ${
                        isReady ? 'bg-emerald-500' : 'bg-purple-500'
                      }`}
                      style={{ width: `${slot.growthProgress}%` }}
                    />
                  </div>
                  
                  {/* 倒计时与按钮 */}
                  <div className="flex justify-between items-center text-xs">
                    {isReady ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleHarvest(slot.id);
                        }}
                        className="w-full py-1.5 bg-emerald-500 text-zinc-950 font-extrabold rounded-lg hover:bg-emerald-400 active:scale-95 transition-all text-center animate-pulse"
                      >
                        收割
                      </button>
                    ) : (
                      <>
                        <span className="text-zinc-400 flex items-center gap-1">
                          <Timer className="w-3.5 h-3.5 text-purple-400" />
                          {slot.growthTimeLeft}秒
                        </span>
                        {!slot.isWatered && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              waterSlot(slot.id);
                            }}
                            className="px-2.5 py-1 bg-blue-950/80 border border-blue-500/30 text-blue-400 rounded-lg hover:bg-blue-900 active:scale-95 transition-all"
                          >
                            浇水
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 播种选择模态框 */}
      {showSeedSelector && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl animate-fade-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sprout className="w-5 h-5 text-purple-400" /> 选择种植作物
              </h3>
              <button
                onClick={() => {
                  setShowSeedSelector(false);
                  setSelectedSlotId(null);
                }}
                className="text-zinc-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {Object.values(CROPS_CONFIG).map(crop => {
                const seedId = Object.keys(crop.seedCost)[0];
                const seedCount = state.inventory[seedId] || 0;

                return (
                  <div
                    key={crop.id}
                    onClick={() => seedCount > 0 && handlePlant(crop.id)}
                    className={`p-3 rounded-2xl border flex justify-between items-center transition-all ${
                      seedCount > 0
                        ? 'bg-zinc-950 border-zinc-800 hover:border-purple-500 cursor-pointer'
                        : 'bg-zinc-950/40 border-zinc-900 opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <div>
                      <h4 className="font-bold text-sm text-white">{crop.name}</h4>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{crop.description}</p>
                      <span className="inline-block mt-2 text-[10px] text-purple-400 bg-purple-950/40 px-2 py-0.5 rounded-md">
                        生长时长: {crop.growthTime}秒
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-zinc-400">
                        持有种子: <span className={seedCount > 0 ? 'text-white' : 'text-rose-500'}>{seedCount}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GreenhouseTab;
