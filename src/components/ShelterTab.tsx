import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '../context/GameContext';
import { EXPEDITION_LOCATIONS } from '../data/expeditionLocations';
import { CROPS_CONFIG } from '../data/crops';
import { ITEMS_CONFIG } from '../data/items';
import { SHELTER_UPGRADES } from '../data/shelterUpgrades';
import { HEROES_CONFIG, HERO_CLASS_LABELS, HERO_FACTION_LABELS } from '../data/heroes';
import { useToast } from './ToastSystem';
import GameIcon from './GameIcon';
import ShelterTabBar from './shelter/ShelterTabBar';
import DutyAssignModal from './DutyAssignModal';
import type { ShelterTabId } from './shelter/constants';
import {
  Settings,
  ShieldAlert,
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
  Timer,
  Rocket,
  Search,
  X
} from 'lucide-react';
import { SmelterCard, AssemblerCard } from './FacilityCard';
import DreamLeakAlertPanel from './DreamLeakAlertPanel';


interface FlyingReward {
  id: number;
  text: string;
  slotId: number;
  offsetY: number;
}

// 基建升级配色：全站统一一套 cyan 主题（ADR-0018 后不再按升级项区分）
const UPGRADE_THEME: { iconBg: string; iconBorder: string; buttonClass: (isMax: boolean, canAfford: boolean) => string } = {
  iconBg: 'bg-cyan-950/50',
  iconBorder: 'border-cyan-500/30',
  buttonClass: (isMax, canAfford) => isMax ? 'bg-zinc-800/30 text-zinc-600 border border-zinc-800/50 cursor-default'
    : canAfford ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 active:scale-95 cursor-pointer'
    : 'bg-zinc-800/50 text-zinc-500 border border-zinc-700/50 cursor-not-allowed'
};

const ShelterTab: React.FC = () => {
  const {
    state,
    upgradeShelterStat,
    assignHeroToDuty,
    batchWater,
    batchHarvestAndReplant,
    plantCrop,
    waterSlot,
    harvestSlot,
    addLog
  } = useGame();

  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<ShelterTabId>('base');

  // 本地每秒 tick，用于平滑更新远征计时和倒计时
  const [nowTime, setNowTime] = useState(Date.now());

  // 嵌入温室控制需要的状态
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);
  const [showSeedSelector, setShowSeedSelector] = useState(false);
  const [showWatererPicker, setShowWatererPicker] = useState(false);
  const [showExplorerPicker, setShowExplorerPicker] = useState(false);
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
        addLog(`培养槽 #${selectedSlotId + 1} 播种了 ${cropName}`, 'logistics');
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
      addLog(`培养槽 #${slotId + 1} 收割并获得: ${itemsStr}`, 'logistics');
    }
  };
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 状态绑定：温室一键收获并重新播种的选定作物
  const [replantCropId, setReplantCropId] = useState<string>(Object.keys(CROPS_CONFIG)[0] || 'glow_grass');

  // 状态绑定：挂机远征的选择
  const [selectedExpExplorerId, setSelectedExpExplorerId] = useState<string>('');
  const [selectedLocationId, setSelectedLocationId] = useState<string>(Object.keys(EXPEDITION_LOCATIONS)[0] || 'radar_station');

  // 辅助：获取特定物品在背包里的数量
  const getInvQty = (itemId: string) => state.inventory[itemId] || 0;

  // 1. 避难所基建与挂机控制 (Base Upgrades) 属性计算
  const getUpgradeLevel = (id: string) => {
    if (id === 'battery') return state.shelter.batteryLevel || 1;
    if (id === 'generator') return state.shelter.generatorLevel || 0;
    if (id === 'recycler') return state.shelter.recyclerLevel || 0;
    return 0; // 未知升级类型，默认 0
  };

  // 2. 英雄的职阶/阵营（ADR-0018：远征门槛迁移为 heroClass/faction）
  const getHeroClassLabel = (heroId: string): string =>
    HEROES_CONFIG[heroId] ? HERO_CLASS_LABELS[HEROES_CONFIG[heroId].heroClass] : '';
  const getHeroFactionLabel = (heroId: string): string =>
    HEROES_CONFIG[heroId] ? HERO_FACTION_LABELS[HEROES_CONFIG[heroId].faction] : '';

  // 英雄显示名（heroes 状态无 name，从配置读取）
  const getHeroName = (heroId: string): string =>
    HEROES_CONFIG[heroId]?.name || heroId;

  // 一键浇水操作
  const handleBatchWater = () => {
    const wateredCount = batchWater();
    if (wateredCount > 0) {
      addLog(`自动灌溉完成，${wateredCount} 个培养槽已补充水分`, 'logistics');
      showToast(`成功为 ${wateredCount} 个培养槽补充水分！`, 'success');
    } else {
      showToast('培养槽无需灌溉或目前没有作物。', 'info');
    }
  };

  // 一键收获并循环播种
  const handleBatchHarvestAndReplant = () => {
    const { harvested, replantedCount } = batchHarvestAndReplant(replantCropId);
    
    const hasHarvested = harvested && Object.keys(harvested).length > 0;
    if (!hasHarvested && replantedCount === 0) {
      showToast('温室没有可收割的作物，且没有空余槽位！', 'warning');
      return;
    }

    let harvestMsg = '';
    if (hasHarvested) {
      const itemsStr = Object.entries(harvested)
        .map(([id, qty]) => `${qty}个${ITEMS_CONFIG[id]?.name || id}`)
        .join(', ');
      harvestMsg = `收获了 ${itemsStr}。`;
      addLog(`一键收割完成，${harvestMsg}`, 'logistics');
    }

    const cropConfig = CROPS_CONFIG[replantCropId as keyof typeof CROPS_CONFIG];
    const seedId = cropConfig ? Object.keys(cropConfig.seedCost)[0] : '';
    const seedName = ITEMS_CONFIG[seedId]?.name || seedId;

    if (replantedCount > 0) {
      addLog(`一键续播完成，已续播 ${seedName}`, 'logistics');
      showToast(`一键收割并重新播种成功！${harvestMsg}已续播 ${replantedCount} 个槽位。`, 'success');
    } else {
      if (hasHarvested) {
        showToast(`收获完成！${harvestMsg}但未播种（种子不足或无空余槽位）。`, 'warning');
      } else {
        showToast(`无法播种，请检查种子数量！`, 'warning');
      }
    }
  };


  // 4. 挂机探索状态与数据计算
  const exp = state.shelter.expedition;
  const currentExplorer = exp.locationId && state.shelter.assignedExplorerId 
    ? state.heroes[state.shelter.assignedExplorerId] 
    : null;
  const expLocation = exp.locationId 
    ? EXPEDITION_LOCATIONS[exp.locationId as keyof typeof EXPEDITION_LOCATIONS] 
    : null;

  // 远征速度与间隔计算（角色效率加成已随被动系统退役，仅由地点配置决定）
  const expInterval = expLocation ? Math.max(30, Math.floor(expLocation.scavengeInterval)) : 300;

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
      showToast('请先指派一名英雄作为探索员！', 'warning');
      return;
    }
    const loc = EXPEDITION_LOCATIONS[selectedLocationId as keyof typeof EXPEDITION_LOCATIONS];
    if (!loc) return;

    // 检查英雄是否已获得（heroes 中仅含已获得的英雄，ADR-0013）
    const explorer = state.heroes[selectedExpExplorerId];
    if (!explorer) {
      showToast('派遣失败！未找到该英雄。', 'error');
      return;
    }
    // 远征门槛校验已内化到 assignHeroToDuty（ADR-0018），UI 仅做视觉提示

    const success = assignHeroToDuty(selectedExpExplorerId, { type: 'explorer', targetId: selectedLocationId });
    if (success) {
      addLog(`探索员 ${getHeroName(selectedExpExplorerId) || '英雄'} 前往 ${loc.name} 开始挂机远征派遣`, 'logistics');
      showToast(`英雄 ${getHeroName(selectedExpExplorerId)} 已带足口粮前往 ${loc.name} 挂机派遣！`, 'success');
    } else {
      showToast('派遣失败，请检查人员状态！', 'error');
    }
  };

  // 状态计数：温室可收割数 / 产线队列数 / 远征进行中
  const harvestableCount = state.greenhouse.slots.filter(s => s.cropId && s.growthProgress >= 100).length;
  const facilityQueueCount = Object.values(state.shelter.facilities).flat().reduce((sum, f) => sum + (f.queue?.length ?? 0), 0);
  const expeditionBadge = exp.locationId ? '进行中' : null;
  const tabCounts: Record<ShelterTabId, string | null> = {
    base: null,
    greenhouse: harvestableCount > 0 ? String(harvestableCount) : null,
    facility: facilityQueueCount > 0 ? String(facilityQueueCount) : null,
    expedition: expeditionBadge,
  };

  return (
    <div className="space-y-4 pb-20 text-xs">
      {/* 梦魇入侵警报控制台（常驻顶部） */}
      <DreamLeakAlertPanel />

      {/* 分 tab 导航 */}
      <ShelterTabBar active={activeTab} onChange={setActiveTab} counts={tabCounts} />

      {/* 基建 tab */}
      {activeTab === 'base' && (
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-cyan-400 flex items-center gap-2 border-b border-zinc-800/80 pb-2">
          <Settings className="w-4 h-4 text-cyan-400" />
          避难所基建 Core Upgrades
        </h2>

        <div className="space-y-3">
          {Object.values(SHELTER_UPGRADES)
            .filter((upg) => upg.category === 'base')
            .filter((upg) => {
              if (!upg.unlockRequirements) return true;
              return upg.unlockRequirements.every(req => {
                if (req.type === 'upgrade_level') {
                  const upgLevel = req.id === 'battery' ? state.shelter.batteryLevel : req.id === 'generator' ? state.shelter.generatorLevel : req.id === 'recycler' ? state.shelter.recyclerLevel : 0;
                  return upgLevel >= req.minValue;
                } else {
                  return (state.inventory[req.id] || 0) >= req.minValue;
                }
              });
            })
            .map((upgrade) => {
              const currentLevel = getUpgradeLevel(upgrade.id);
              const isMax = currentLevel >= upgrade.maxLevel;
              const currentConfig = upgrade.levels.find((l) => l.level === currentLevel);
              const nextConfig = upgrade.levels.find((l) => l.level === currentLevel + 1);
              const canAfford = nextConfig ? Object.entries(nextConfig.cost).every(([item, qty]) => getInvQty(item) >= qty) : false;

              return (
                <div key={upgrade.id} className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900/95 to-zinc-950 shadow-xl shadow-black/50">
                  <div className="h-0.5 w-full bg-cyan-500/30" />
                  <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg ${UPGRADE_THEME.iconBg} border ${UPGRADE_THEME.iconBorder} flex items-center justify-center`}>
                        <GameIcon type="upgrade" id={upgrade.id} className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                          {upgrade.name}
                          <span className="text-[9px] font-mono text-cyan-400 bg-white/5 px-1 py-0.5 rounded">Lv.{currentLevel}</span>
                        </div>
                        <div className="text-[9px] text-zinc-500">
                          {upgrade.effectLabel}：<span className={currentLevel > 0 ? 'text-zinc-200 font-bold' : 'text-zinc-500'}>{currentConfig ? currentConfig.effectText : '已停机'}</span>
                        </div>
                      </div>
                    </div>
                  <button
                    onClick={() => {
                      if (isMax) return;
                      if (upgradeShelterStat(upgrade.id as 'battery' | 'generator' | 'recycler')) {
                        addLog(`${upgrade.name} 升级至 Lv.${currentLevel + 1}`, 'logistics');
                        showToast(`${upgrade.name} 升级成功！`, 'success');
                      } else {
                        showToast('所需资源不足，无法升级！', 'error');
                      }
                    }}
                    disabled={isMax || !canAfford}
                    className={`py-1.5 rounded-xl font-bold transition-all text-[10px] w-[88px] flex-shrink-0 flex flex-col items-center justify-center ${UPGRADE_THEME.buttonClass(isMax, canAfford)}`}
                  >
                    {isMax ? (
                      <>
                        <span className="font-extrabold text-[11px] text-zinc-500">已满级</span>
                        <span className="block text-[8px] font-normal text-zinc-600 mt-0.5">MAX</span>
                      </>
                    ) : (
                      <span className="font-extrabold text-[11px]">升级</span>
                    )}
                  </button>
                  </div>
                  <div className="text-[10px] text-zinc-400 bg-zinc-950/40 p-2 rounded-xl border border-zinc-900/50">
                    <div className="flex justify-between"><span>当前效果</span><span className="text-zinc-200 font-bold">{currentConfig ? currentConfig.effectText : '已停机'}</span></div>
                    {!isMax && nextConfig && <div className="flex justify-between mt-1"><span>下一级</span><span className="text-zinc-300 font-bold">{nextConfig.effectText}</span></div>}
                    {!isMax && nextConfig && <div className="flex justify-between mt-1"><span>下一级消耗</span><span className="text-amber-400">{Object.entries(nextConfig.cost).map(([item, qty]) => `${ITEMS_CONFIG[item]?.name || item}×${qty}`).join(' · ')}</span></div>}
                  </div>
                  </div>
                </div>
              );
            })}
        </div>
      </section>
      )}

      {/* 温室 tab */}
      {activeTab === 'greenhouse' && (
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-emerald-400 flex items-center gap-2 border-b border-zinc-800/80 pb-2">
          <Sprout className="w-4 h-4 text-emerald-400" />
          温室控制中心
        </h2>

        {/* 培养槽全功能监视网格 */}
        <div className="mb-4">
          <div className="grid grid-cols-2 gap-3">
            {state.greenhouse.slots.map(slot => {
              const crop = slot.cropId ? CROPS_CONFIG[slot.cropId as keyof typeof CROPS_CONFIG] : null;
              const isReady = slot.growthProgress >= 100;
              const isWatered = slot.isWatered || state.shelter.assignedWatererId !== null;

              return (
                <div
                  key={slot.id}
                  onClick={() => handleSlotClick(slot.id, !!crop)}
                  className={`relative aspect-square rounded-2xl overflow-hidden border cursor-pointer transition-all duration-300 select-none ${
                    isReady
                      ? 'border-emerald-500/60 shadow-[0_0_16px_rgba(16,185,129,0.25)]'
                      : crop
                      ? 'border-zinc-700/60'
                      : 'border-dashed border-zinc-700/50 hover:border-purple-500/40'
                  }`}
                >
                  {/* 飘字特效 */}
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

                  {crop ? (
                    <>
                      {/* 作物图标（ADR-0015 去单图化）：统一 Lucide 占位，补图走 sprite 配置 */}
                      <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-950 flex items-center justify-center pointer-events-none">
                        <Sprout className="w-8 h-8 opacity-20 text-emerald-500" />
                      </div>

                      {/* 顶部渐变蒙层 */}
                      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-zinc-950/80 to-transparent px-2 pt-1.5 pb-3 flex items-center justify-between z-10">
                        <span className="text-[9px] text-zinc-400 font-semibold">槽位 #{slot.id}</span>
                        {isWatered && (
                          <span className="flex items-center gap-0.5 text-blue-400 text-[9px] font-bold animate-pulse">
                            <Droplet className="w-2.5 h-2.5 fill-blue-400" />湿润
                          </span>
                        )}
                      </div>

                      {/* 就绪光晕 */}
                      {isReady && (
                        <div className="absolute inset-0 bg-emerald-400/10 animate-pulse pointer-events-none z-10" />
                      )}

                      {/* 底部控制栏 */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-zinc-950/95 via-zinc-950/70 to-transparent px-2 pt-4 pb-2 z-20">
                        <div className="text-[9px] font-bold text-zinc-200 flex items-center gap-1 mb-1">
                          <Sprout className="w-2.5 h-2.5 text-emerald-400 flex-shrink-0" />
                          <span className="truncate">{crop.name}</span>
                        </div>
                        <div className="w-full bg-zinc-900/80 rounded-full h-1 overflow-hidden mb-1.5">
                          <div
                            className={`h-full rounded-full transition-all duration-1000 ${
                              isReady
                                ? 'bg-emerald-400 shadow-[0_0_4px_#34d399]'
                                : 'bg-purple-500'
                            }`}
                            style={{ width: `${slot.growthProgress}%` }}
                          />
                        </div>
                        {isReady ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleHarvest(slot.id);
                            }}
                            className="w-full py-1 bg-emerald-500 text-zinc-950 font-extrabold rounded-md hover:bg-emerald-400 active:scale-95 transition-all text-[9px] text-center animate-pulse cursor-pointer"
                          >
                            收割
                          </button>
                        ) : (
                          <div className="flex items-center justify-between">
                            <span className="text-zinc-400 flex items-center gap-0.5 font-mono text-[9px]">
                              <Timer className="w-2.5 h-2.5 text-purple-400" />
                              {slot.growthTimeLeft}s
                            </span>
                            {!slot.isWatered && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const success = waterSlot(slot.id);
                                  if (success) {
                                    addLog(`手动为培养槽 #${slot.id + 1} 补充了水分`, 'logistics');
                                  }
                                }}
                                className="px-2 py-0.5 bg-blue-950/90 border border-blue-500/40 text-blue-400 rounded-md hover:bg-blue-900 active:scale-95 transition-all cursor-pointer text-[9px]"
                              >
                                浇水
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-zinc-950/60 flex flex-col items-center justify-center text-zinc-600">
                      <div className="text-[9px] text-zinc-600 font-semibold mb-2">槽位 #{slot.id}</div>
                      <Sprout className="w-7 h-7 mb-1.5 opacity-20" />
                      <span className="text-[10px] font-bold text-zinc-500">闲置中</span>
                      <span className="text-[8px] opacity-50 mt-0.5">点击播种</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 浇水操作员卡片（产线风格） */}
        {(() => {
          const watererId = state.shelter.assignedWatererId;
          const watererHero = watererId ? state.heroes[watererId] : null;
          const watererCfg = watererId ? HEROES_CONFIG[watererId] : null;
          return (
            <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900/95 to-zinc-950 shadow-xl shadow-black/50">
              <div className="h-0.5 w-full bg-emerald-500/30" />
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-950/50 border border-emerald-500/30 flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                        浇水操作员
                        <span className="text-[9px] text-zinc-500">温室</span>
                      </div>
                      <div className="text-[9px] text-zinc-500">
                        {watererHero ? `托管中 · ${watererCfg?.name || ''}` : '未指派'}
                      </div>
                    </div>
                  </div>
                  {watererHero ? (
                    <button
                      onClick={() => {
                        const oldName = getHeroName(watererId!);
                        assignHeroToDuty(watererId!, null);
                        addLog(`取消了 ${oldName} 在温室自动浇水岗的操作员指派`, 'logistics');
                        showToast('已取消温室浇水托管。', 'info');
                      }}
                      className="text-[9px] px-2 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 cursor-pointer"
                    >
                      解除
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowWatererPicker(true)}
                      className="text-[9px] px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 cursor-pointer"
                    >
                      驻守
                    </button>
                  )}
                </div>
                <div className="text-[10px] text-zinc-400 bg-zinc-950/40 p-2 rounded-xl border border-zinc-900/50">
                  {watererHero
                    ? <>当前操作员：<b className="text-zinc-200">{watererCfg?.name}</b> · 指派后自动浇水（生长翻倍），离线也生效</>
                    : '指派英雄后温室插槽自动维持浇水状态（生长速度翻倍），离线也生效'}
                </div>
              </div>
            </div>
          );
        })()}

        {/* 浇水操作员选择弹窗 */}
        <DutyAssignModal
          isOpen={showWatererPicker}
          title="指派浇水操作员"
          heroes={state.heroes}
          onSelect={(id) => {
            if (assignHeroToDuty(id, { type: 'waterer', targetId: 'greenhouse' })) {
              const name = getHeroName(id);
              addLog(`指派 ${name} 负责温室自动浇水`, 'logistics');
              showToast(`指派 ${name} 负责温室浇水！`, 'success');
              setShowWatererPicker(false);
            }
          }}
          onClose={() => setShowWatererPicker(false)}
        />

        {/* 控制按钮与循环播种配置 */}
        <div className="grid grid-cols-2 gap-3">
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
      )}

      {/* 产线 tab */}
      {activeTab === 'facility' && (
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-magic-blue flex items-center gap-2 border-b border-zinc-800/80 pb-2">
          <Cpu className="w-4 h-4 text-magic-blue" />
          工业自动生产流水线 Automated Assemblers
        </h2>

        <div className="space-y-4">
          <SmelterCard />
          <AssemblerCard />
        </div>
      </section>
      )}

      {/* 远征 tab */}
      {activeTab === 'expedition' && (
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-cyan-400 flex items-center gap-2 border-b border-zinc-800/80 pb-2">
          <Compass className="w-4 h-4 text-cyan-400" />
          挂机探索远征
        </h2>

        {exp.locationId && currentExplorer && expLocation ? (
          /* 已派遣状态 */
          <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900/95 to-zinc-950 shadow-xl shadow-black/50">
            <div className="h-0.5 w-full bg-cyan-500/30" />
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-cyan-950/50 border border-cyan-500/30 flex items-center justify-center">
                    <Rocket className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                      {expLocation.name}
                    </div>
                    <div className="text-[9px] text-zinc-500">
                      探索员: <strong className="text-zinc-200 font-bold">{getHeroName(state.shelter.assignedExplorerId || '')}</strong>
                      <span className="ml-1">[{getHeroClassLabel(state.shelter.assignedExplorerId || '')} · {getHeroFactionLabel(state.shelter.assignedExplorerId || '')}]</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const explorerName = getHeroName(state.shelter.assignedExplorerId || '');
                    const locName = expLocation?.name || '未知区域';
                    if (assignHeroToDuty(state.shelter.assignedExplorerId || '', null)) {
                      addLog(`远征探索员 ${explorerName} 已从 ${locName} 安全召回`, 'logistics');
                      showToast('远征探索员已成功安全召回，拾荒所得物资已全部存入避难所储藏箱！', 'success');
                    } else {
                      showToast('召回失败，请稍后重试！', 'error');
                    }
                  }}
                  className="text-[9px] px-2 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 cursor-pointer"
                >
                  <LogOut className="w-3 h-3" /> 召回
                </button>
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
                <span className="font-bold text-zinc-400 block mb-1 flex items-center gap-1"><Search className="w-3 h-3" /> 本地可能获取的废土战利品：</span>
                <div className="flex flex-wrap gap-x-2.5 gap-y-1">
                  {expLocation.lootTable.map(loot => (
                    <span key={loot.itemId} className="text-zinc-400">
                      • {ITEMS_CONFIG[loot.itemId]?.name} (几率:{Math.round(loot.chance * 100)}%)
                    </span>
                  ))}
                </div>
              </div>
            </div>

          </div>
        ) : (
          /* 未派遣状态 - 允许派遣配置 */
          <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900/95 to-zinc-950 shadow-xl shadow-black/50">
            <div className="h-0.5 w-full bg-cyan-500/30" />
            <div className="p-4 space-y-3">
              {/* 标题栏：探索员选择 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-cyan-950/50 border border-cyan-500/30 flex items-center justify-center">
                    <Compass className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-zinc-100">远征派遣</div>
                    <div className="text-[9px] text-zinc-500">
                      {selectedExpExplorerId
                        ? `探索员: ${getHeroName(selectedExpExplorerId)} [${getHeroClassLabel(selectedExpExplorerId)} · ${getHeroFactionLabel(selectedExpExplorerId)}]`
                        : '未指派探索员'}
                    </div>
                  </div>
                </div>
                {selectedExpExplorerId ? (
                  <button
                    onClick={() => setShowExplorerPicker(true)}
                    className="text-[9px] px-2 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 cursor-pointer"
                  >
                    更换
                  </button>
                ) : (
                  <button
                    onClick={() => setShowExplorerPicker(true)}
                    className="text-[9px] px-2 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 cursor-pointer"
                  >
                    派遣
                  </button>
                )}
              </div>

              {/* 地点选择 */}
              <div className="space-y-2">
                <div className="grid grid-cols-1 gap-2.5">
                {Object.entries(EXPEDITION_LOCATIONS).map(([key, loc]) => {
                  const isSelected = selectedLocationId === key;
                  
                  // 门槛校验（ADR-0018：heroClass/faction）
                  const heroCfg = selectedExpExplorerId ? HEROES_CONFIG[selectedExpExplorerId] : null;
                  const classUnmatch = loc.requiredHeroClass && heroCfg && heroCfg.heroClass !== loc.requiredHeroClass;
                  const factionUnmatch = loc.requiredFaction && heroCfg && heroCfg.faction !== loc.requiredFaction;
                  const requirementUnmatch = !!(classUnmatch || factionUnmatch);
                  
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
                        {(loc.requiredHeroClass || loc.requiredFaction) && (
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                            requirementUnmatch
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/20'
                              : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                          }`}>
                            需【{loc.requiredHeroClass ? HERO_CLASS_LABELS[loc.requiredHeroClass] : ''}{loc.requiredFaction ? `/${HERO_FACTION_LABELS[loc.requiredFaction]}` : ''}】
                          </span>
                        )}
                      </div>
                      
                      {/* 地点拾荒详情 */}
                      <div className="mt-1.5 text-[9px] text-zinc-500 space-y-0.5">
                        <div>基础提炼时间: {loc.scavengeInterval} 秒/次</div>
                        <div>可能拾得: {loc.lootTable.map(l => ITEMS_CONFIG[l.itemId]?.name).join(', ')}</div>
                      </div>

                      {/* 警告信息 */}
                      {requirementUnmatch && (
                        <div className="mt-2 text-[9px] text-rose-500 font-semibold flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3 text-rose-500 animate-bounce" />
                          指派探索员职阶/阵营不匹配，无法出发！
                        </div>
                      )}
                    </div>
                  );
                })}
                </div>
              </div>

              {/* 口粮消耗提示 */}
              <div className="bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-900 text-[10px] space-y-1.5">
              <div className="flex justify-between items-center text-zinc-400">
                <span className="flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-zinc-500" />
                  派遣口粮消耗给养：
                </span>
                <span className={getInvQty('ration') >= (EXPEDITION_LOCATIONS[selectedLocationId as keyof typeof EXPEDITION_LOCATIONS]?.rationCost ?? 0) ? 'text-emerald-400 font-bold' : 'text-rose-500 font-bold'}>
                  {(EXPEDITION_LOCATIONS[selectedLocationId as keyof typeof EXPEDITION_LOCATIONS]?.rationCost ?? 0) > 0
                    ? `${getInvQty('ration') >= (EXPEDITION_LOCATIONS[selectedLocationId as keyof typeof EXPEDITION_LOCATIONS]?.rationCost ?? 0) ? '口粮充足' : '口粮不足'} (持有: ${getInvQty('ration')}/${EXPEDITION_LOCATIONS[selectedLocationId as keyof typeof EXPEDITION_LOCATIONS]?.rationCost ?? 0})`
                    : '该地点无需口粮'}
                </span>
              </div>
              <p className="text-[9px] text-zinc-500 leading-normal">
                荒野深处充满核辐射与变异威胁，探索员出发前必须消耗压缩口粮用于补给。如果储藏箱口粮不足，将无法开始派遣。
              </p>
            </div>

            {/* 开始派遣按钮 */}
            {(() => {
              const loc = EXPEDITION_LOCATIONS[selectedLocationId as keyof typeof EXPEDITION_LOCATIONS];
              const heroCfg = selectedExpExplorerId ? HEROES_CONFIG[selectedExpExplorerId] : null;
              const classUnmatch = loc?.requiredHeroClass && heroCfg && heroCfg.heroClass !== loc.requiredHeroClass;
              const factionUnmatch = loc?.requiredFaction && heroCfg && heroCfg.faction !== loc.requiredFaction;
              const requirementUnmatch = !!(classUnmatch || factionUnmatch);
              const rationCost = loc?.rationCost ?? 0;
              const rationShortage = rationCost > 0 && getInvQty('ration') < rationCost;
              const isDisabled = !selectedExpExplorerId || requirementUnmatch || rationShortage;

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
          </div>
        )}
      </section>
      )}

      {/* 远征探索员选择弹窗 */}
      <DutyAssignModal
        isOpen={showExplorerPicker}
        title="指派远征探索员"
        heroes={state.heroes}
        onSelect={(id) => {
          setSelectedExpExplorerId(id);
          setShowExplorerPicker(false);
        }}
        onClose={() => setShowExplorerPicker(false)}
      />

      {/* 播种选择模态框 */}
      {showSeedSelector && typeof document !== 'undefined' && createPortal(
        <div
          onClick={() => {
            setShowSeedSelector(false);
            setSelectedSlotId(null);
          }}
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
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
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5 overflow-y-auto overscroll-contain pr-1 flex-1 pt-1 pb-1">
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
