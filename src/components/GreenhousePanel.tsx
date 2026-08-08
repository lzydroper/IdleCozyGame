import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { CROPS_CONFIG } from '../data/crops';
import { ITEMS_CONFIG } from '../data/items';
import { HEROES_CONFIG } from '../data/heroes';
import { getHeroName } from '../utils/gameUtils';
import { useToast } from './ToastSystem';
import GameIcon from './GameIcon';
import DutyAssignModal from './DutyAssignModal';
import SeedSelectModal from './SeedSelectModal';
import { Sprout, Droplet, Sparkles, Timer, User } from 'lucide-react';

interface FlyingReward {
  id: number;
  text: string;
  slotId: number;
  offsetY: number;
}

// 温室控制中心面板：种植槽卡片网格、浇水操作员（驻守）、批量操作与挂机区域。
// 从 ShelterTab 拆分（结构重构，无行为变化）；自足 useGame/useToast。
const GreenhousePanel: React.FC = () => {
  const {
    state,
    assignHeroToDuty,
    batchWater,
    batchHarvest,
    plantCrop,
    waterSlot,
    harvestSlot,
    setAutoFarmCrop,
    setAutoFarmEnabled,
    addLog
  } = useGame();

  const { showToast } = useToast();

  // 种子选择弹窗（09）：播种与挂机选种共用一个 SeedSelectModal
  const [seedModal, setSeedModal] = useState<{ mode: 'plant'; slotId: number } | { mode: 'autofarm' } | null>(null);
  const [showWatererPicker, setShowWatererPicker] = useState(false);
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

  const handleHarvest = (slotId: number) => {
    const rewards = harvestSlot(slotId);
    if (rewards) {
      triggerFlyingRewards(rewards, slotId);
      const itemsStr = Object.entries(rewards)
        .map(([id, qty]) => `${qty}个${ITEMS_CONFIG[id]?.name || id}`)
        .join(', ');
      addLog(`培养槽 #${slotId} 收割并获得: ${itemsStr}`, 'logistics');
    }
  };

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

  // 批量收割（10）：只收割不播种（原「一键收割并播种」拆分而来）
  const handleBatchHarvest = () => {
    const yields = batchHarvest();
    if (yields && Object.keys(yields).length > 0) {
      const itemsStr = Object.entries(yields)
        .map(([id, qty]) => `${qty}个${ITEMS_CONFIG[id]?.name || id}`)
        .join(', ');
      addLog(`批量收割完成，获得: ${itemsStr}`, 'logistics');
      showToast(`批量收割成功！${itemsStr}`, 'success');
    } else {
      showToast('温室没有可收割的作物！', 'info');
    }
  };

  // 挂机区域（08/10）：开关与选种
  const autoFarm = state.greenhouse.autoFarm;
  const hasWaterer = state.shelter.assignedWatererId !== null;
  const autoFarmActive = autoFarm.enabled && !!autoFarm.cropId;

  const handleToggleAutoFarm = () => {
    if (!autoFarm.enabled) {
      if (!hasWaterer) {
        showToast('需先指派驻守英雄才能开启挂机！', 'warning');
        return;
      }
      if (!autoFarm.cropId) {
        showToast('请先选择挂机作物！', 'warning');
        return;
      }
      if (setAutoFarmEnabled(true)) {
        addLog('温室挂机已开启', 'logistics');
        showToast('温室挂机已开启！', 'success');
      }
    } else {
      setAutoFarmEnabled(false);
      addLog('温室挂机已关闭', 'logistics');
      showToast('温室挂机已关闭。', 'info');
    }
  };

  const handleAutoFarmCropSelect = (cropId: string) => {
    setAutoFarmCrop(cropId);
    setSeedModal(null);
    showToast(`挂机作物已设为 ${CROPS_CONFIG[cropId]?.name || cropId}`, 'success');
  };

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-bold text-emerald-400 flex items-center gap-2 border-b border-zinc-800/80 pb-2">
        <Sprout className="w-4 h-4 text-emerald-400" />
        温室控制中心
      </h2>

      {/* 培养槽小卡片网格（原型风格，10） */}
      <div className="mb-4">
        <div className="grid grid-cols-2 gap-3">
          {state.greenhouse.slots.map(slot => {
            const crop = slot.cropId ? CROPS_CONFIG[slot.cropId as keyof typeof CROPS_CONFIG] : null;
            const isReady = slot.growthProgress >= 100;
            const isWatered = slot.isWatered || state.shelter.assignedWatererId !== null;
            const mainYieldId = crop ? Object.keys(crop.yields)[0] : null;
            const plantingDisabled = autoFarmActive; // 挂机开启时禁用播种（08）

            return (
              <div
                key={slot.id}
                onClick={() => {
                  if (plantingDisabled || crop) return;
                  setSeedModal({ mode: 'plant', slotId: slot.id });
                }}
                className={`relative rounded-2xl overflow-hidden border transition-all duration-300 select-none ${
                  isReady
                    ? 'border-emerald-500/60 shadow-[0_0_16px_rgba(16,185,129,0.25)]'
                    : crop
                    ? 'border-zinc-800 bg-zinc-900/60'
                    : 'border-dashed border-zinc-700/50 bg-zinc-950/40 hover:border-purple-500/40 cursor-pointer'
                }`}
              >
                {/* 顶部 glow 线（原型 card 风格） */}
                <div className={`h-0.5 w-full ${isReady ? 'bg-emerald-400' : crop ? 'bg-purple-500/40' : 'bg-zinc-800'}`} />

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
                    <div className="p-3 flex items-center gap-2.5">
                      {/* 产出物品 icon（作物图标退役，10）：取主产物 */}
                      <div className="w-9 h-9 rounded-lg bg-zinc-950/60 border border-zinc-800 flex items-center justify-center shrink-0">
                        {mainYieldId ? (
                          <GameIcon id={mainYieldId} type="item" className="w-7 h-7 rounded" />
                        ) : (
                          <Sprout className="w-5 h-5 text-emerald-500/40" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[9px] text-zinc-500 font-semibold">槽位 #{slot.id}</div>
                        <div className="text-[11px] font-bold text-zinc-100 truncate">{crop.name}</div>
                        <div className="text-[8px] text-zinc-500 font-mono">
                          {isReady ? '已成熟' : `${slot.growthTimeLeft}s`}
                        </div>
                      </div>
                      {/* 湿润蓝水滴 / 停滞「缺水」橙警示（10） */}
                      {isWatered ? (
                        <span className="flex items-center gap-0.5 text-blue-400 text-[9px] font-bold shrink-0">
                          <Droplet className="w-3 h-3 fill-blue-400" />湿润
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5 text-orange-400 text-[9px] font-bold shrink-0 animate-pulse">
                          <Droplet className="w-3 h-3 fill-orange-400" />缺水
                        </span>
                      )}
                    </div>

                    <div className="px-3 pb-2.5">
                      <div className="w-full bg-zinc-900/80 rounded-full h-1 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ${
                            isReady ? 'bg-emerald-400 shadow-[0_0_4px_#34d399]' : 'bg-purple-500'
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
                          className="mt-2 w-full py-1 bg-emerald-500 text-zinc-950 font-extrabold rounded-md hover:bg-emerald-400 active:scale-95 transition-all text-[9px] text-center animate-pulse cursor-pointer"
                        >
                          收割
                        </button>
                      ) : !isWatered ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const success = waterSlot(slot.id);
                            if (success) {
                              addLog(`手动为培养槽 #${slot.id} 补充了水分`, 'logistics');
                            }
                          }}
                          className="mt-2 w-full py-1 bg-blue-500/10 text-blue-400 border border-blue-500/30 font-bold rounded-md hover:bg-blue-500/20 active:scale-95 transition-all text-[9px] text-center cursor-pointer"
                        >
                          浇水
                        </button>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <div className="p-3 flex flex-col items-center justify-center gap-1 py-6 text-zinc-600">
                    <div className="text-[9px] text-zinc-600 font-semibold">槽位 #{slot.id}</div>
                    <Sprout className="w-6 h-6 opacity-20" />
                    <span className="text-[9px] font-bold text-zinc-500">
                      {plantingDisabled ? '挂机托管中' : '闲置中'}
                    </span>
                    <span className="text-[8px] opacity-50">
                      {plantingDisabled ? '由挂机自动播种' : '点击播种'}
                    </span>
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
                  ? <div className="flex flex-wrap items-center gap-x-2 gap-y-1">当前操作员：<b className="text-zinc-200">{watererCfg?.name}</b> · 自动浇水 / 自动收割并播种，离线也生效</div>
                  : '指派英雄后自动浇水、自动收割并播种，并提供特殊加成，离线也生效'}
              </div>
              {/* dutyMeta 特殊加成徽章（10） */}
              {watererCfg?.dutyMeta && (
                <div className="flex flex-wrap gap-1.5">
                  {watererCfg.dutyMeta.facilitySpeedMultiplier ? (
                    <span className="text-[9px] text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded">
                      生长速度 +{Math.round(watererCfg.dutyMeta.facilitySpeedMultiplier * 100)}%
                    </span>
                  ) : null}
                  {watererCfg.dutyMeta.facilityYieldMultiplier ? (
                    <span className="text-[9px] text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded">
                      收割产量 +{Math.round(watererCfg.dutyMeta.facilityYieldMultiplier * 100)}%
                    </span>
                  ) : null}
                  {watererCfg.dutyMeta.facilityCostReduction ? (
                    <span className="text-[9px] text-zinc-400 bg-zinc-800/60 px-1.5 py-0.5 rounded">
                      产线原料 -{Math.round(watererCfg.dutyMeta.facilityCostReduction * 100)}%（设施）
                    </span>
                  ) : null}
                </div>
              )}
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

      {/* 控制按钮与挂机区域（10）：左侧垂直「批量浇水/批量收割」+ 右侧挂机 */}
      <div className="flex gap-3">
        <div className="flex flex-col gap-1.5 flex-1">
          <button
            onClick={handleBatchWater}
            className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-sm"
          >
            <Droplet className="w-3.5 h-3.5 text-blue-400" />
            批量浇水
          </button>
          <button
            onClick={handleBatchHarvest}
            className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            批量收割
          </button>
        </div>

        {/* 挂机区域（08/10）：启用/关闭 + 选种 + 状态 */}
        <div className="flex-1 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-200 flex items-center gap-1">
              <Timer className="w-3 h-3 text-purple-400" />温室挂机
            </span>
            <button
              onClick={handleToggleAutoFarm}
              disabled={!hasWaterer && !autoFarm.enabled}
              className={`text-[9px] px-2.5 py-1 rounded-lg font-bold transition-all ${
                autoFarm.enabled
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 cursor-pointer'
                  : hasWaterer
                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30 hover:bg-purple-500/20 cursor-pointer'
                  : 'bg-zinc-800/50 text-zinc-500 border border-zinc-700/50 cursor-not-allowed'
              }`}
            >
              {autoFarm.enabled ? '关闭' : '启用'}
            </button>
          </div>
          <button
            onClick={() => setSeedModal({ mode: 'autofarm' })}
            className="text-[9px] px-2 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 hover:border-purple-500/50 flex items-center justify-between cursor-pointer"
          >
            <span className="flex items-center gap-1">
              <Sprout className="w-3 h-3 text-purple-400" />
              挂机作物
            </span>
            <span className="text-purple-300 font-bold">
              {autoFarm.cropId ? (CROPS_CONFIG[autoFarm.cropId]?.name || autoFarm.cropId) : '未选择'}
            </span>
          </button>
          <div className="text-[8px] text-zinc-500 leading-relaxed">
            {!hasWaterer
              ? '需先指派驻守英雄才能开启挂机'
              : autoFarmActive
              ? '挂机中：自动收割、浇水并播种所选作物，种子耗光自动停止'
              : autoFarm.cropId
              ? '已选种，启用后自动循环种植直到种子耗光'
              : '选择一种作物作为挂机品种'}
          </div>
        </div>
      </div>

      {/* 种子选择弹窗（09）：播种与挂机选种共用一个 SeedSelectModal */}
      <SeedSelectModal
        isOpen={seedModal !== null}
        title={seedModal?.mode === 'autofarm' ? '选择挂机作物' : '选择种植作物'}
        inventory={state.inventory}
        selectedCropId={seedModal?.mode === 'autofarm' ? autoFarm.cropId : undefined}
        onSelect={(cropId) => {
          if (seedModal?.mode === 'plant') {
            const ok = plantCrop(seedModal.slotId, cropId);
            if (ok) {
              const cropName = CROPS_CONFIG[cropId as keyof typeof CROPS_CONFIG]?.name || cropId;
              addLog(`培养槽 #${seedModal.slotId} 播种了 ${cropName}`, 'logistics');
              showToast('作物已播种入培养槽！', 'success');
            } else {
              showToast('种子不足或槽位非空！', 'error');
            }
            setSeedModal(null);
          } else {
            handleAutoFarmCropSelect(cropId);
          }
        }}
        onClose={() => setSeedModal(null)}
      />
    </section>
  );
};

export default GreenhousePanel;
