import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { ITEMS_CONFIG } from '../../data/items';
import { SHELTER_UPGRADES } from '../../data/shelterUpgrades';
import { useToast } from '../ToastSystem';
import GameIcon from '../GameIcon';
import ShelterTabBar from './ShelterTabBar';
import type { ShelterTabId } from './constants';
import { Settings, Cpu } from 'lucide-react';
import { getInvQty } from '../../utils/gameUtils';
import { SmelterCard, AssemblerCard } from './FacilityCard';
import DreamLeakAlertPanel from './DreamLeakAlertPanel';
import GreenhousePanel from './GreenhousePanel';
import ExpeditionPanel from './ExpeditionPanel';

// 基建升级配色：全站统一一套 cyan 主题（ADR-0018 后不再按升级项区分）
const UPGRADE_THEME: { iconBg: string; iconBorder: string; buttonClass: (isMax: boolean, canAfford: boolean) => string } = {
  iconBg: 'bg-cyan-950/50',
  iconBorder: 'border-cyan-500/30',
  buttonClass: (isMax, canAfford) => isMax ? 'bg-zinc-800/30 text-zinc-600 border border-zinc-800/50 cursor-default'
    : canAfford ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 active:scale-95 cursor-pointer'
    : 'bg-zinc-800/50 text-zinc-500 border border-zinc-700/50 cursor-not-allowed'
};

// 后勤页容器：tab 导航 + 基建/产线面板 + 温室/远征面板（拆分为独立组件）
const ShelterTab: React.FC = () => {
  const {
    state,
    upgradeShelterStat,
    addLog
  } = useGame();

  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<ShelterTabId>('base');

  // 1. 避难所基建与挂机控制 (Base Upgrades) 属性计算
  const getUpgradeLevel = (id: string) => {
    if (id === 'battery') return state.shelter.batteryLevel || 1;
    if (id === 'generator') return state.shelter.generatorLevel || 0;
    if (id === 'recycler') return state.shelter.recyclerLevel || 0;
    return 0; // 未知升级类型，默认 0
  };

  // 状态计数：温室可收割数 / 产线队列数 / 远征进行中
  const harvestableCount = state.greenhouse.slots.filter(s => s.cropId && s.growthProgress >= 100).length;
  const facilityQueueCount = Object.values(state.shelter.facilities).flat().reduce((sum, f) => sum + (f.queue?.length ?? 0), 0);
  const expeditionBadge = state.shelter.expedition.locationId ? '进行中' : null;
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
              const canAfford = nextConfig ? Object.entries(nextConfig.cost).every(([item, qty]) => getInvQty(state.inventory, item) >= qty) : false;

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
        <GreenhousePanel />
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
        <ExpeditionPanel />
      )}
    </div>
  );
};

export default ShelterTab;
