import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../context/GameContext';
import { EXPEDITION_LOCATIONS } from '../data/expeditionLocations';
import { CROPS_CONFIG } from '../data/crops';
import { ITEMS_CONFIG } from '../data/items';
import { SHELTER_UPGRADES } from '../data/shelterUpgrades';
import { SURVIVORS_CONFIG } from '../data/survivors';
import { useToast } from './ToastSystem';
import {
  Zap,
  Settings,
  ShieldAlert,
  Battery,
  RefreshCw,
  Cpu,
  Sprout,
  Compass,
  User,
  Play,
  LogOut,
  Clock,
  Droplet,
  Sparkles,
  Info,
  Timer
} from 'lucide-react';
import { SmelterCard, AssemblerCard } from './FacilityCard';

const ShelterTab: React.FC = () => {
  const {
    state,
    upgradeShelterStat,
    assignSurvivorJob,
    startExpedition,
    stopExpedition,
    batchWater,
    batchHarvest,
    batchPlant,
    plantCrop,
    waterSlot,
    harvestSlot,
    addLog
  } = useGame();

  const { showToast } = useToast();
  
  // 本地每秒 tick，用于平滑更新远征计时和倒计时
  const [nowTime, setNowTime] = useState(Date.now());

  // 嵌入温室控制需要的状态
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [showSeedSelector, setShowSeedSelector] = useState(false);
  const [flyingRewards, setFlyingRewards] = useState<any[]>([]);

  // 触发飘字特效
  const triggerFlyingRewards = (yields: Record<string, number>, slotId: number) => {
    const rewards: any[] = [];
    let index = 0;
    Object.entries(yields).forEach(([item, qty]) => {
      const itemConfig = ITEMS_CONFIG[item]?.name || item;
      rewards.push({
        id: Date.now() + Math.random(),
        text: `+${qty} ${itemConfig}`,
        slotId,
        offsetY: index * -22 // 避免重叠
      });
      index++;
    });
    setFlyingRewards(prev => [...prev, ...rewards]);
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
        const cropName = CROPS_CONFIG[cropId as keyof typeof CROPS_CONFIG]?.name || cropId;
        addLog(`🌱 培养槽 #${selectedSlotId + 1} 播种了 ${cropName}`, 'logistics');
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
      const itemsStr = Object.entries(rewards)
        .map(([id, qty]) => `${qty}个${ITEMS_CONFIG[id]?.name || id}`)
        .join(', ');
      addLog(`🌾 培养槽 #${slotId + 1} 收割并获得: ${itemsStr}`, 'logistics');
    }
  };
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 状态绑定：温室一键收获并重新播种的选定作物
  const [replantCropId, setReplantCropId] = useState<string>('glow_grass');

  // 状态绑定：挂机远征的选择
  const [selectedExpExplorerId, setSelectedExpExplorerId] = useState<string>('');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('radar_station');

  // 辅助：获取特定物品在背包里的数量
  const getInvQty = (itemId: string) => state.inventory[itemId] || 0;

  // 1. 避难所基建与挂机控制 (Base Upgrades) 属性计算
  const currentBattery = state.shelter.batteryLevel || 1;
  const batteryUpgrade = SHELTER_UPGRADES.battery;
  const nextBatteryCost = batteryUpgrade.costFormula.multiply * (currentBattery + batteryUpgrade.costFormula.offset);
  const currentMaxHours = (state.shelter.maxOfflineDuration / 3600).toFixed(1);
  const nextMaxHours = ((batteryUpgrade.effects[0].baseValue + currentBattery * batteryUpgrade.effects[0].increment) / 3600).toFixed(1);

  const currentGenerator = state.shelter.generatorLevel || 0;
  const genUpgrade = SHELTER_UPGRADES.generator;
  const nextGeneratorCost = genUpgrade.costFormula.multiply * (currentGenerator + genUpgrade.costFormula.offset);
  const currentGenRate = (currentGenerator * 0.005 * 60).toFixed(2);
  const nextGenRate = ((currentGenerator + 1) * 0.005 * 60).toFixed(2);

  const currentRecycler = state.shelter.recyclerLevel || 0;
  const recUpgrade = SHELTER_UPGRADES.recycler;
  const nextRecyclerCost = recUpgrade.costFormula.multiply * (currentRecycler + recUpgrade.costFormula.offset);
  const currentRecRate = (currentRecycler * 0.002 * 60).toFixed(2);
  const nextRecRate = ((currentRecycler + 1) * 0.002 * 60).toFixed(2);

  // 2. 幸存者列表
  const survivorsList = Object.values(state.survivors).filter(s => !s.realityLocationId);
  const meiSurvivor = state.survivors.mei;

  // 一键浇水操作
  const handleBatchWater = () => {
    const wateredCount = batchWater();
    if (wateredCount > 0) {
      addLog(`💦 自动灌溉完成，${wateredCount} 个培养槽已补充水分`, 'logistics');
      showToast(`💦 成功为 ${wateredCount} 个培养槽补充水分！`, 'success');
    } else {
      showToast('培养槽无需灌溉或目前没有作物。', 'info');
    }
  };

  // 一键收获并循环播种
  const handleBatchHarvestAndReplant = () => {
    // 1. 先收割
    const harvestResult = batchHarvest();
    let harvestMsg = '';
    if (harvestResult && Object.keys(harvestResult).length > 0) {
      const itemsStr = Object.entries(harvestResult)
        .map(([id, qty]) => `${qty}个${ITEMS_CONFIG[id]?.name || id}`)
        .join(', ');
      harvestMsg = `收获了 ${itemsStr}。`;
      addLog(`🌾 一键收割完成，${harvestMsg}`, 'logistics');
    }

    // 2. 再播种
    const cropConfig = CROPS_CONFIG[replantCropId as keyof typeof CROPS_CONFIG];
    if (cropConfig) {
      const seedId = Object.keys(cropConfig.seedCost)[0];
      const availableSeeds = getInvQty(seedId);
      const freeSlotsCount = state.greenhouse.slots.filter(s => s.cropId === null).length;

      if (freeSlotsCount === 0 && (!harvestResult || Object.keys(harvestResult).length === 0)) {
        showToast('温室没有可收割的作物，且没有空余槽位！', 'warning');
        return;
      }

      if (availableSeeds <= 0) {
        showToast(`没有可用的 ${ITEMS_CONFIG[seedId]?.name || seedId} 种子进行播种！${harvestResult && Object.keys(harvestResult).length > 0 ? '仅收割完成。' : ''}`, 'warning');
        return;
      }

      const plantSuccess = batchPlant(replantCropId);
      if (plantSuccess) {
        const cropName = ITEMS_CONFIG[seedId]?.name || seedId;
        addLog(`🌱 一键续播完成，已续播 ${cropName}`, 'logistics');
        showToast(`🌱 一键收割并重新播种成功！${harvestMsg}已连播入空余槽位。`, 'success');
      } else {
        showToast(`已完成收割。但重新播种失败，请检查种子数量！`, 'warning');
      }
    }
  };


  // 4. 挂机探索状态与数据计算
  const exp = state.shelter.expedition;
  const currentExplorer = exp.locationId && state.shelter.assignedExplorerId 
    ? state.survivors[state.shelter.assignedExplorerId] 
    : null;
  const expLocation = exp.locationId 
    ? EXPEDITION_LOCATIONS[exp.locationId as keyof typeof EXPEDITION_LOCATIONS] 
    : null;

  // 远征速度与间隔计算
  let expSpeedBonus = 1;
  let expInterval = 300;
  if (currentExplorer) {
    expSpeedBonus = 1 + (currentExplorer.role === 'scout' ? currentExplorer.bonus : 0);
  }
  if (expLocation) {
    expInterval = Math.max(30, Math.floor(expLocation.scavengeInterval / expSpeedBonus));
  }

  // 挂机远征实时计算
  let expElapsedTime = 0;
  let expCountdown = 0;
  if (exp.locationId && exp.startTime) {
    expElapsedTime = Math.floor((nowTime - exp.startTime) / 1000);
    const baseTime = exp.lastScavengeTime || exp.startTime;
    const timePassed = nowTime - baseTime;
    expCountdown = Math.max(0, Math.ceil((expInterval * 1000 - timePassed) / 1000));
  }

  // 开始派遣
  const handleStartExpedition = () => {
    if (!selectedExpExplorerId) {
      showToast('请先指派一名幸存者作为探索员！', 'warning');
      return;
    }
    const loc = EXPEDITION_LOCATIONS[selectedLocationId as keyof typeof EXPEDITION_LOCATIONS];
    if (!loc) return;

    // 检查角色要求
    const explorer = state.survivors[selectedExpExplorerId];
    if (!explorer) {
      showToast('派遣失败！未找到该幸存者。', 'error');
      return;
    }
    // 检查是否已救援（防止绕过 UI 直接调用）
    if (explorer.realityLocationId) {
      showToast(`派遣失败！${explorer.name} 尚未从荒野救回，无法派遣远征。`, 'error');
      return;
    }
    if (loc.requiredRole && explorer.role !== loc.requiredRole) {
      showToast(`派遣失败！该地点需要【${loc.requiredRole === 'scout' ? '侦察兵' : '工程师'}】职业。`, 'error');
      return;
    }

    // 口粮判定
    if (getInvQty('ration') < 1) {
      showToast('压缩口粮不足！请至少携带 1 份压缩口粮以作探索给养。', 'error');
      return;
    }

    const success = startExpedition(selectedExpExplorerId, selectedLocationId);
    if (success) {
      addLog(`🤠 探索员 ${explorer?.name || '幸存者'} 前往 ${loc.name} 开始挂机远征派遣`, 'logistics');
      showToast(`🤠 幸存者 ${explorer?.name} 已带足口粮前往 ${loc.name} 挂机派遣！`, 'success');
    } else {
      showToast('派遣失败，请检查人员状态！', 'error');
    }
  };

  return (
    <div className="space-y-6 pb-20 text-xs">
      {/* 废土资源微型指示器 */}
      <div className="grid grid-cols-4 gap-2 bg-zinc-950/80 border border-zinc-800 p-2.5 rounded-2xl backdrop-blur-md">
        <div className="flex items-center gap-1.5 justify-center py-0.5">
          <span className="text-base">🔧</span>
          <div>
            <div className="text-[10px] text-zinc-500 font-semibold">废旧金属</div>
            <div className="text-zinc-200 font-bold text-xs">{getInvQty('scrap_metal')}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 justify-center py-0.5">
          <span className="text-base">🔩</span>
          <div>
            <div className="text-[10px] text-zinc-500 font-semibold">合金金属板</div>
            <div className="text-zinc-200 font-bold text-xs">{getInvQty('alloy_plate')}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 justify-center py-0.5">
          <span className="text-base">🍱</span>
          <div>
            <div className="text-[10px] text-zinc-500 font-semibold">压缩口粮</div>
            <div className="text-zinc-200 font-bold text-xs">{getInvQty('ration')}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 justify-center py-0.5">
          <span className="text-base">⚡</span>
          <div>
            <div className="text-[10px] text-zinc-500 font-semibold">魔能储备</div>
            <div className="text-cyan-400 font-bold text-xs">{Math.floor(state.player.energy)}/{state.player.maxEnergy}</div>
          </div>
        </div>
      </div>

      {/* 1. 避难所基建与挂机控制 */}
      <section className="bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 border border-zinc-800 rounded-3xl p-4 shadow-lg shadow-black/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl -z-10" />
        <h2 className="text-sm font-bold text-cyan-400 flex items-center gap-2 mb-3 border-b border-zinc-800/80 pb-2">
          <Settings className="w-4 h-4 text-cyan-400 animate-spin-slow" />
          避难所基建与挂机控制 Core Upgrades
        </h2>

        <div className="space-y-3.5">
          {/* 蓄电池升级 */}
          <div className="flex items-center justify-between bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-800 hover:border-zinc-800 transition-all">
            <div className="flex gap-2.5 items-center">
              <div className="w-8 h-8 rounded-lg bg-cyan-950/50 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Battery className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-zinc-200">蓄电池矩阵 (Lv.{currentBattery})</div>
                <div className="text-[10px] text-zinc-400">离线最大挂机续航时间：<span className="text-cyan-400 font-bold">{currentMaxHours}h</span></div>
              </div>
            </div>
            <button
              onClick={() => {
                if (upgradeShelterStat('battery')) {
                  addLog(`🔋 蓄电池矩阵升级至 Lv.${currentBattery + 1}，最大挂机时间延长至 ${nextMaxHours}h`, 'logistics');
                  showToast('🔋 蓄电池矩阵升级成功！最大挂机时间延长。', 'success');
                } else {
                  showToast('废旧金属不足，无法升级！', 'error');
                }
              }}
              disabled={getInvQty('scrap_metal') < nextBatteryCost}
              className={`py-1.5 rounded-xl font-bold transition-all text-[10px] w-[88px] flex-shrink-0 flex flex-col items-center justify-center ${
                getInvQty('scrap_metal') >= nextBatteryCost
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 active:scale-95 cursor-pointer'
                  : 'bg-zinc-800/50 text-zinc-500 border border-zinc-700/50 cursor-not-allowed'
              }`}
            >
              <span>升级 🔧{nextBatteryCost}</span>
              <span className="block text-[9px] font-normal text-zinc-500 mt-0.5">下一级: {nextMaxHours}h</span>
            </button>
          </div>

          {/* 魔导发电机 */}
          <div className="flex items-center justify-between bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-800 hover:border-zinc-800 transition-all">
            <div className="flex gap-2.5 items-center">
              <div className="w-8 h-8 rounded-lg bg-amber-950/50 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-zinc-200">魔能凝结发电机 (Lv.{currentGenerator})</div>
                <div className="text-[10px] text-zinc-400">
                  能量凝结率：
                  <span className={currentGenerator > 0 ? 'text-amber-400 font-bold' : 'text-zinc-500'}>
                    {currentGenerator > 0 ? `${currentGenRate} 能量/分` : '已停机'}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                if (upgradeShelterStat('generator')) {
                  addLog(`⚡ 魔能发电机升级至 Lv.${currentGenerator + 1}，凝结率 ${nextGenRate}/分`, 'logistics');
                  showToast('⚡ 魔能发电机升级成功！能量凝结效率提高。', 'success');
                } else {
                  showToast('废旧金属不足，无法升级！', 'error');
                }
              }}
              disabled={getInvQty('scrap_metal') < nextGeneratorCost}
              className={`py-1.5 rounded-xl font-bold transition-all text-[10px] w-[88px] flex-shrink-0 flex flex-col items-center justify-center ${
                getInvQty('scrap_metal') >= nextGeneratorCost
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 active:scale-95 cursor-pointer'
                  : 'bg-zinc-800/50 text-zinc-500 border border-zinc-700/50 cursor-not-allowed'
              }`}
            >
              <span>升级 🔧{nextGeneratorCost}</span>
              <span className="block text-[9px] font-normal text-zinc-500 mt-0.5">下一级: {nextGenRate}/分</span>
            </button>
          </div>

          {/* 物资回收站 */}
          <div className="flex items-center justify-between bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-800 hover:border-zinc-800 transition-all">
            <div className="flex gap-2.5 items-center">
              <div className="w-8 h-8 rounded-lg bg-emerald-950/50 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <RefreshCw className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <div className="font-bold text-zinc-200">物资自动回收站 (Lv.{currentRecycler})</div>
                <div className="text-[10px] text-zinc-400">
                  废铁提炼率：
                  <span className={currentRecycler > 0 ? 'text-emerald-400 font-bold' : 'text-zinc-500'}>
                    {currentRecycler > 0 ? `${currentRecRate} 废铁/分` : '已停机'}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                if (upgradeShelterStat('recycler')) {
                  addLog(`♻️ 物资回收站升级至 Lv.${currentRecycler + 1}，回收率 ${nextRecRate}/分`, 'logistics');
                  showToast('♻️ 物资回收站升级成功！废弃金属回收速率提升。', 'success');
                } else {
                  showToast('废旧金属不足，无法升级！', 'error');
                }
              }}
              disabled={getInvQty('scrap_metal') < nextRecyclerCost}
              className={`py-1.5 rounded-xl font-bold transition-all text-[10px] w-[88px] flex-shrink-0 flex flex-col items-center justify-center ${
                getInvQty('scrap_metal') >= nextRecyclerCost
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 active:scale-95 cursor-pointer'
                  : 'bg-zinc-800/50 text-zinc-500 border border-zinc-700/50 cursor-not-allowed'
              }`}
            >
              <span>升级 🔧{nextRecyclerCost}</span>
              <span className="block text-[9px] font-normal text-zinc-500 mt-0.5">下一级: {nextRecRate}/分</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. 温室控制中心 */}
      <section className="bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 border border-zinc-800 rounded-3xl p-4 shadow-lg shadow-black/40">
        <h2 className="text-sm font-bold text-emerald-400 flex items-center justify-between mb-3 border-b border-zinc-800/80 pb-2">
          <span className="flex items-center gap-2">
            <Sprout className="w-4 h-4 text-emerald-400" />
            温室控制中心 Greenhouse Station
          </span>
          <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded-lg border border-zinc-800 text-zinc-400 whitespace-nowrap flex-shrink-0">
            自动浇水托管中
          </span>
        </h2>

        {/* 培养槽全功能监视网格 */}
        <div className="grid grid-cols-2 gap-3.5 mb-4">
          {state.greenhouse.slots.map(slot => {
            const crop = slot.cropId ? CROPS_CONFIG[slot.cropId as keyof typeof CROPS_CONFIG] : null;
            const isReady = slot.growthProgress >= 100;
            const isWatered = slot.isWatered || state.shelter.assignedWatererId !== null;

            return (
              <div
                key={slot.id}
                onClick={() => handleSlotClick(slot.id, !!crop)}
                className={`p-3 rounded-2xl border transition-all duration-300 backdrop-blur-md flex flex-col justify-between h-44 relative cursor-pointer ${
                  isReady
                    ? 'bg-emerald-950/20 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                    : crop
                    ? 'bg-zinc-900/60 border-zinc-800'
                    : 'bg-zinc-950/60 border-dashed border-zinc-800 hover:border-purple-500/40'
                }`}
              >
                {/* 飘字特效渲染 */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 pointer-events-none z-30">
                  {flyingRewards
                    .filter(r => r.slotId === slot.id)
                    .map(reward => (
                      <div
                        key={reward.id}
                        className="text-[9px] font-black text-emerald-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] animate-float-up bg-zinc-950/95 px-2 py-0.5 rounded-lg border border-emerald-500/20 flex items-center gap-1 whitespace-nowrap"
                        style={{ transform: `translateY(${reward.offsetY}px)` }}
                      >
                        <Sparkles className="w-3 h-3 text-emerald-400" />
                        {reward.text}
                      </div>
                    ))}
                </div>

                <div>
                  <div className="flex justify-between items-center text-[10px] text-zinc-500 mb-1.5 select-none">
                    <span>槽位 #{slot.id}</span>
                    {isWatered && slot.cropId && (
                      <span className="flex items-center text-blue-400 font-bold gap-0.5 animate-pulse">
                        <Droplet className="w-3 h-3 text-blue-400 fill-blue-400 animate-bounce" /> 湿润
                      </span>
                    )}
                  </div>

                  {crop ? (
                    <div>
                      {/* 作物图像 */}
                      <div className="w-full h-12 rounded-lg overflow-hidden mb-1.5 relative border border-zinc-800/40">
                        <img
                          src={(crop as any).image}
                          alt={crop.name}
                          className="w-full h-full object-cover select-none pointer-events-none"
                          style={{ filter: isReady ? 'saturate(1.3) brightness(1.05)' : 'saturate(0.7) brightness(0.65)' }}
                        />
                        {isReady && (
                          <div className="absolute inset-0 bg-emerald-400/10 animate-pulse rounded-lg" />
                        )}
                      </div>
                      <h3 className="text-[10px] font-bold text-zinc-300 flex items-center gap-1 select-none">
                        <Sprout className="w-3 h-3 text-emerald-400" />
                        {crop.name}
                      </h3>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center mt-3 text-zinc-500 select-none">
                      <Sprout className="w-6 h-6 mb-1 opacity-20" />
                      <span className="text-[10px] font-bold">闲置中</span>
                      <span className="text-[8px] opacity-60">点击开始播种</span>
                    </div>
                  )}
                </div>

                {crop && (
                  <div className="mt-2 shrink-0">
                    {/* 进度条 */}
                    <div className="w-full bg-zinc-950 rounded-full h-1.5 overflow-hidden mb-1.5 border border-zinc-900">
                      <div
                        className={`h-full transition-all duration-1000 ${
                          isReady ? 'bg-emerald-500' : 'bg-purple-500'
                        }`}
                        style={{ width: `${slot.growthProgress}%` }}
                      />
                    </div>
                    
                    {/* 倒计时与动作按钮 */}
                    <div className="flex justify-between items-center text-[10px]">
                      {isReady ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleHarvest(slot.id);
                          }}
                          className="w-full py-1 bg-emerald-500 text-zinc-950 font-extrabold rounded-md hover:bg-emerald-400 active:scale-95 transition-all text-center animate-pulse cursor-pointer"
                        >
                          收割
                        </button>
                      ) : (
                        <>
                          <span className="text-zinc-400 flex items-center gap-1 select-none font-mono text-[9px]">
                            <Timer className="w-3 h-3 text-purple-400" />
                            {slot.growthTimeLeft}s
                          </span>
                          {!slot.isWatered && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const success = waterSlot(slot.id);
                                if (success) {
                                  addLog(`💦 手动为培养槽 #${slot.id + 1} 补充了水分`, 'logistics');
                                }
                              }}
                              className="px-2 py-0.5 bg-blue-950/80 border border-blue-500/30 text-blue-400 rounded-md hover:bg-blue-900 active:scale-95 transition-all cursor-pointer text-[9px]"
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

        {/* 自动浇水托管岗位指派 */}
        <div className="bg-zinc-950 border border-zinc-900 p-3 rounded-2xl mb-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-zinc-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-zinc-400" />
              温室灌溉操作员 (自动浇水岗)
            </span>
            {state.shelter.assignedWatererId ? (
              <span className="text-[9px] px-1.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md font-semibold">
                托管中
              </span>
            ) : (
              <span className="text-[9px] px-1.5 py-0.5 bg-zinc-900 text-zinc-500 border border-zinc-800 rounded-md font-semibold">
                无托管 (生长速度正常)
              </span>
            )}
          </div>

          <div className="flex gap-2 items-center">
            <select
              value={state.shelter.assignedWatererId || ''}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  // 解雇当前浇水工
                  if (state.shelter.assignedWatererId) {
                    const oldName = state.survivors[state.shelter.assignedWatererId]?.name || '幸存者';
                    assignSurvivorJob(state.shelter.assignedWatererId, null);
                    addLog(`🛑 取消了 ${oldName} 在温室自动浇水岗的操作员指派`, 'logistics');
                    showToast('已取消温室浇水托管。', 'info');
                  }
                } else {
                  assignSurvivorJob(val, 'waterer');
                  const name = state.survivors[val]?.name || '幸存者';
                  addLog(`💦 指派 ${name} 负责温室自动浇水`, 'logistics');
                  showToast(`💦 指派 ${name} 负责温室浇水！所有作物获得自动灌溉加成。`, 'success');
                }
              }}
              className="flex-1 bg-zinc-900 border border-zinc-800 text-zinc-300 p-1.5 rounded-xl outline-none focus:border-emerald-500/50"
            >
              <option value="">-- 未指派操作员 --</option>
              {survivorsList.map(s => {
                const isRecommended = s.id === 'mei';
                const statusStr = s.assignedJobId 
                  ? s.assignedJobId === 'waterer' 
                    ? ' (当前岗位)' 
                    : ` (忙碌于: ${s.assignedJobId})` 
                  : ' (空闲)';
                return (
                  <option key={s.id} value={s.id}>
                    {SURVIVORS_CONFIG.find(c => c.id === s.id)?.emoji || '👤'} {s.name} ({s.role === 'farmer' ? '农学家' : s.role === 'engineer' ? '工程师' : '侦察兵'})
                    {isRecommended ? ' ★ 优先推荐' : ''} {statusStr}
                  </option>
                );
              })}
            </select>

            {/* Mei 优先指派一键快捷键 */}
            {meiSurvivor && state.shelter.assignedWatererId !== 'mei' && (
              <button
                onClick={() => {
                  assignSurvivorJob('mei', 'waterer');
                  addLog(`🌾 指派 ${meiSurvivor.name} 负责温室自动浇水`, 'logistics');
                  showToast('🌾 阿梅 (Mei) 已快速就位自动浇水岗位！', 'success');
                }}
                className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 px-2.5 py-1.5 rounded-xl font-bold flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
              >
                优先指派阿梅
              </button>
            )}
          </div>

          <p className="text-[10px] text-zinc-500 leading-relaxed">
            💡 <span className="text-zinc-400">托管效应：</span>指派任意幸存者在岗，温室插槽将自动维持浇水状态（生长速度翻倍），离线也生效。
            {meiSurvivor ? (
              <span className="text-emerald-500/90 font-medium"> 农学家【阿梅】是灌溉的绝佳人选！</span>
            ) : (
              <span className="text-zinc-500">（可在探索中救援阿梅以获得更好支持）</span>
            )}
          </p>
        </div>

        {/* 控制按钮与循环播种配置 */}
        <div className="grid grid-cols-2 gap-3.5 pt-1.5 border-t border-zinc-900">
          <button
            onClick={handleBatchWater}
            className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-sm"
          >
            <Droplet className="w-3.5 h-3.5 text-blue-400" />
            一键手动浇水
          </button>

          <div className="flex flex-col gap-1.5">
            <button
              onClick={handleBatchHarvestAndReplant}
              className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              一键收割并播种
            </button>
            
            {/* 连播选择器 */}
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-zinc-500 shrink-0">连播品种:</span>
              <select
                value={replantCropId}
                onChange={(e) => setReplantCropId(e.target.value)}
                className="flex-1 bg-zinc-950 border border-zinc-900 text-zinc-400 p-1 rounded-lg text-[9px] outline-none"
              >
                {Object.values(CROPS_CONFIG).map(c => {
                  const seedId = Object.keys(c.seedCost)[0];
                  const seedQty = getInvQty(seedId);
                  return (
                    <option key={c.id} value={c.id}>
                      {c.name} (余{seedQty}种子)
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* 3. 工业自动生产流水线 */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-magic-blue flex items-center gap-2 border-b border-zinc-800/80 pb-2">
          <Cpu className="w-4 h-4 text-magic-blue" />
          工业自动生产流水线 Automated Assemblers
        </h2>

        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
          <SmelterCard />
          <AssemblerCard />
        </div>
      </section>

      {/* 4. 挂机探索远征 */}
      <section className="bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 border border-zinc-800 rounded-3xl p-4 shadow-lg shadow-black/40">
        <h2 className="text-sm font-bold text-cyan-400 flex items-center gap-2 mb-3 border-b border-zinc-800/80 pb-2">
          <Compass className="w-4 h-4 text-cyan-400" />
          挂机探索远征 Base Expeditions
        </h2>

        {exp.locationId && currentExplorer && expLocation ? (
          /* 已派遣状态 */
          <div className="space-y-3.5">
            <div className="bg-cyan-950/20 border border-cyan-500/25 p-3.5 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-400/5 rounded-full blur-2xl" />
              
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-cyan-400 font-bold text-xs">🚀 探索员正在荒野派遣中</div>
                  <h3 className="font-extrabold text-zinc-100 text-sm mt-1 flex items-center gap-1.5">
                    {expLocation.name}
                  </h3>
                  <div className="text-[10px] text-zinc-400 mt-0.5">
                    带队幸存者: {SURVIVORS_CONFIG.find(c => c.id === currentExplorer.id)?.emoji || '👤'} <strong className="text-zinc-200 font-bold">{currentExplorer.name}</strong> 
                    <span className="text-cyan-400/90 ml-1">({currentExplorer.role === 'scout' ? '侦察兵 +速' : '无加速'})</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[9px] px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-md font-semibold">
                    挂机进行中
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4 pt-3.5 border-t border-cyan-900/30 text-[10px]">
                <div className="bg-zinc-950/60 p-2 rounded-xl border border-zinc-900/50">
                  <div className="text-zinc-500 font-bold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-zinc-500" />
                    已累积探索时间
                  </div>
                  <div className="text-zinc-200 font-mono font-bold mt-1 text-xs">
                    {(() => {
                      const h = Math.floor(expElapsedTime / 3600);
                      const m = Math.floor((expElapsedTime % 3600) / 60);
                      const s = expElapsedTime % 60;
                      return `${h > 0 ? `${h}时` : ''}${m}分${s}秒`;
                    })()}
                  </div>
                </div>

                <div className="bg-zinc-950/60 p-2 rounded-xl border border-zinc-900/50">
                  <div className="text-zinc-500 font-bold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-cyan-400 animate-spin-slow" />
                    距离下次拾荒结算
                  </div>
                  <div className="text-cyan-400 font-mono font-bold mt-1 text-xs animate-pulse">
                    {expCountdown} 秒
                  </div>
                </div>
              </div>

              {/* 战利品掉落表 */}
              <div className="mt-3.5 text-[9px] text-zinc-500 bg-zinc-950/40 p-2 rounded-xl border border-zinc-900/50">
                <span className="font-bold text-zinc-400 block mb-1">🔍 本地可能获取的废土战利品：</span>
                <div className="flex flex-wrap gap-x-2.5 gap-y-1">
                  {expLocation.lootTable.map(loot => (
                    <span key={loot.itemId} className="text-zinc-400">
                      • {ITEMS_CONFIG[loot.itemId]?.emoji || ''}{ITEMS_CONFIG[loot.itemId]?.name} (几率:{Math.round(loot.chance * 100)}%)
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* 召回操作 */}
            <button
              onClick={() => {
                const explorerName = currentExplorer?.name || '探索员';
                const locName = expLocation?.name || '未知区域';
                if (stopExpedition()) {
                  addLog(`🤠 远征探索员 ${explorerName} 已从 ${locName} 安全召回`, 'logistics');
                  showToast('🤠 远征探索员已成功安全召回，拾荒所得物资已全部存入避难所储藏箱！', 'success');
                } else {
                  showToast('召回失败，请稍后重试！', 'error');
                }
              }}
              className="w-full bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 py-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-md"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              一键召回 / 结算远征收益
            </button>
          </div>
        ) : (
          /* 未派遣状态 - 允许派遣配置 */
          <div className="space-y-4">
            {/* 步骤1：指派探险幸存者 */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-400 font-bold block">1. 指派远征探索员：</label>
              <select
                value={selectedExpExplorerId}
                onChange={(e) => setSelectedExpExplorerId(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 p-2 rounded-xl outline-none text-xs"
              >
                <option value="">-- 选择派遣的幸存者 --</option>
                {survivorsList.map(s => {
                  const statusStr = s.assignedJobId 
                    ? ` (当前忙于: ${s.assignedJobId})` 
                    : ' (空闲在避难所)';
                  return (
                    <option key={s.id} value={s.id}>
                      {SURVIVORS_CONFIG.find(c => c.id === s.id)?.emoji || '👤'} {s.name} ({s.role === 'scout' ? '侦察兵 ★' : s.role === 'engineer' ? '工程师' : '农学家'}) {statusStr}
                    </option>
                  );
                })}
              </select>
              <p className="text-[9px] text-zinc-500">
                💡 侦察兵（如赛罗、巴斯特）擅长荒野行走，指派其探索可提供额外的拾荒频率加成。
              </p>
            </div>

            {/* 步骤2：选择荒野地点 */}
            <div className="space-y-2">
              <label className="text-[10px] text-zinc-400 font-bold block">2. 选择挂机探索地点：</label>
              <div className="grid grid-cols-1 gap-2.5">
                {Object.entries(EXPEDITION_LOCATIONS).map(([key, loc]) => {
                  const isSelected = selectedLocationId === key;
                  const explorer = selectedExpExplorerId ? state.survivors[selectedExpExplorerId] : null;
                  
                  // 职业要求校验
                  const roleUnmatch = loc.requiredRole && explorer && explorer.role !== loc.requiredRole;
                  
                  return (
                    <div
                      key={key}
                      onClick={() => {
                        setSelectedLocationId(key);
                      }}
                      className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-cyan-950/15 border-cyan-500/50 shadow-[0_0_10px_rgba(0,240,255,0.1)]'
                          : 'bg-zinc-950/40 border-zinc-900 hover:border-zinc-800'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-zinc-200 text-xs">{loc.name}</span>
                        {loc.requiredRole && (
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                            roleUnmatch 
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/20' 
                              : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                          }`}>
                            需【{loc.requiredRole === 'scout' ? '侦察兵' : '工程师'}】
                          </span>
                        )}
                      </div>
                      
                      {/* 地点拾荒详情 */}
                      <div className="mt-1.5 text-[9px] text-zinc-500 space-y-0.5">
                        <div>基础提炼时间: {loc.scavengeInterval} 秒/次</div>
                        <div>可能拾得: {loc.lootTable.map(l => ITEMS_CONFIG[l.itemId]?.name).join(', ')}</div>
                      </div>

                      {/* 警告信息 */}
                      {roleUnmatch && (
                        <div className="mt-2 text-[9px] text-rose-500 font-semibold flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3 text-rose-500 animate-bounce" />
                          指派探索员职业不匹配，无法出发！
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 步骤3：探索消耗提示 */}
            <div className="bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-900 text-[10px] space-y-1.5">
              <div className="flex justify-between items-center text-zinc-400">
                <span className="flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-zinc-500" />
                  派遣口粮消耗给养：
                </span>
                <span className={getInvQty('ration') >= 1 ? 'text-emerald-400 font-bold' : 'text-rose-500 font-bold'}>
                  {getInvQty('ration') >= 1 ? '口粮充足' : '口粮不足'} (持有: {getInvQty('ration')}/1)
                </span>
              </div>
              <p className="text-[9px] text-zinc-500 leading-normal">
                荒野深处充满核辐射与变异威胁，探索员出发前必须消耗 1 份压缩口粮用于补给。如果储藏箱口粮不足，将无法开始派遣。
              </p>
            </div>

            {/* 开始派遣按钮 */}
            {(() => {
              const loc = EXPEDITION_LOCATIONS[selectedLocationId as keyof typeof EXPEDITION_LOCATIONS];
              const explorer = selectedExpExplorerId ? state.survivors[selectedExpExplorerId] : null;
              const roleUnmatch = loc?.requiredRole && explorer && explorer.role !== loc.requiredRole;
              const rationShortage = getInvQty('ration') < 1;
              const isDisabled = !selectedExpExplorerId || roleUnmatch || rationShortage;

              return (
                <button
                  onClick={handleStartExpedition}
                  disabled={isDisabled}
                  className={`w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all text-xs ${
                    isDisabled
                      ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
                      : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 cursor-pointer shadow-md'
                  }`}
                >
                  <Play className="w-3.5 h-3.5" />
                  开始挂机远征派遣
                </button>
              );
            })()}
          </div>
        )}
      </section>

      {/* 5. 后勤工作日志 */}
      <section className="bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 border border-zinc-800 rounded-3xl p-4 shadow-lg shadow-black/40">
        <h2 className="text-sm font-bold text-amber-400 flex items-center gap-2 mb-3 border-b border-zinc-800/80 pb-2">
          <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
          后勤工作日志 Logistics Logs
        </h2>
        <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-900/50 max-h-48 overflow-y-auto space-y-2 text-[10px] leading-relaxed">
          {state.logs.filter(log => log.type === 'logistics').length === 0 ? (
            <p className="text-zinc-650 italic text-center py-4">暂无后勤工作日志</p>
          ) : (
            state.logs
              .filter(log => log.type === 'logistics')
              .map(log => (
                <div key={log.id} className="flex gap-2.5 pb-2 border-b border-zinc-900/20 last:border-b-0">
                  <span className="shrink-0 text-amber-400">🔩</span>
                  <div className="flex-1 text-left">
                    <p className="text-zinc-300">{log.text}</p>
                    <span className="text-[8px] text-zinc-600 font-bold block mt-0.5 flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
          )}
        </div>
      </section>

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
            className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl animate-fade-in flex flex-col max-h-[75vh]"
          >
            <div className="flex justify-between items-center mb-4 shrink-0">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sprout className="w-4 h-4 text-purple-400" /> 选择种植作物
              </h3>
              <button
                onClick={() => {
                  setShowSeedSelector(false);
                  setSelectedSlotId(null);
                }}
                className="text-zinc-500 hover:text-white cursor-pointer w-7 h-7 flex items-center justify-center rounded-full hover:bg-zinc-800 transition-colors text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 overflow-y-auto pr-1 flex-1 pt-1 pb-1">
              {Object.values(CROPS_CONFIG).map(crop => {
                const seedId = Object.keys(crop.seedCost)[0];
                const seedCount = state.inventory[seedId] || 0;

                return (
                  <div
                    key={crop.id}
                    onClick={() => seedCount > 0 && handlePlant(crop.id)}
                    className={`p-2.5 rounded-xl border flex justify-between items-center transition-all ${
                      seedCount > 0
                        ? 'bg-zinc-950 border-zinc-800 hover:border-purple-500 cursor-pointer'
                        : 'bg-zinc-950/40 border-zinc-900 opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <div>
                      <h4 className="font-bold text-xs text-white">{crop.name}</h4>
                      <p className="text-[9px] text-zinc-500 mt-0.5 line-clamp-1">{crop.description}</p>
                      <span className="inline-block mt-1 text-[8px] text-purple-400 bg-purple-950/40 px-1.5 py-0.2 rounded">
                        生长时间: {crop.growthTime}s
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-bold text-zinc-400">
                        种子: <span className={seedCount > 0 ? 'text-white font-mono' : 'text-rose-500 font-mono'}>{seedCount}</span>
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

export default ShelterTab;
