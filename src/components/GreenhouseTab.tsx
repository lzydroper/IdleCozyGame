import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useGame, CROPS_CONFIG } from '../context/GameContext';
import { ITEMS_CONFIG } from '../data/items';
import { useToast } from './ToastSystem';
import { Sprout, Droplet, Sparkles, Timer } from 'lucide-react';

interface FlyingReward {
  id: number;
  text: string;
  slotId: number;
  offsetY: number;
}

const GreenhouseTab: React.FC = () => {
  const { state, plantCrop, waterSlot, harvestSlot, batchHarvest, batchPlant } = useGame();
  const { showToast } = useToast();
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [showSeedSelector, setShowSeedSelector] = useState(false);
  const [flyingRewards, setFlyingRewards] = useState<FlyingReward[]>([]);

  // 触发飘字特效
  const triggerFlyingRewards = (yields: Record<string, number>, slotId: number) => {
    const rewards: FlyingReward[] = [];
    let index = 0;

    Object.entries(yields).forEach(([item, qty]) => {
      const itemConfig = ITEMS_CONFIG[item]?.name || item;

      rewards.push({
        id: Date.now() + Math.random(),
        text: `+${qty} ${itemConfig}`,
        slotId,
        offsetY: index * -22 // 垂直方向微调偏移，避免重叠
      });
      index++;
    });

    setFlyingRewards(prev => [...prev, ...rewards]);

    // 1.5秒后自动移除飘字
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
        showToast("作物已播种入培养槽！", "success");
        setShowSeedSelector(false);
        setSelectedSlotId(null);
      } else {
        showToast("种子不足或槽位非空！", "error");
      }
    }
  };

  const handleHarvest = (slotId: number) => {
    const rewards = harvestSlot(slotId);
    if (rewards) {
      triggerFlyingRewards(rewards, slotId);
    }
  };

  const handleBatchHarvest = () => {
    // 找出所有准备好的已成熟槽位，用于在各自的卡牌上触发飘字特效
    const readySlots = state.greenhouse.slots.filter(s => s.cropId !== null && s.growthProgress >= 100);
    if (readySlots.length === 0) {
      showToast("没有成熟的作物可以收割！", "warning");
      return;
    }

    const rewards = batchHarvest();
    if (rewards) {
      readySlots.forEach(slot => {
        const crop = slot.cropId ? CROPS_CONFIG[slot.cropId as keyof typeof CROPS_CONFIG] : null;
        if (crop) {
          triggerFlyingRewards(crop.yields, slot.id);
        }
      });
      showToast("一键收割成功！收获的物资已收入避难所储藏箱。", "success");
    }
  };

  const handleBatchPlant = (cropId: string) => {
    const success = batchPlant(cropId);
    if (success) {
      showToast("温室已连播作物！", "success");
    } else {
      showToast("无可用的种子或空闲槽位！", "error");
    }
  };

  const handleWaterAll = () => {
    let wateredCount = 0;
    state.greenhouse.slots.forEach(slot => {
      if (slot.cropId !== null && !slot.isWatered) {
        const ok = waterSlot(slot.id);
        if (ok) wateredCount++;
      }
    });
    if (wateredCount > 0) {
      showToast(`已成功为 ${wateredCount} 个培养槽补充水分。`, "info");
    } else {
      showToast("没有需要浇水或能量不足的作物！", "warning");
    }
  };

  return (
    <div className="relative w-full pb-20">
      {/* 控制中心 */}
      <div className="relative mb-8 p-5 rounded-3xl bg-zinc-950/40 border border-zinc-800/60 backdrop-blur-xl shadow-2xl overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-emerald-500/5 pointer-events-none" />
        <div className="absolute -inset-[100%] animate-[spin_10s_linear_infinite] bg-gradient-to-r from-transparent via-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-700" />
        
        <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-emerald-400 mb-4 flex items-center gap-2 relative z-10">
          <Sparkles className="w-5 h-5 text-purple-400" /> 魔导温室控制台
        </h2>
        <div className="flex flex-wrap gap-3 justify-start relative z-10">
          <button
            onClick={handleBatchHarvest}
            className="flex-1 min-w-[120px] px-4 py-3 bg-gradient-to-r from-emerald-600/90 to-emerald-500/90 hover:from-emerald-500 hover:to-emerald-400 active:scale-95 text-white font-black rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer border border-emerald-400/30"
          >
            <Sparkles className="w-4 h-4" /> 一键收割
          </button>
          
          <button
            onClick={handleWaterAll}
            className="flex-1 min-w-[120px] px-4 py-3 bg-gradient-to-r from-blue-600/90 to-cyan-500/90 hover:from-blue-500 hover:to-cyan-400 active:scale-95 text-white font-black rounded-2xl shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer border border-blue-400/30"
          >
            <Droplet className="w-4 h-4" /> 灌溉系统
          </button>

          <button
            onClick={() => handleBatchPlant('glow_grass')}
            disabled={(state.inventory.seed_glow_grass || 0) <= 0}
            className="flex-1 min-w-[140px] px-4 py-3 bg-zinc-900/80 hover:bg-zinc-800 border border-purple-500/40 disabled:opacity-30 disabled:border-zinc-800 disabled:pointer-events-none active:scale-95 text-purple-300 font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
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
              className={`p-4 rounded-3xl border transition-all duration-300 backdrop-blur-md flex flex-col justify-between h-56 relative cursor-pointer ${
                isReady
                  ? 'bg-emerald-950/30 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                  : crop
                  ? 'bg-zinc-900/40 border-zinc-800'
                  : 'bg-zinc-950/40 border-dashed border-zinc-850 hover:border-purple-500/40'
              }`}
            >
              {/* 本地飘字特效层 */}
              <div className="absolute inset-x-0 top-1/4 flex flex-col items-center justify-center gap-1.5 pointer-events-none z-30">
                {flyingRewards
                  .filter(r => r.slotId === slot.id)
                  .map(reward => (
                    <div
                      key={reward.id}
                      className="text-[10px] font-black text-emerald-400 drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.95)] animate-float-up bg-zinc-950/90 px-2 py-1 rounded-xl border border-emerald-500/20 flex items-center gap-1 whitespace-nowrap"
                      style={{
                        transform: `translateY(${reward.offsetY}px)`
                      }}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      {reward.text}
                    </div>
                  ))}
              </div>

              <div>
                <div className="flex justify-between items-center text-xs text-zinc-500 mb-2 select-none">
                  <span>培养槽 #{slot.id}</span>
                  {slot.isWatered && (
                    <span className="flex items-center text-blue-400 font-semibold gap-0.5 animate-pulse">
                      <Droplet className="w-3.5 h-3.5 animate-bounce" /> 湿润
                    </span>
                  )}
                </div>

                {crop ? (
                  <div>
                    {/* 作物图像 */}
                    <div className="w-full h-16 rounded-xl overflow-hidden mb-2 relative">
                      <img
                        src={(crop as typeof crop & { image?: string }).image}
                        alt={crop.name}
                        className="w-full h-full object-cover select-none pointer-events-none"
                        style={{ filter: isReady ? 'saturate(1.4) brightness(1.1)' : 'saturate(0.8) brightness(0.7)' }}
                      />
                      {isReady && (
                        <div className="absolute inset-0 bg-emerald-400/10 animate-pulse rounded-xl" />
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5 select-none">
                      <Sprout className="w-3.5 h-3.5 text-emerald-400" />
                      {crop.name}
                    </h3>
                    <p className="text-[10px] text-zinc-500 line-clamp-1 mt-0.5 select-none">{crop.description}</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center mt-6 text-zinc-600 select-none">
                    <Sprout className="w-8 h-8 mb-1 opacity-20" />
                    <span className="text-sm font-semibold">闲置中</span>
                    <span className="text-[10px] opacity-60">点击开始播种</span>
                  </div>
                )}
              </div>

              {crop && (
                <div className="mt-4">
                  {/* 进度条 */}
                  <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden mb-2 border border-zinc-900/50">
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
                        className="w-full py-1.5 bg-emerald-500 text-zinc-950 font-extrabold rounded-lg hover:bg-emerald-400 active:scale-95 transition-all text-center animate-pulse cursor-pointer"
                      >
                        收割
                      </button>
                    ) : (
                      <>
                        <span className="text-zinc-400 flex items-center gap-1 select-none">
                          <Timer className="w-3.5 h-3.5 text-purple-400" />
                          {slot.growthTimeLeft}秒
                        </span>
                        {!slot.isWatered && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              waterSlot(slot.id);
                            }}
                            className="px-2.5 py-1 bg-blue-950/80 border border-blue-500/30 text-blue-400 rounded-lg hover:bg-blue-900 active:scale-95 transition-all cursor-pointer"
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
      {showSeedSelector && typeof document !== 'undefined' && createPortal(
        <div
          onClick={() => {
            setShowSeedSelector(false);
            setSelectedSlotId(null);
          }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl animate-fade-in flex flex-col max-h-[80vh]"
          >
            <div className="flex justify-between items-center mb-4 shrink-0">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sprout className="w-5 h-5 text-purple-400" /> 选择种植作物
              </h3>
              <button
                onClick={() => {
                  setShowSeedSelector(false);
                  setSelectedSlotId(null);
                }}
                className="text-zinc-500 hover:text-white cursor-pointer w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-800/50 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto pr-1 flex-1 pt-2 pb-2">
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
                        生长时间: {crop.growthTime}秒
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
        </div>,
        document.body
      )}
    </div>
  );
};

export default GreenhouseTab;
