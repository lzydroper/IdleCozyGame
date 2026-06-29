import React, { useState, useEffect } from 'react';
import { useGame, AUTO_RECIPES, EXPEDITION_LOCATIONS, CROPS_CONFIG } from '../context/GameContext';
import { ITEMS_CONFIG } from '../data/items';
import { useToast } from './ToastSystem';
import {
  Flame,
  Zap,
  Settings,
  ShieldAlert,
  Wrench,
  Battery,
  RefreshCw,
  Cpu,
  Sprout,
  Compass,
  User,
  Play,
  Square,
  LogOut,
  Clock,
  Droplet,
  Sparkles,
  Info
} from 'lucide-react';

const SURVIVOR_EMOJIS: Record<string, string> = {
  roy: '🔧',
  mei: '🌾',
  zero: '🏃',
  catherine: '🩺',
  buster: '🦾',
  nova: '☄️'
};

const ShelterTab: React.FC = () => {
  const {
    state,
    upgradeShelterStat,
    assignSurvivorJob,
    setFacilityRecipe,
    setFacilityActive,
    startExpedition,
    stopExpedition,
    batchWater,
    batchHarvest,
    batchPlant
  } = useGame();

  const { showToast } = useToast();
  
  // 本地每秒 tick，用于平滑更新远征计时和倒计时
  const [nowTime, setNowTime] = useState(Date.now());
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
  const nextBatteryCost = currentBattery * 10;
  const currentMaxHours = (state.shelter.maxOfflineDuration / 3600).toFixed(1);
  const nextMaxHours = ((14400 + currentBattery * 3600) / 3600).toFixed(1);

  const currentGenerator = state.shelter.generatorLevel || 0;
  const nextGeneratorCost = (currentGenerator + 1) * 15;
  const currentGenRate = (currentGenerator * 0.005 * 60).toFixed(2); // 每分钟
  const nextGenRate = ((currentGenerator + 1) * 0.005 * 60).toFixed(2);

  const currentRecycler = state.shelter.recyclerLevel || 0;
  const nextRecyclerCost = (currentRecycler + 1) * 15;
  const currentRecRate = (currentRecycler * 0.002 * 60).toFixed(2); // 每分钟
  const nextRecRate = ((currentRecycler + 1) * 0.002 * 60).toFixed(2);

  // 2. 幸存者列表
  const survivorsList = Object.values(state.survivors);
  const meiSurvivor = state.survivors.mei;

  // 一键浇水操作
  const handleBatchWater = () => {
    const wateredCount = batchWater();
    if (wateredCount > 0) {
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
    }

    // 2. 再播种
    const cropConfig = CROPS_CONFIG[replantCropId as keyof typeof CROPS_CONFIG];
    if (cropConfig) {
      const seedId = Object.keys(cropConfig.seedCost)[0];
      const availableSeeds = getInvQty(seedId);
      const freeSlotsCount = state.greenhouse.slots.filter(s => s.cropId === null).length;

      if (freeSlotsCount === 0 && !harvestResult) {
        showToast('温室没有可收割的作物，且没有空余槽位！', 'warning');
        return;
      }

      if (availableSeeds <= 0) {
        showToast(`没有可用的 ${ITEMS_CONFIG[seedId]?.name || seedId} 种子进行播种！${harvestMsg ? '仅收割完成。' : ''}`, 'warning');
        return;
      }

      const plantSuccess = batchPlant(replantCropId);
      if (plantSuccess) {
        showToast(`🌱 一键收割并重新播种成功！${harvestMsg}已连播入空余槽位。`, 'success');
      } else {
        showToast(`已完成收割。但重新播种失败，请检查种子数量！`, 'warning');
      }
    }
  };

  // 3. 工厂流水线配方分类
  const smelterRecipes = Object.values(AUTO_RECIPES).filter(r => r.id.startsWith('smelt_'));
  const assemblerRecipes = Object.values(AUTO_RECIPES).filter(r => r.id.startsWith('assemble_'));

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
    if (loc.requiredRole && explorer?.role !== loc.requiredRole) {
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
                  showToast('🔋 蓄电池矩阵升级成功！最大挂机时间延长。', 'success');
                } else {
                  showToast('废旧金属不足，无法升级！', 'error');
                }
              }}
              disabled={getInvQty('scrap_metal') < nextBatteryCost}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all text-[10px] ${
                getInvQty('scrap_metal') >= nextBatteryCost
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 active:scale-95 cursor-pointer'
                  : 'bg-zinc-800/50 text-zinc-500 border border-zinc-700/50 cursor-not-allowed'
              }`}
            >
              升级 🔩{nextBatteryCost}
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
                  showToast('⚡ 魔能发电机升级成功！能量凝结效率提高。', 'success');
                } else {
                  showToast('废旧金属不足，无法升级！', 'error');
                }
              }}
              disabled={getInvQty('scrap_metal') < nextGeneratorCost}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all text-[10px] ${
                getInvQty('scrap_metal') >= nextGeneratorCost
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 active:scale-95 cursor-pointer'
                  : 'bg-zinc-800/50 text-zinc-500 border border-zinc-700/50 cursor-not-allowed'
              }`}
            >
              升级 🔩{nextGeneratorCost}
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
                  showToast('♻️ 物资回收站升级成功！废弃金属回收速率提升。', 'success');
                } else {
                  showToast('废旧金属不足，无法升级！', 'error');
                }
              }}
              disabled={getInvQty('scrap_metal') < nextRecyclerCost}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all text-[10px] ${
                getInvQty('scrap_metal') >= nextRecyclerCost
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 active:scale-95 cursor-pointer'
                  : 'bg-zinc-800/50 text-zinc-500 border border-zinc-700/50 cursor-not-allowed'
              }`}
            >
              升级 🔩{nextRecyclerCost}
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
          <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded-lg border border-zinc-800 text-zinc-400">
            自动浇水托管中
          </span>
        </h2>

        {/* 培养槽小型监视网格 */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {state.greenhouse.slots.map(slot => {
            const cropMeta = slot.cropId ? CROPS_CONFIG[slot.cropId as keyof typeof CROPS_CONFIG] : null;
            const isWatered = slot.isWatered || state.shelter.assignedWatererId !== null;
            return (
              <div
                key={slot.id}
                className={`p-2 rounded-xl border flex flex-col justify-between items-center h-20 relative transition-all ${
                  slot.cropId
                    ? slot.growthProgress >= 100
                      ? 'bg-emerald-950/20 border-emerald-500/30 shadow-[0_0_8px_rgba(57,255,20,0.1)]'
                      : 'bg-zinc-900/60 border-zinc-800'
                    : 'bg-zinc-950 border-zinc-900 border-dashed'
                }`}
              >
                {/* 状态徽章 */}
                <div className="absolute top-1 right-1 flex gap-0.5 scale-75">
                  {isWatered && <Droplet className="w-3.5 h-3.5 text-blue-400 fill-blue-400" />}
                </div>

                <div className="text-[10px] text-zinc-500 font-bold">#{slot.id}</div>

                {slot.cropId && cropMeta ? (
                  <div className="text-center w-full flex-1 flex flex-col justify-center mt-1">
                    <div className="font-bold text-zinc-300 truncate max-w-full text-[9px]">{cropMeta.name}</div>
                    <div className="mt-1">
                      {slot.growthProgress >= 100 ? (
                        <span className="text-[8px] px-1 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded font-bold animate-pulse">
                          可收获
                        </span>
                      ) : (
                        <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden mt-0.5 border border-zinc-800">
                          <div
                            className="bg-emerald-400 h-full"
                            style={{ width: `${slot.growthProgress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-zinc-600 text-[10px] my-auto">空闲</div>
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
                    assignSurvivorJob(state.shelter.assignedWatererId, null);
                    showToast('已取消温室浇水托管。', 'info');
                  }
                } else {
                  assignSurvivorJob(val, 'waterer');
                  const name = state.survivors[val]?.name || '幸存者';
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
                    {SURVIVOR_EMOJIS[s.id] || '👤'} {s.name} ({s.role === 'farmer' ? '农学家' : s.role === 'engineer' ? '工程师' : '侦察兵'})
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 魔导冶炼炉 smelter */}
          {(() => {
            const fac = state.shelter.facilities.smelter;
            if (!fac) return null;
            const level = fac.level || 1;
            const upgradeCost = level * 20;
            const activeRecipe = fac.activeRecipeId ? AUTO_RECIPES[fac.activeRecipeId] : null;
            const operator = fac.assignedSurvivorId ? state.survivors[fac.assignedSurvivorId] : null;
            const speedBonus = 1 + (operator?.role === 'engineer' ? operator.bonus : 0) + (level - 1) * 0.1;
            
            // 原料是否充足
            let hasInputMaterials = true;
            if (activeRecipe) {
              Object.entries(activeRecipe.input).forEach(([itemId, qty]) => {
                if (getInvQty(itemId) < qty) {
                  hasInputMaterials = false;
                }
              });
            }

            return (
              <div className="bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 border border-zinc-800 rounded-3xl p-4 flex flex-col justify-between space-y-3 shadow-lg shadow-black/40 relative">
                {fac.active !== false && fac.timeLeft > 0 && (
                  <div className="absolute top-4 right-4 w-2.5 h-2.5 bg-cyan-400 rounded-full animate-ping shadow-[0_0_8px_#00f0ff]" />
                )}
                
                {/* 标题区 */}
                <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                  <div>
                    <h3 className="font-bold text-zinc-200 text-xs flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-amber-500" />
                      {fac.name} <span className="text-[10px] text-zinc-500 font-mono">Lv.{level}</span>
                    </h3>
                    <div className="text-[10px] text-zinc-500 mt-0.5">生产提炼效率: {Math.round(speedBonus * 100)}%</div>
                  </div>
                  <button
                    onClick={() => {
                      if (upgradeShelterStat('smelter')) {
                        showToast('🏭 魔导冶炼炉超频升级成功！产线效率提升。', 'success');
                      } else {
                        showToast('废旧金属不足，无法升级！', 'error');
                      }
                    }}
                    disabled={getInvQty('scrap_metal') < upgradeCost}
                    className={`px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all ${
                      getInvQty('scrap_metal') >= upgradeCost
                        ? 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-750 active:scale-95 cursor-pointer'
                        : 'bg-zinc-900/50 text-zinc-600 border border-zinc-800 cursor-not-allowed'
                    }`}
                  >
                    升级 🔩{upgradeCost}
                  </button>
                </div>

                {/* 指派冶炼炉幸存者 */}
                <div className="space-y-1">
                  <div className="text-[10px] text-zinc-500 font-bold">指派冶炼操作员:</div>
                  <select
                    value={fac.assignedSurvivorId || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        if (fac.assignedSurvivorId) {
                          assignSurvivorJob(fac.assignedSurvivorId, null);
                          showToast('魔导冶炼炉已处于无人值守状态。', 'info');
                        }
                      } else {
                        assignSurvivorJob(val, 'smelter');
                        const name = state.survivors[val]?.name || '幸存者';
                        showToast(`🔩 指派 ${name} 负责冶炼炉！工程师操作可获专属生产加速。`, 'success');
                      }
                    }}
                    className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 p-1.5 rounded-lg outline-none text-[10px]"
                  >
                    <option value="">-- 无人值守 (无角色加成) --</option>
                    {survivorsList.map(s => {
                      const statusStr = s.assignedJobId 
                        ? s.assignedJobId === 'smelter' 
                          ? ' (当前岗位)' 
                          : ` (忙碌于: ${s.assignedJobId})` 
                        : ' (空闲)';
                      return (
                        <option key={s.id} value={s.id}>
                          {SURVIVOR_EMOJIS[s.id] || '👤'} {s.name} ({s.role === 'farmer' ? '农学' : s.role === 'engineer' ? '工程 ★' : '探索'}) {statusStr}
                        </option>
                      );
                    })}
                  </select>
                  {operator && (
                    <div className="text-[9px] text-zinc-500 flex items-center justify-between">
                      <span>已派驻: <strong className="text-zinc-400 font-bold">{operator.name}</strong></span>
                      {operator.role === 'engineer' ? (
                        <span className="text-amber-500">🔥 工程师加成: +{Math.round(operator.bonus * 100)}%</span>
                      ) : (
                        <span className="text-zinc-500">非工程职业 (无加速加成)</span>
                      )}
                    </div>
                  )}
                </div>

                {/* 选择配方 */}
                <div className="space-y-1">
                  <div className="text-[10px] text-zinc-500 font-bold">自动冶炼配方:</div>
                  <select
                    value={fac.activeRecipeId || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFacilityRecipe('smelter', val === '' ? null : val);
                      showToast(val === '' ? '已清空冶炼炉配方。' : '配方已部署，产线就绪！', 'info');
                    }}
                    className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 p-1.5 rounded-lg outline-none text-[10px]"
                  >
                    <option value="">-- 停产待机中 --</option>
                    {smelterRecipes.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name} (耗时: {Math.max(1, Math.floor(r.duration / speedBonus))}s)
                      </option>
                    ))}
                  </select>
                </div>

                {/* 配方物料消耗展示 */}
                {activeRecipe && (
                  <div className="bg-zinc-950/40 p-2 rounded-xl border border-zinc-900/60 text-[9px] text-zinc-400 space-y-1">
                    <div className="flex justify-between items-start">
                      <span>单次消耗原料:</span>
                      <div className="font-mono text-zinc-500 text-right flex flex-col items-end">
                        {Object.entries(activeRecipe.input).map(([id, qty]) => {
                          const hasQty = getInvQty(id);
                          return (
                            <div key={id} className={hasQty >= qty ? 'text-zinc-400' : 'text-rose-500 font-bold'}>
                              {ITEMS_CONFIG[id]?.name || id} {qty} (持有:{hasQty})
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span>单次熔炼产出:</span>
                      <span className="text-cyan-400 font-bold">
                        {Object.entries(activeRecipe.output).map(([id, qty]) => `${ITEMS_CONFIG[id]?.name || id} x${qty}`)}
                      </span>
                    </div>
                  </div>
                )}

                {/* 状态与进度条 */}
                <div className="pt-2 border-t border-zinc-900/80 space-y-2">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-zinc-500">加工状态:</span>
                    <span>
                      {fac.active === false ? (
                        <strong className="text-zinc-500">产线已关闭</strong>
                      ) : !fac.activeRecipeId ? (
                        <strong className="text-zinc-500">等待配方...</strong>
                      ) : !hasInputMaterials && fac.timeLeft === 0 ? (
                        <strong className="text-rose-500 animate-pulse">材料不足 (停工中)</strong>
                      ) : fac.timeLeft > 0 ? (
                        <strong className="text-cyan-400 font-mono">提炼中... 剩余 {fac.timeLeft}s</strong>
                      ) : (
                        <strong className="text-emerald-400">就绪并自动循环</strong>
                      )}
                    </span>
                  </div>

                  {/* 动画进度条 */}
                  <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-900">
                    <div
                      className={`h-full transition-all duration-1000 ${
                        fac.active === false
                          ? 'bg-zinc-800'
                          : !hasInputMaterials && fac.timeLeft === 0
                          ? 'bg-rose-900/30'
                          : 'bg-gradient-to-r from-cyan-500 to-blue-500 animate-pulse shadow-[0_0_8px_#00f0ff]'
                      }`}
                      style={{ width: `${fac.currentProgress || 0}%` }}
                    />
                  </div>
                </div>

                {/* 产线开关控制 */}
                <button
                  onClick={() => {
                    const nextState = fac.active === false;
                    setFacilityActive('smelter', nextState);
                    showToast(nextState ? '🔥 魔导冶炼炉已开机运转！' : '🛑 魔导冶炼炉已关机待命。', 'info');
                  }}
                  disabled={!fac.activeRecipeId}
                  className={`w-full py-1.5 rounded-xl font-bold flex items-center justify-center gap-1 text-[10px] transition-all cursor-pointer ${
                    !fac.activeRecipeId
                      ? 'bg-zinc-900/40 text-zinc-600 border border-zinc-800 cursor-not-allowed'
                      : fac.active === false
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 active:scale-95'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 active:scale-95'
                  }`}
                >
                  {fac.active === false ? (
                    <>
                      <Play className="w-3 h-3 text-emerald-400" />
                      启动熔炼产线
                    </>
                  ) : (
                    <>
                      <Square className="w-3 h-3 text-rose-400" />
                      关停熔炼产线
                    </>
                  )}
                </button>
              </div>
            );
          })()}

          {/* 微型芯片组装台 assembler */}
          {(() => {
            const fac = state.shelter.facilities.assembler;
            if (!fac) return null;
            const level = fac.level || 1;
            const upgradeCost = level * 20;
            const activeRecipe = fac.activeRecipeId ? AUTO_RECIPES[fac.activeRecipeId] : null;
            const operator = fac.assignedSurvivorId ? state.survivors[fac.assignedSurvivorId] : null;
            const speedBonus = 1 + (operator?.role === 'engineer' ? operator.bonus : 0) + (level - 1) * 0.1;

            // 原料是否充足
            let hasInputMaterials = true;
            if (activeRecipe) {
              Object.entries(activeRecipe.input).forEach(([itemId, qty]) => {
                if (getInvQty(itemId) < qty) {
                  hasInputMaterials = false;
                }
              });
            }

            return (
              <div className="bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 border border-zinc-800 rounded-3xl p-4 flex flex-col justify-between space-y-3 shadow-lg shadow-black/40 relative">
                {fac.active !== false && fac.timeLeft > 0 && (
                  <div className="absolute top-4 right-4 w-2.5 h-2.5 bg-purple-400 rounded-full animate-ping shadow-[0_0_8px_#bd00ff]" />
                )}

                {/* 标题区 */}
                <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                  <div>
                    <h3 className="font-bold text-zinc-200 text-xs flex items-center gap-1.5">
                      <Wrench className="w-4 h-4 text-purple-400" />
                      {fac.name} <span className="text-[10px] text-zinc-500 font-mono">Lv.{level}</span>
                    </h3>
                    <div className="text-[10px] text-zinc-500 mt-0.5">自动装配效率: {Math.round(speedBonus * 100)}%</div>
                  </div>
                  <button
                    onClick={() => {
                      if (upgradeShelterStat('assembler')) {
                        showToast('🏭 微型芯片组装台升级成功！制造效率提高。', 'success');
                      } else {
                        showToast('废旧金属不足，无法升级！', 'error');
                      }
                    }}
                    disabled={getInvQty('scrap_metal') < upgradeCost}
                    className={`px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all ${
                      getInvQty('scrap_metal') >= upgradeCost
                        ? 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-750 active:scale-95 cursor-pointer'
                        : 'bg-zinc-900/50 text-zinc-600 border border-zinc-800 cursor-not-allowed'
                    }`}
                  >
                    升级 🔩{upgradeCost}
                  </button>
                </div>

                {/* 指派组装台幸存者 */}
                <div className="space-y-1">
                  <div className="text-[10px] text-zinc-500 font-bold">指派装配操作员:</div>
                  <select
                    value={fac.assignedSurvivorId || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        if (fac.assignedSurvivorId) {
                          assignSurvivorJob(fac.assignedSurvivorId, null);
                          showToast('芯片组装台已处于无人值守状态。', 'info');
                        }
                      } else {
                        assignSurvivorJob(val, 'assembler');
                        const name = state.survivors[val]?.name || '幸存者';
                        showToast(`🔩 指派 ${name} 负责组装台！派遣工程师可提速。`, 'success');
                      }
                    }}
                    className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 p-1.5 rounded-lg outline-none text-[10px]"
                  >
                    <option value="">-- 无人值守 (无角色加成) --</option>
                    {survivorsList.map(s => {
                      const statusStr = s.assignedJobId 
                        ? s.assignedJobId === 'assembler' 
                          ? ' (当前岗位)' 
                          : ` (忙碌于: ${s.assignedJobId})` 
                        : ' (空闲)';
                      return (
                        <option key={s.id} value={s.id}>
                          {SURVIVOR_EMOJIS[s.id] || '👤'} {s.name} ({s.role === 'farmer' ? '农学' : s.role === 'engineer' ? '工程 ★' : '探索'}) {statusStr}
                        </option>
                      );
                    })}
                  </select>
                  {operator && (
                    <div className="text-[9px] text-zinc-500 flex items-center justify-between">
                      <span>已派驻: <strong className="text-zinc-400 font-bold">{operator.name}</strong></span>
                      {operator.role === 'engineer' ? (
                        <span className="text-purple-400">🔥 工程师加成: +{Math.round(operator.bonus * 100)}%</span>
                      ) : (
                        <span className="text-zinc-500">非工程职业 (无加速加成)</span>
                      )}
                    </div>
                  )}
                </div>

                {/* 选择配方 */}
                <div className="space-y-1">
                  <div className="text-[10px] text-zinc-500 font-bold">芯片组装配方:</div>
                  <select
                    value={fac.activeRecipeId || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFacilityRecipe('assembler', val === '' ? null : val);
                      showToast(val === '' ? '已清空组装台配方。' : '配方已部署，芯片产线就绪！', 'info');
                    }}
                    className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 p-1.5 rounded-lg outline-none text-[10px]"
                  >
                    <option value="">-- 停产待机中 --</option>
                    {assemblerRecipes.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name} (耗时: {Math.max(1, Math.floor(r.duration / speedBonus))}s)
                      </option>
                    ))}
                  </select>
                </div>

                {/* 配方物料消耗展示 */}
                {activeRecipe && (
                  <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-900/60 text-[9px] text-zinc-400 space-y-1">
                    <div className="flex justify-between items-start">
                      <span>单次消耗原料:</span>
                      <div className="font-mono text-zinc-500 text-right flex flex-col items-end">
                        {Object.entries(activeRecipe.input).map(([id, qty]) => {
                          const hasQty = getInvQty(id);
                          return (
                            <div key={id} className={hasQty >= qty ? 'text-zinc-400' : 'text-rose-500 font-bold'}>
                              {ITEMS_CONFIG[id]?.name || id} {qty} (持有:{hasQty})
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span>单次组装产出:</span>
                      <span className="text-purple-400 font-bold">
                        {Object.entries(activeRecipe.output).map(([id, qty]) => `${ITEMS_CONFIG[id]?.name || id} x${qty}`)}
                      </span>
                    </div>
                  </div>
                )}

                {/* 状态与进度条 */}
                <div className="pt-2 border-t border-zinc-900/80 space-y-2">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-zinc-500">加工状态:</span>
                    <span>
                      {fac.active === false ? (
                        <strong className="text-zinc-500">产线已关闭</strong>
                      ) : !fac.activeRecipeId ? (
                        <strong className="text-zinc-500">等待配方...</strong>
                      ) : !hasInputMaterials && fac.timeLeft === 0 ? (
                        <strong className="text-rose-500 animate-pulse">材料不足 (停工中)</strong>
                      ) : fac.timeLeft > 0 ? (
                        <strong className="text-purple-400 font-mono">组装中... 剩余 {fac.timeLeft}s</strong>
                      ) : (
                        <strong className="text-emerald-400">就绪并自动循环</strong>
                      )}
                    </span>
                  </div>

                  {/* 动画进度条 */}
                  <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-900">
                    <div
                      className={`h-full transition-all duration-1000 ${
                        fac.active === false
                          ? 'bg-zinc-800'
                          : !hasInputMaterials && fac.timeLeft === 0
                          ? 'bg-rose-900/30'
                          : 'bg-gradient-to-r from-purple-500 to-magic-purple animate-pulse shadow-[0_0_8px_#bd00ff]'
                      }`}
                      style={{ width: `${fac.currentProgress || 0}%` }}
                    />
                  </div>
                </div>

                {/* 产线开关控制 */}
                <button
                  onClick={() => {
                    const nextState = fac.active === false;
                    setFacilityActive('assembler', nextState);
                    showToast(nextState ? '⚡ 芯片组装流水线已开机！' : '🛑 芯片组装流水线已关机待命。', 'info');
                  }}
                  disabled={!fac.activeRecipeId}
                  className={`w-full py-1.5 rounded-xl font-bold flex items-center justify-center gap-1 text-[10px] transition-all cursor-pointer ${
                    !fac.activeRecipeId
                      ? 'bg-zinc-900/40 text-zinc-600 border border-zinc-800 cursor-not-allowed'
                      : fac.active === false
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 active:scale-95'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 active:scale-95'
                  }`}
                >
                  {fac.active === false ? (
                    <>
                      <Play className="w-3 h-3 text-emerald-400" />
                      启动组装产线
                    </>
                  ) : (
                    <>
                      <Square className="w-3 h-3 text-rose-400" />
                      关停组装产线
                    </>
                  )}
                </button>
              </div>
            );
          })()}
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
                    带队幸存者: {SURVIVOR_EMOJIS[currentExplorer.id] || '👤'} <strong className="text-zinc-200 font-bold">{currentExplorer.name}</strong> 
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
                if (stopExpedition()) {
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
                      {SURVIVOR_EMOJIS[s.id] || '👤'} {s.name} ({s.role === 'scout' ? '侦察兵 ★' : s.role === 'engineer' ? '工程师' : '农学家'}) {statusStr}
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
    </div>
  );
};

export default ShelterTab;
